/**
 * Archive Documents to Arweave
 *
 * Uploads all pending documents (arweave_tx_id IS NULL) to Arweave permaweb
 *
 * Usage:
 *   ts-node scripts/archive-documents.ts
 *
 * Requirements:
 *   - ARWEAVE_WALLET_PATH or ARWEAVE_WALLET_KEY in environment
 *   - Database running and accessible
 *   - Document files exist at storage_path locations
 */

import { Pool } from 'pg';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { ArweaveService, loadWalletFromEnv } from '../../../backend/src/services/arweaveService';
import { DocumentService } from '../../../backend/src/services/DocumentService';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../backend/.env') });

/**
 * Document from database
 */
interface DocumentRow {
  id: string;
  case_id: string;
  filename: string;
  file_type: string;
  storage_path: string;
  arweave_tx_id: string | null;
  created_at: Date;
}

/**
 * Case metadata from database
 */
interface CaseRow {
  id: string;
  case_number: string;
  title: string;
  plaintiff_name: string | null;
  defendant_name: string;
  jurisdiction: string;
  status: string;
}

/**
 * Main archival function
 */
async function archiveDocuments(): Promise<void> {
  console.log('🚀 Starting Arweave document archival process...\n');

  // Initialize database connection
  const pool = new Pool({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    database: process.env.DATABASE_NAME || 'misjustice_dev',
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
  });

  try {
    // Test database connection
    await pool.query('SELECT 1');
    console.log('✅ Database connection established\n');

    // Load Arweave wallet
    console.log('🔑 Loading Arweave wallet...');
    const wallet = await loadWalletFromEnv();

    if (!wallet) {
      console.error('❌ No Arweave wallet configured');
      console.error('   Set ARWEAVE_WALLET_PATH or ARWEAVE_WALLET_KEY environment variable');
      process.exit(1);
    }

    // Initialize Arweave service
    const arweaveService = new ArweaveService(wallet);
    const walletAddress = await arweaveService.getWalletAddress();
    console.log(`✅ Wallet loaded: ${walletAddress}\n`);

    // Get wallet balance
    const balanceWinston = await arweaveService.getWalletBalance();
    if (balanceWinston) {
      const balanceAR = arweaveService.winstonToAr(balanceWinston);
      console.log(`💰 Wallet balance: ${balanceAR} AR\n`);
    }

    // Get pending documents
    console.log('📄 Fetching documents pending archival...');
    const documentsResult = await pool.query<DocumentRow>(`
      SELECT id, case_id, filename, file_type, storage_path, arweave_tx_id, created_at
      FROM documents
      WHERE arweave_tx_id IS NULL
      ORDER BY created_at ASC
    `);

    const documents = documentsResult.rows;
    console.log(`   Found ${documents.length} documents to archive\n`);

    if (documents.length === 0) {
      console.log('✨ All documents already archived!');
      await pool.end();
      return;
    }

    // Initialize document service
    const documentService = new DocumentService(pool, arweaveService);

    // Group documents by case
    const documentsByCase = new Map<string, DocumentRow[]>();
    for (const doc of documents) {
      if (!documentsByCase.has(doc.case_id)) {
        documentsByCase.set(doc.case_id, []);
      }
      documentsByCase.get(doc.case_id)!.push(doc);
    }

    console.log(`📦 Documents grouped into ${documentsByCase.size} cases\n`);

    // Archive each case's documents
    let totalArchived = 0;
    let totalFailed = 0;

    for (const [caseId, caseDocs] of documentsByCase.entries()) {
      // Get case metadata
      const caseResult = await pool.query<CaseRow>(`
        SELECT id, case_number, title, plaintiff_name, defendant_name, jurisdiction, status
        FROM cases
        WHERE id = $1
      `, [caseId]);

      if (caseResult.rows.length === 0) {
        console.error(`❌ Case ${caseId} not found - skipping ${caseDocs.length} documents`);
        totalFailed += caseDocs.length;
        continue;
      }

      const caseData = caseResult.rows[0];
      console.log(`\n📁 Case: ${caseData.case_number} - ${caseData.title}`);
      console.log(`   Archiving ${caseDocs.length} documents...`);

      // Archive each document
      for (const doc of caseDocs) {
        const docPath = path.resolve(__dirname, '../..', doc.storage_path);
        console.log(`\n   📄 ${doc.filename}`);
        console.log(`      Path: ${docPath}`);

        try {
          const result = await documentService.archiveDocument(doc.id, {
            caseId: caseData.id,
            caseNumber: caseData.case_number,
            plaintiff: caseData.plaintiff_name || 'Anonymous',
            defendant: caseData.defendant_name,
            jurisdiction: caseData.jurisdiction,
            stage: caseData.status === 'open' ? 'intake' : 'final',
            timestamp: new Date().toISOString(),
          });

          if (result.success) {
            console.log(`      ✅ Archived to Arweave: ${result.arweaveTxId}`);
            console.log(`      🔗 View: https://arweave.net/${result.arweaveTxId}`);
            totalArchived++;
          } else {
            console.error(`      ❌ Failed: ${result.error}`);
            totalFailed++;
          }

        } catch (error) {
          console.error(`      ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          totalFailed++;
        }
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Archival Summary');
    console.log('='.repeat(60));
    console.log(`Total documents:  ${documents.length}`);
    console.log(`✅ Archived:      ${totalArchived}`);
    console.log(`❌ Failed:        ${totalFailed}`);
    console.log('='.repeat(60));

    if (totalArchived > 0) {
      console.log('\n🎉 Documents successfully archived to Arweave!');
      console.log('   All data is now permanently preserved on the permaweb.');
    }

  } catch (error) {
    console.error('\n❌ Archival process failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('\n✨ Database connection closed');
  }
}

// Run archival
archiveDocuments().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
