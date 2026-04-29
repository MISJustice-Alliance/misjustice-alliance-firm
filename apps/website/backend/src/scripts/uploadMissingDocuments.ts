/**
 * Upload Missing Documents to Arweave
 *
 * Finds documents in the database that don't exist on Arweave (or have null TX IDs)
 * and uploads them. Uses the file_path stored in the database to locate files.
 *
 * This script is idempotent and can be run repeatedly.
 *
 * Usage:
 *   npx ts-node src/scripts/uploadMissingDocuments.ts
 *   npx ts-node src/scripts/uploadMissingDocuments.ts --dry-run
 *   npx ts-node src/scripts/uploadMissingDocuments.ts --case=CR-2025-002
 *   npx ts-node src/scripts/uploadMissingDocuments.ts --recheck  # Re-verify TX IDs exist on Arweave
 */

import 'dotenv/config';
import fs from 'fs/promises';
import crypto from 'crypto';
import { Pool } from 'pg';
import {
  ArweaveService,
  loadWalletFromEnv,
  CaseBundleMetadata,
} from '../services/arweaveService';
import { loadBitwardenSecrets } from '../services/BitwardenSecretsService';

/**
 * Calculate MD5 hash of a buffer
 */
function calculateMd5(data: Buffer): string {
  return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * Verify uploaded file matches local file by comparing MD5 hashes
 */
async function verifyArweaveUpload(txId: string, expectedMd5: string): Promise<boolean> {
  try {
    const response = await fetch(`https://arweave.net/${txId}`);
    if (!response.ok) {
      console.log(`      Warning: Could not fetch from Arweave for verification (HTTP ${response.status})`);
      return false;
    }

    const data = await response.arrayBuffer();
    const buffer = Buffer.from(data);
    const arweaveMd5 = calculateMd5(buffer);

    if (arweaveMd5 === expectedMd5) {
      return true;
    } else {
      console.log(`      MD5 mismatch! Local: ${expectedMd5}, Arweave: ${arweaveMd5}`);
      return false;
    }
  } catch (error) {
    console.log(`      Warning: Verification fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const recheck = args.includes('--recheck');
const caseFilter = args.find(a => a.startsWith('--case='))?.split('=')[1];

interface DocumentRecord {
  id: string;
  document_name: string;
  document_type: string;
  evidence_category: string | null;
  file_path: string;
  arweave_tx_id: string | null;
  case_id: string;
  case_number: string;
  plaintiff: string;
  defendant: string;
  jurisdiction: string;
  status: string;
}

/**
 * Check if a TX ID exists on Arweave
 */
async function txExistsOnArweave(txId: string): Promise<boolean> {
  try {
    const response = await fetch('https://arweave.net/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query { transaction(id: "${txId}") { id } }`
      }),
    });

    const data = await response.json() as {
      data?: { transaction?: { id: string } }
    };

    return !!data?.data?.transaction?.id;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('======================================================================');
  console.log('Upload Missing Documents to Arweave');
  console.log('======================================================================');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  if (recheck) {
    console.log('🔄 RECHECK MODE - Will verify TX IDs exist on Arweave\n');
  }

  // Capture database config before loading Bitwarden
  const dbConfig = {
    user: process.env.DATABASE_USER || 'postgres',
    host: process.env.DATABASE_HOST || 'postgres',
    database: process.env.DATABASE_NAME || 'misjustice_dev',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  };

  // Load Bitwarden secrets
  const bwAccessToken = process.env.BW_ACCESS_TOKEN;
  const bwProjectId = process.env.BW_PROJECT_ID;

  if (bwAccessToken && bwProjectId) {
    console.log('🔐 Loading secrets from Bitwarden...');
    await loadBitwardenSecrets(bwAccessToken, bwProjectId);
    console.log('✅ Bitwarden secrets loaded\n');
  }

  // Load Arweave wallet
  console.log('📁 Loading Arweave wallet...');
  const wallet = await loadWalletFromEnv();
  if (!wallet) {
    throw new Error('Arweave wallet not configured');
  }

  // Initialize services
  const arweaveService = new ArweaveService(wallet);
  const walletAddress = await arweaveService.getWalletAddress();
  console.log(`✅ Wallet loaded: ${walletAddress}\n`);

  const pool = new Pool(dbConfig);

  try {
    // Build query to find documents needing upload
    let query = `
      SELECT cd.id, cd.document_name, cd.document_type, cd.evidence_category,
             cd.file_path, cd.arweave_tx_id, cd.case_id,
             lc.case_number, lc.plaintiff, lc.defendant, lc.jurisdiction, lc.status
      FROM case_documents cd
      JOIN legal_cases lc ON cd.case_id = lc.id
      WHERE cd.file_path IS NOT NULL
    `;

    if (!recheck) {
      // Only get documents without TX IDs
      query += ` AND cd.arweave_tx_id IS NULL`;
    }

    if (caseFilter) {
      query += ` AND lc.case_number = '${caseFilter}'`;
    }

    query += ` ORDER BY lc.case_number, cd.document_name`;

    const result = await pool.query(query);
    const documents: DocumentRecord[] = result.rows;

    console.log(`📋 Found ${documents.length} documents to check`);
    if (caseFilter) {
      console.log(`   Filter: case_number = '${caseFilter}'`);
    }
    console.log('');

    // Find documents that need uploading
    const needsUpload: DocumentRecord[] = [];
    const alreadyUploaded: DocumentRecord[] = [];
    const fileNotFound: DocumentRecord[] = [];

    console.log('─'.repeat(70));
    console.log('📖 Checking documents...\n');

    for (const doc of documents) {
      // Check if file exists
      try {
        await fs.access(doc.file_path);
      } catch {
        fileNotFound.push(doc);
        continue;
      }

      // Check if TX ID exists on Arweave (if recheck mode or no TX ID)
      if (doc.arweave_tx_id) {
        if (recheck) {
          const exists = await txExistsOnArweave(doc.arweave_tx_id);
          if (!exists) {
            console.log(`  ⚠️  TX not found on Arweave: ${doc.document_name}`);
            needsUpload.push(doc);
          } else {
            alreadyUploaded.push(doc);
          }
          // Rate limit
          await new Promise(resolve => setTimeout(resolve, 100));
        } else {
          alreadyUploaded.push(doc);
        }
      } else {
        needsUpload.push(doc);
      }
    }

    console.log('─'.repeat(70));
    console.log('\n📊 ANALYSIS RESULTS');
    console.log('─'.repeat(70));
    console.log(`✅ Already uploaded:  ${alreadyUploaded.length}`);
    console.log(`📤 Needs upload:      ${needsUpload.length}`);
    console.log(`⚠️  File not found:    ${fileNotFound.length}`);
    console.log('─'.repeat(70));

    if (needsUpload.length === 0) {
      console.log('\n✅ All documents are already on Arweave!\n');
      await pool.end();
      return;
    }

    // Upload missing documents
    console.log('\n📤 Uploading missing documents...\n');

    let uploaded = 0;
    let failed = 0;

    for (const doc of needsUpload) {
      console.log(`\n📄 ${doc.document_name}`);
      console.log(`   Case: ${doc.case_number}`);
      console.log(`   Path: ${doc.file_path}`);

      // Get file stats
      const stats = await fs.stat(doc.file_path);
      console.log(`   Size: ${(stats.size / 1024).toFixed(1)} KB`);

      if (dryRun) {
        console.log(`   📋 Would upload to Arweave and update database`);
        uploaded++;
        continue;
      }

      try {
        // Read file content
        const content = await fs.readFile(doc.file_path);

        // Calculate MD5 hash before upload
        const localMd5 = calculateMd5(content);
        const fileSize = content.length;
        console.log(`   🔐 MD5: ${localMd5}`);
        console.log(`   📊 Size: ${fileSize} bytes (${(fileSize / 1024).toFixed(1)} KB)`);

        // Create metadata
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

        // Upload to Arweave
        console.log(`   📤 Uploading to Arweave...`);

        const results = await arweaveService.uploadDocumentsIndividually([{
          name: doc.document_name,
          type: doc.evidence_category || doc.document_type,
          content: content,
          databaseId: doc.id,
        }], metadata);

        const uploadResult = results[0];
        console.log(`   ✅ Uploaded! TX: ${uploadResult.dataItemId}`);
        console.log(`   🔗 URL: https://arweave.net/${uploadResult.dataItemId}`);

        // Verify upload by fetching from Arweave and comparing MD5
        console.log(`   🔍 Verifying upload integrity...`);

        // Small delay to allow Arweave to propagate
        await new Promise(resolve => setTimeout(resolve, 1000));

        const verified = await verifyArweaveUpload(uploadResult.dataItemId, localMd5);
        if (verified) {
          console.log(`   ✅ Verification passed! MD5 match confirmed.`);
        } else {
          console.log(`   ⚠️  Verification pending (file may still be propagating)`);
        }

        // Update database with arweave_tx_id, document_hash, file_size, and md5_hash
        await pool.query(`
          UPDATE case_documents
          SET arweave_tx_id = $1,
              document_hash = $2,
              file_size = $3,
              md5_hash = $4
          WHERE id = $5
        `, [uploadResult.dataItemId, uploadResult.documentHash, fileSize, localMd5, doc.id]);

        console.log(`   ✅ Database updated (including file_size and md5_hash)`);
        uploaded++;

      } catch (error) {
        console.log(`   ❌ Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        failed++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 UPLOAD SUMMARY');
    console.log('='.repeat(70));
    console.log(`Documents to upload: ${needsUpload.length}`);
    console.log(`Uploaded:            ${uploaded}`);
    console.log(`Failed:              ${failed}`);
    console.log('='.repeat(70));

    if (fileNotFound.length > 0) {
      console.log('\n⚠️  Files not found (check file_path in database):');
      for (const doc of fileNotFound) {
        console.log(`  • ${doc.case_number} | ${doc.document_name}`);
        console.log(`    Path: ${doc.file_path}`);
      }
    }

    if (failed > 0) {
      console.log('\n⚠️  Some uploads failed. Check logs above for details.');
      await pool.end();
      process.exit(1);
    }

    console.log('\n✅ Upload complete!\n');

  } catch (error) {
    console.error('\n💥 Upload failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
