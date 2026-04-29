/**
 * Backfill Document File Sizes and MD5 Hashes from Arweave
 *
 * Fetches files from Arweave for all documents that have an
 * arweave_tx_id but missing file_size or md5_hash, calculates
 * both values, and updates the database.
 *
 * This enables users to verify that downloaded files match the
 * archived versions using the md5sum command.
 *
 * This script should be run after the 011_add_document_file_size.sql
 * and 012_add_document_md5_hash.sql migrations.
 *
 * Usage:
 *   npx ts-node src/scripts/backfillDocumentSizes.ts
 *   npx ts-node src/scripts/backfillDocumentSizes.ts --dry-run
 */

import 'dotenv/config';
import { Pool } from 'pg';
import crypto from 'crypto';
import { loadBitwardenSecrets } from '../services/BitwardenSecretsService';

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

interface DocumentRecord {
  id: string;
  document_name: string;
  arweave_tx_id: string;
  file_size: number | null;
  md5_hash: string | null;
}

interface ArweaveFileData {
  fileSize: number;
  md5Hash: string;
}

/**
 * Calculate MD5 hash of a buffer
 */
function calculateMd5(data: Buffer): string {
  return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * Fetch file from Arweave and calculate file size and MD5 hash
 */
async function getArweaveFileData(txId: string): Promise<ArweaveFileData | null> {
  try {
    const response = await fetch(`https://arweave.net/${txId}`);

    if (!response.ok) {
      console.error(`  Failed to fetch ${txId}: HTTP ${response.status}`);
      return null;
    }

    const data = await response.arrayBuffer();
    const buffer = Buffer.from(data);

    return {
      fileSize: buffer.length,
      md5Hash: calculateMd5(buffer),
    };
  } catch (error) {
    console.error(`  Error fetching data for ${txId}:`, error);
    return null;
  }
}

/**
 * Fetch only file size from Arweave using HEAD request (for optimization)
 * Used when we already have MD5 hash but need file size
 */
async function getArweaveFileSize(txId: string): Promise<number | null> {
  try {
    const response = await fetch(`https://arweave.net/${txId}`, {
      method: 'HEAD',
    });

    if (!response.ok) {
      console.error(`  Failed to fetch ${txId}: HTTP ${response.status}`);
      return null;
    }

    const contentLength = response.headers.get('Content-Length');
    if (contentLength) {
      return parseInt(contentLength, 10);
    }

    // If no Content-Length header, we need to fetch the actual content
    console.log(`  No Content-Length header for ${txId}, fetching content...`);
    const dataResponse = await fetch(`https://arweave.net/${txId}`);
    if (dataResponse.ok) {
      const data = await dataResponse.arrayBuffer();
      return data.byteLength;
    }

    return null;
  } catch (error) {
    console.error(`  Error fetching size for ${txId}:`, error);
    return null;
  }
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

async function main() {
  console.log('='.repeat(60));
  console.log('Backfill Document File Sizes and MD5 Hashes from Arweave');
  console.log('='.repeat(60));

  if (isDryRun) {
    console.log('\n[DRY RUN MODE - No changes will be made]\n');
  }

  // Load Bitwarden secrets if configured (do this first so env vars are available)
  const bwAccessToken = process.env.BW_ACCESS_TOKEN;
  const bwProjectId = process.env.BW_PROJECT_ID;

  if (bwAccessToken && bwProjectId) {
    console.log('🔐 Loading secrets from Bitwarden...');
    await loadBitwardenSecrets(bwAccessToken, bwProjectId);
    console.log('✅ Bitwarden secrets loaded\n');
  }

  // Capture database config from environment (after Bitwarden secrets if available)
  // Check if we're running inside Docker (running from /app directory)
  const isDocker = process.cwd().startsWith('/app');

  // When running in Docker, always use 'postgres' as the host (Docker service name)
  // Bitwarden may set DATABASE_HOST to 'localhost' which doesn't work in container context
  const dbHost = isDocker ? 'postgres' : (process.env.DATABASE_HOST || 'localhost');

  const dbConfig = {
    user: process.env.DATABASE_USER || 'postgres',
    host: dbHost,
    database: process.env.DATABASE_NAME || 'misjustice_dev',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  };

  console.log(`Connecting to database: ${dbConfig.database}@${dbConfig.host}:${dbConfig.port}`);

  const pool = new Pool(dbConfig);

  try {
    // Find all documents with missing file_size or md5_hash
    console.log('\nQuerying documents with missing file sizes or MD5 hashes...');
    const result = await pool.query<DocumentRecord>(`
      SELECT id, document_name, arweave_tx_id, file_size, md5_hash
      FROM case_documents
      WHERE (file_size IS NULL OR md5_hash IS NULL) AND arweave_tx_id IS NOT NULL
      ORDER BY created_at ASC
    `);

    const documents = result.rows;
    console.log(`Found ${documents.length} documents to process.`);

    if (documents.length === 0) {
      console.log('\nNo documents need backfill.');
      return;
    }

    let successCount = 0;
    let failureCount = 0;
    let totalBytes = 0;

    console.log('\nProcessing documents:\n');

    for (const doc of documents) {
      console.log(`Processing: ${doc.document_name}`);
      console.log(`  TX ID: ${doc.arweave_tx_id}`);
      console.log(`  Current: file_size=${doc.file_size || 'null'}, md5_hash=${doc.md5_hash || 'null'}`);

      // Determine what we need to fetch
      const needsFullFetch = doc.md5_hash === null;

      if (needsFullFetch) {
        // Need to fetch full content to calculate MD5
        const fileData = await getArweaveFileData(doc.arweave_tx_id);

        if (fileData !== null) {
          console.log(`  Size: ${formatFileSize(fileData.fileSize)} (${fileData.fileSize} bytes)`);
          console.log(`  MD5:  ${fileData.md5Hash}`);

          if (!isDryRun) {
            await pool.query(
              'UPDATE case_documents SET file_size = $1, md5_hash = $2 WHERE id = $3',
              [fileData.fileSize, fileData.md5Hash, doc.id]
            );
            console.log('  ✓ Updated database (file_size + md5_hash)');
          } else {
            console.log('  [Dry run - would update database]');
          }

          successCount++;
          totalBytes += fileData.fileSize;
        } else {
          console.log('  ✗ Could not fetch file data');
          failureCount++;
        }
      } else {
        // Only need file size, use HEAD request for efficiency
        const fileSize = await getArweaveFileSize(doc.arweave_tx_id);

        if (fileSize !== null) {
          console.log(`  Size: ${formatFileSize(fileSize)} (${fileSize} bytes)`);
          console.log(`  MD5:  ${doc.md5_hash} (already set)`);

          if (!isDryRun) {
            await pool.query(
              'UPDATE case_documents SET file_size = $1 WHERE id = $2',
              [fileSize, doc.id]
            );
            console.log('  ✓ Updated database (file_size only)');
          } else {
            console.log('  [Dry run - would update database]');
          }

          successCount++;
          totalBytes += fileSize;
        } else {
          console.log('  ✗ Could not fetch file size');
          failureCount++;
        }
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    console.log('\n' + '='.repeat(60));
    console.log('Summary');
    console.log('='.repeat(60));
    console.log(`Total documents processed: ${documents.length}`);
    console.log(`Successful updates: ${successCount}`);
    console.log(`Failed: ${failureCount}`);
    console.log(`Total size backfilled: ${formatFileSize(totalBytes)}`);

    if (isDryRun) {
      console.log('\n[DRY RUN - No changes were made to the database]');
    }

    console.log('\nUsers can verify downloaded files using:');
    console.log('  md5sum <downloaded_file>');
    console.log('  # Compare output with the md5_hash value in the database');
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
