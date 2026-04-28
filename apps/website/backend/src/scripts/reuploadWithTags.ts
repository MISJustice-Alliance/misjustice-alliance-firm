/**
 * Re-upload Documents with Proper Tags
 *
 * Re-uploads documents that are missing Document-Name tags (e.g., uploaded via ArDrive)
 * using Turbo to ensure proper metadata tags are set.
 *
 * Usage:
 *   npx ts-node src/scripts/reuploadWithTags.ts
 *   npx ts-node src/scripts/reuploadWithTags.ts --dry-run
 *   npx ts-node src/scripts/reuploadWithTags.ts --case=CR-2025-002
 */

import 'dotenv/config';
import fs from 'fs/promises';
import { Pool } from 'pg';
import {
  ArweaveService,
  loadWalletFromEnv,
  CaseBundleMetadata,
} from '../services/arweaveService';
import { loadBitwardenSecrets } from '../services/BitwardenSecretsService';
import { ArnsService } from '../services/ArnsService';
import { DocumentRepository } from '../repositories/DocumentRepository';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const caseFilter = args.find(a => a.startsWith('--case='))?.split('=')[1];

interface DocumentRecord {
  id: string;
  document_name: string;
  document_type: string;
  evidence_category: string | null;
  file_path: string;
  arweave_tx_id: string;
  arns_undername: string | null;
  case_id: string;
  case_number: string;
  plaintiff: string;
  defendant: string;
  jurisdiction: string;
}

/**
 * Check if TX has Document-Name tag
 */
async function hasDocumentNameTag(txId: string): Promise<boolean> {
  try {
    const response = await fetch('https://arweave.net/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query { transaction(id: "${txId}") { tags { name } } }`
      }),
    });

    const data = await response.json() as {
      data?: { transaction?: { tags?: Array<{ name: string }> } }
    };

    const tags = data?.data?.transaction?.tags || [];
    return tags.some(t => t.name === 'Document-Name');
  } catch {
    return false;
  }
}

/**
 * Resolve container path to host path
 */
function resolveFilePath(filePath: string): string {
  // Convert container path to host path
  if (filePath.startsWith('/app/')) {
    return filePath.replace('/app/', '/home/elvis/projects/legal-advocacy-web/');
  }
  return filePath;
}

