/**
 * Archive Cases to Arweave
 *
 * Uploads all case documents to the Arweave permaweb for permanent, immutable storage.
 * Creates bundles per case with all documents and metadata.
 *
 * @module scripts/archiveCasesToArweave
 * @version 1.0.0
 */

import fs from 'fs/promises';
import crypto from 'crypto';
import { pool } from '../config/database';
import {
  ArweaveService,
  loadWalletFromEnv,
  ArchiveDocument,
  CaseBundleMetadata,
  IndividualUploadResult,
} from '../services/arweaveService';
import { loadBitwardenSecrets } from '../services/BitwardenSecretsService';

/**
 * Calculate MD5 hash of a buffer
 */
function calculateMd5(data: Buffer): string {
  return crypto.createHash('md5').update(data).digest('hex');
}

// ============================================================================
// Type Definitions
// ============================================================================

interface DatabaseCase {
  id: string;
  case_number: string;
  plaintiff: string;
  plaintiff_anon: string | null;
  defendant: string;
  jurisdiction: string;
  status: string;
  filed_date: string | null;
}

interface DatabaseDocument {
  id: string;
  case_id: string;
  document_type: string;
  document_name: string;
  file_path: string;
  arweave_tx_id: string | null;
}

interface ArchiveStats {
  casesProcessed: number;
  documentsArchived: number;
  totalBytes: number;
  transactions: Array<{
    caseNumber: string;
    txId: string;
    documentCount: number;
    byteSize: number;
  }>;
}

// ============================================================================
// Main Archive Function
// ============================================================================