async function main() {
  console.log('======================================================================');
  console.log('Re-upload Documents with Proper Tags');
  console.log('======================================================================');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  const dbConfig = {
    user: process.env.DATABASE_USER || 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    database: process.env.DATABASE_NAME || 'misjustice_dev',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  };

  const bwAccessToken = process.env.BW_ACCESS_TOKEN;
  const bwProjectId = process.env.BW_PROJECT_ID;

  if (bwAccessToken && bwProjectId) {
    console.log('🔐 Loading secrets from Bitwarden...');
    await loadBitwardenSecrets(bwAccessToken, bwProjectId);
    console.log('✅ Bitwarden secrets loaded\n');
  }

  console.log('📁 Loading Arweave wallet...');
  const wallet = await loadWalletFromEnv();
  if (!wallet) {
    throw new Error('Arweave wallet not configured');
  }

  const arweaveService = new ArweaveService(wallet);
  const walletAddress = await arweaveService.getWalletAddress();
  console.log(`✅ Wallet loaded: ${walletAddress}\n`);

  const pool = new Pool(dbConfig);
  const documentRepository = new DocumentRepository(pool);
  const arnsService = new ArnsService(documentRepository);

  try {
    // Query documents with TX IDs
    let query = `
      SELECT cd.id, cd.document_name, cd.document_type, cd.evidence_category,
             cd.file_path, cd.arweave_tx_id, cd.arns_undername, cd.case_id,
             lc.case_number, lc.plaintiff, lc.defendant, lc.jurisdiction
      FROM case_documents cd
      JOIN legal_cases lc ON cd.case_id = lc.id
      WHERE cd.arweave_tx_id IS NOT NULL
        AND cd.file_path IS NOT NULL
    `;

    if (caseFilter) {
      query += ` AND lc.case_number = '${caseFilter}'`;
    }

    query += ` ORDER BY lc.case_number, cd.document_name`;

    const result = await pool.query(query);
    const documents: DocumentRecord[] = result.rows;

    console.log(`📋 Checking ${documents.length} documents for missing tags`);
    if (caseFilter) {
      console.log(`   Filter: case_number = '${caseFilter}'`);
    }
    console.log('\n' + '─'.repeat(70));

    // Find documents missing Document-Name tag
    const needsReupload: DocumentRecord[] = [];
    let checked = 0;

    for (const doc of documents) {
      checked++;
      process.stdout.write(`\r  Checking ${checked}/${documents.length}...`);

      const hasTag = await hasDocumentNameTag(doc.arweave_tx_id);
      if (!hasTag) {
        needsReupload.push(doc);
      }

      await new Promise(r => setTimeout(r, 50));
    }

    console.log('\r' + ' '.repeat(50) + '\r');
    console.log('─'.repeat(70));

    console.log('\n📊 ANALYSIS');
    console.log('─'.repeat(70));
    console.log(`Total documents:    ${documents.length}`);
    console.log(`Need re-upload:     ${needsReupload.length}`);
    console.log('─'.repeat(70));

    if (needsReupload.length === 0) {
      console.log('\n✅ All documents have proper tags!\n');
      return;
    }

    console.log('\n📤 Documents to re-upload:\n');
    for (const doc of needsReupload) {
      console.log(`  • ${doc.case_number} | ${doc.document_name}`);
    }

    if (dryRun) {
      console.log('\n📋 DRY RUN - Would re-upload ' + needsReupload.length + ' documents');
      console.log('\nRun without --dry-run to apply.\n');
      return;
    }

    // Re-upload documents
    console.log('\n' + '='.repeat(70));
    console.log('📤 RE-UPLOADING DOCUMENTS');
    console.log('='.repeat(70));

    let uploaded = 0;
    let failed = 0;

    for (const doc of needsReupload) {
      console.log(`\n📄 ${doc.document_name}`);
      console.log(`   Case: ${doc.case_number}`);

      // Resolve file path
      const filePath = resolveFilePath(doc.file_path);
      console.log(`   Path: ${filePath}`);

      // Check file exists
      try {
        await fs.access(filePath);
      } catch {
        console.log(`   ❌ File not found`);
        failed++;
        continue;
      }

      try {
        const content = await fs.readFile(filePath);
        const stats = await fs.stat(filePath);
        console.log(`   Size: ${(stats.size / 1024).toFixed(1)} KB`);

        const metadata: CaseBundleMetadata = {
          caseId: doc.case_id,
          caseNumber: doc.case_number,
          plaintiff: doc.plaintiff,
          defendant: doc.defendant,
          jurisdiction: doc.jurisdiction,
          stage: 'research',
          timestamp: new Date().toISOString(),
          documentCount: 1,
        };

        console.log(`   📤 Uploading to Arweave via Turbo...`);

        const results = await arweaveService.uploadDocumentsIndividually([{
          name: doc.document_name,
          type: doc.evidence_category || doc.document_type,
          content: content,
          databaseId: doc.id,
        }], metadata);

        const uploadResult = results[0];
        const newTxId = uploadResult.dataItemId;

        console.log(`   ✅ Uploaded! New TX: ${newTxId}`);
        console.log(`   🔗 URL: https://arweave.net/${newTxId}`);

        // Update database with new TX ID
        await pool.query(`
          UPDATE case_documents
          SET arweave_tx_id = $1,
              document_hash = $2
          WHERE id = $3
        `, [newTxId, uploadResult.documentHash, doc.id]);
        console.log(`   ✅ Database updated`);

        // Update ArNS undername if exists
        if (doc.arns_undername) {
          const undername = doc.arns_undername.replace(/_[^_]+$/, '');
          console.log(`   📡 Updating ArNS undername: ${undername}`);
          try {
            const arnsResult = await arnsService.updateUndername(undername, newTxId);
            console.log(`   ✅ ArNS updated! TX: ${arnsResult.txId}`);
          } catch (err) {
            console.log(`   ⚠️  ArNS update failed: ${err instanceof Error ? err.message : 'Unknown'}`);
          }
        }

        uploaded++;

      } catch (error) {
        console.log(`   ❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        failed++;
      }

      // Rate limit
      await new Promise(r => setTimeout(r, 1000));
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 SUMMARY');
    console.log('='.repeat(70));
    console.log(`Documents processed: ${needsReupload.length}`);
    console.log(`Uploaded:            ${uploaded}`);
    console.log(`Failed:              ${failed}`);
    console.log('='.repeat(70));

    if (failed > 0) {
      console.log('\n⚠️  Some uploads failed. Check logs above.');
      process.exit(1);
    }

    console.log('\n✅ All documents re-uploaded with proper tags!\n');

  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