async function archiveCasesToArweave(): Promise<void> {
  console.log('🚀 Starting Arweave archiving process...\n');

  const stats: ArchiveStats = {
    casesProcessed: 0,
    documentsArchived: 0,
    totalBytes: 0,
    transactions: [],
  };

  try {
    // Load Bitwarden secrets if configured
    const bwAccessToken = process.env.BW_ACCESS_TOKEN;
    const bwProjectId = process.env.BW_PROJECT_ID;
    if (bwAccessToken && bwProjectId) {
      console.log('🔐 Loading secrets from Bitwarden...');
      await loadBitwardenSecrets(bwAccessToken, bwProjectId);
    }

    // Load Arweave wallet
    console.log('📁 Loading Arweave wallet...');
    const wallet = await loadWalletFromEnv();
    if (!wallet) {
      throw new Error(
        'Arweave wallet not configured. Set ARWEAVE_KEYFILE (Bitwarden), ARWEAVE_WALLET_KEY, or ARWEAVE_WALLET_PATH'
      );
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

    // Get all cases from database
    console.log('📋 Fetching cases from database...');
    const casesResult = await pool.query<DatabaseCase>(`
      SELECT id, case_number, plaintiff, plaintiff_anon, defendant,
             jurisdiction, status, filed_date
      FROM legal_cases
      ORDER BY case_number
    `);

    const cases = casesResult.rows;
    console.log(`Found ${cases.length} cases to archive\n`);

    // Process each case
    for (const legalCase of cases) {
      console.log(`\n📦 Processing case: ${legalCase.case_number}`);
      console.log(`   Plaintiff: ${legalCase.plaintiff}`);
      console.log(`   Defendant: ${legalCase.defendant}`);

      // Get documents for this case
      const documentsResult = await pool.query<DatabaseDocument>(`
        SELECT id, case_id, document_type, document_name, file_path, arweave_tx_id
        FROM case_documents
        WHERE case_id = $1
        ORDER BY document_name
      `, [legalCase.id]);

      const documents = documentsResult.rows;
      console.log(`   Documents: ${documents.length}`);

      if (documents.length === 0) {
        console.log('   ⚠️  No documents found, skipping...');
        continue;
      }

      // Filter to only pending documents (not yet archived)
      const pendingDocuments = documents.filter(doc => doc.arweave_tx_id === null);
      const archivedCount = documents.length - pendingDocuments.length;

      if (pendingDocuments.length === 0) {
        console.log(`   ✅ All ${documents.length} documents already archived, skipping...`);
        continue;
      }

      console.log(`   📋 ${pendingDocuments.length} pending, ${archivedCount} already archived`);

      // Use pending documents for archival
      const documentsToArchive = pendingDocuments;

      // Load document contents
      interface ArchiveDocumentWithId extends ArchiveDocument {
        databaseId: string; // Add database ID for reliable matching
        fileSize: number;   // File size in bytes
        md5Hash: string;    // MD5 hash for integrity verification
      }

      const archiveDocuments: ArchiveDocumentWithId[] = [];
      const failedDocuments: Array<{ name: string; id: string; reason: string }> = [];

      for (const doc of documentsToArchive) {
        try {
          // Use the file_path directly (it's already an absolute path)
          const content = await fs.readFile(doc.file_path);
          const md5Hash = calculateMd5(content);

          archiveDocuments.push({
            name: doc.document_name,
            type: doc.document_type,
            content: content,
            databaseId: doc.id, // Include database ID for reliable matching
            fileSize: content.length,
            md5Hash: md5Hash,
          });

          console.log(`   ✓ Loaded: ${doc.document_name} (${content.length} bytes, MD5: ${md5Hash})`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`   ✗ Failed to load ${doc.document_name}:`, errorMessage);

          // Track failure for reporting
          failedDocuments.push({
            name: doc.document_name,
            id: doc.id,
            reason: errorMessage,
          });
        }
      }

      if (archiveDocuments.length === 0) {
        console.log('   ⚠️  No documents could be loaded, skipping...');
        continue;
      }

      // Report failed document loads
      if (failedDocuments.length > 0) {
        console.log(`\n   ⚠️  Failed to load ${failedDocuments.length} document(s):`);
        for (const failed of failedDocuments) {
          console.log(`      • ${failed.name} (${failed.id}): ${failed.reason}`);
        }
        console.log('');
      }

      // Create metadata bundle
      const metadata: CaseBundleMetadata = {
        caseId: legalCase.id,
        caseNumber: legalCase.case_number,
        plaintiff: legalCase.plaintiff_anon || legalCase.plaintiff,
        defendant: legalCase.defendant,
        jurisdiction: legalCase.jurisdiction,
        stage: mapStatusToStage(legalCase.status),
        timestamp: new Date().toISOString(),
        documentCount: archiveDocuments.length,
      };

      // Upload to Arweave (individual uploads for WeaveDB/ArNS compatibility)
      console.log('   📤 Uploading documents individually to Arweave...');
      let uploadResults: IndividualUploadResult[];

      try {
        uploadResults = await arweaveService.uploadDocumentsIndividually(archiveDocuments, metadata);
        console.log(`   ✅ Upload successful! ${uploadResults.length} documents uploaded`);

        // Create a mapping from database ID to upload result (prevents name collision bugs)
        const uploadResultsByDbId = new Map(
          uploadResults
            .filter(result => result.databaseId) // Only include results with database ID
            .map(result => [result.databaseId!, result])
        );

        // Create a mapping from database ID to archive document (for file_size and md5_hash)
        const archiveDocsByDbId = new Map(
          archiveDocuments.map(doc => [doc.databaseId, doc])
        );

        // Update database with individual Arweave data item IDs using transaction
        const client = await pool.connect();

        try {
          await client.query('BEGIN');

          let updatedCount = 0;

          for (const dbDoc of documents) {
            const uploadResult = uploadResultsByDbId.get(dbDoc.id);
            const archiveDoc = archiveDocsByDbId.get(dbDoc.id);

            if (!uploadResult || !archiveDoc) {
              // Document wasn't uploaded (file load failed), skip database update
              continue;
            }

            await client.query(`
              UPDATE case_documents
              SET arweave_tx_id = $1,
                  document_hash = $2,
                  file_size = $3,
                  md5_hash = $4
              WHERE id = $5
            `, [uploadResult.dataItemId, uploadResult.documentHash, archiveDoc.fileSize, archiveDoc.md5Hash, dbDoc.id]);

            updatedCount++;
            console.log(`      • ${uploadResult.documentName} → ${uploadResult.dataItemId} (${archiveDoc.fileSize} bytes, MD5: ${archiveDoc.md5Hash})`);
          }

          await client.query('COMMIT');
          console.log(`   ✅ Database updated with ${updatedCount} individual data item IDs (including file_size and md5_hash)`);

        } catch (error) {
          await client.query('ROLLBACK');
          console.error('   ❌ Database update failed, rolled back:', error);
          throw error; // Re-throw to trigger outer catch
        } finally {
          client.release();
        }

        // Update stats
        stats.casesProcessed++;
        stats.documentsArchived += uploadResults.length;
        const totalBytes = uploadResults.reduce((sum, r) => sum + r.byteSize, 0);
        stats.totalBytes += totalBytes;

        // Log all data item IDs for this case
        stats.transactions.push({
          caseNumber: legalCase.case_number,
          txId: uploadResults.map(r => r.dataItemId).join(', '),
          documentCount: uploadResults.length,
          byteSize: totalBytes,
        });

      } catch (error) {
        console.error(`   ❌ Upload failed:`, error);
        console.error(`   Case ${legalCase.case_number} not archived`);
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 ARCHIVING SUMMARY');
    console.log('='.repeat(70));
    console.log(`Cases processed:     ${stats.casesProcessed}`);
    console.log(`Documents archived:  ${stats.documentsArchived}`);
    console.log(`Total data size:     ${formatBytes(stats.totalBytes)}`);
    console.log('');

    if (stats.transactions.length > 0) {
      console.log('Transactions:');
      for (const tx of stats.transactions) {
        console.log(`  ${tx.caseNumber}:`);
        console.log(`    TX: ${tx.txId}`);
        console.log(`    Documents: ${tx.documentCount}`);
        console.log(`    Size: ${formatBytes(tx.byteSize)}`);
        console.log(`    View: https://arweave.net/${tx.txId}`);
        console.log('');
      }
    }

    console.log('✅ Archiving complete!');

  } catch (error) {
    console.error('\n❌ Archiving failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map database status to Arweave stage
 */
function mapStatusToStage(
  status: string
): 'intake' | 'research' | 'pleadings' | 'discovery' | 'trial' | 'final' {
  const stageMap: Record<string, 'intake' | 'research' | 'pleadings' | 'discovery' | 'trial' | 'final'> = {
    intake: 'intake',
    research: 'research',
    pleadings: 'pleadings',
    discovery: 'discovery',
    motions: 'pleadings',
    trial: 'trial',
    appeal: 'trial',
    settled: 'final',
    closed: 'final',
  };

  return stageMap[status] || 'intake';
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// ============================================================================
// Execute
// ============================================================================

if (require.main === module) {
  archiveCasesToArweave()
    .then(() => {
      console.log('\n✨ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

export { archiveCasesToArweave };
