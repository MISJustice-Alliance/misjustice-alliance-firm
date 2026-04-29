#!/usr/bin/env npx ts-node
/**
 * ArNS Records Reconciliation Script
 *
 * Scans all ArNS undernames from the ANT process, downloads files from Arweave,
 * calculates checksums, reconciles against the database to detect duplicates,
 * and backfills missing documents with Venice.ai analysis.
 */

import 'dotenv/config';
import { Pool } from 'pg';
import { ANT, ArweaveSigner } from '@ar.io/sdk';
import crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { loadBitwardenSecrets } from '../services/BitwardenSecretsService';
import { DocumentAnalysisService } from '../services/DocumentAnalysisService';
import { DocumentRepository } from '../repositories/DocumentRepository';
import { ArnsStatus } from '../models/Document';

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const caseFilter = args.find((a) => a.startsWith('--case='))?.split('=')[1];
const limitArg = args.find((a) => a.startsWith('--limit='))?.split('=')[1];
const limit = limitArg ? parseInt(limitArg, 10) : undefined;
const delayArg = args.find((a) => a.startsWith('--delay='))?.split('=')[1];
const delayMs = delayArg ? parseInt(delayArg, 10) : 200;
const skipAnalysis = args.includes('--skip-analysis');
const skipDownload = args.includes('--skip-download');

// Temporary directory for downloads
const TEMP_DIR = '/tmp/arns-reconcile';

// Venice.ai pricing (as of Jan 2026)
const VENICE_PRICING = {
  inputTokenCost: 0.5 / 1_000_000, // $0.50 per 1M tokens
  outputTokenCost: 2.0 / 1_000_000, // $2.00 per 1M tokens
};

/**
 * Parsed undername structure
 */
export interface ParsedUndername {
  caseNumber: string;
  documentType: string;
  sequence: number;
}

/**
 * File hash calculation result
 */
export interface HashResult {
  md5Hash: string;
  sha256Hash: string;
  fileSize: number;
}

/**
 * Reconciliation error
 */
export interface ReconciliationError {
  undername: string;
  txId?: string;
  errorType: 'download_failed' | 'case_not_found' | 'analysis_failed' | 'database_error';
  message: string;
}

/**
 * Reconciliation statistics
 */
export interface ReconciliationStats {
  totalRecords: number;
  duplicatesFound: number;
  duplicateRecords: Array<{ canonical: string; duplicates: string[] }>;
  matched: {
    byUndername: number;
    byTxId: number;
    byMd5Hash: number;
    byCaseTypeSeq: number;
    byMetadata: number;
  };
  created: number;
  updated: number;
  skipped: number;
  errors: ReconciliationError[];
  analysisRun: number;
  analysisFailed: number;
  totalCost: number;
  downloadedBytes: number;
  elapsedSeconds: number;
}

/**
 * Database document record
 */
interface DocumentRecord {
  id: string;
  document_name: string;
  arweave_tx_id: string | null;
  md5_hash: string | null;
  case_number: string;
  document_type: string;
  arns_undername: string | null;
  case_id: string;
  synopsis: string | null;
}

/**
 * Parse ArNS undername to extract case number, document type, and sequence
 */
export function parseUndername(undername: string): ParsedUndername | null {
  const match = undername.match(/^(cr-\d{4}-\d{3})-([a-z]+)(?:-(\d+))?$/i);

  if (!match) {
    return null;
  }

  return {
    caseNumber: match[1].toUpperCase(),
    documentType: match[2],
    sequence: match[3] ? parseInt(match[3], 10) : 1,
  };
}

/**
 * Calculate MD5 and SHA256 hashes from buffer
 */
export function calculateHashes(buffer: Buffer): HashResult {
  return {
    md5Hash: crypto.createHash('md5').update(buffer).digest('hex'),
    sha256Hash: crypto.createHash('sha256').update(buffer).digest('hex'),
    fileSize: buffer.length,
  };
}

/**
 * Download file from Arweave with retry logic
 */
/**
 * Download result with content type
 */
interface DownloadResult {
  buffer: Buffer;
  contentType: string | null;
}

export async function downloadFromArweave(txId: string, maxRetries = 3): Promise<DownloadResult | null> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(`https://arweave.net/${txId}`, {
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        if (attempt === maxRetries - 1) {
          return null;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }

      const arrayBuffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type');

      return {
        buffer: Buffer.from(arrayBuffer),
        contentType,
      };
    } catch (error) {
      if (attempt === maxRetries - 1) {
        return null;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }

  return null;
}

/**
 * Get file extension from Content-Type header
 */
function getExtensionFromContentType(contentType: string | null, originalFilename?: string): string {
  // Try to get extension from original filename first
  if (originalFilename) {
    const match = originalFilename.match(/\.([a-zA-Z0-9]+)$/);
    if (match) {
      return `.${match[1].toLowerCase()}`;
    }
  }

  // Fallback to Content-Type
  if (!contentType) return '.dat';

  const mimeToExt: Record<string, string> = {
    'application/pdf': '.pdf',
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
    'text/plain': '.txt',
    'application/json': '.json',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  };

  const mimeType = contentType.split(';')[0].trim().toLowerCase();
  return mimeToExt[mimeType] || '.dat';
}

/**
 * Match document using 5-tier strategy
 */
export function matchDocument(
  undername: string,
  txId: string,
  md5Hash: string,
  documents: DocumentRecord[],
  parsedName?: ParsedUndername | null
): DocumentRecord | null {
  let match = documents.find((d) => d.arns_undername === undername);
  if (match) return match;

  match = documents.find((d) => d.arweave_tx_id === txId);
  if (match) return match;

  match = documents.find((d) => d.md5_hash === md5Hash);
  if (match) return match;

  if (parsedName) {
    const caseDocs = documents.filter(
      (d) =>
        d.case_number === parsedName.caseNumber &&
        d.document_type?.toLowerCase() === parsedName.documentType.toLowerCase()
    );

    if (caseDocs.length >= parsedName.sequence) {
      match = caseDocs[parsedName.sequence - 1];
      if (match) return match;
    }
  }

  return null;
}

/**
 * Choose canonical undername from a group of duplicates
 * Strategy: Prefer shortest parseable name, then alphabetically first
 */
export function chooseCanonical(undernames: string[]): { canonical: string; duplicates: string[] } {
  if (undernames.length === 1) {
    return { canonical: undernames[0], duplicates: [] };
  }

  // Sort by: parseable first, then by length, then alphabetically
  const sorted = [...undernames].sort((a, b) => {
    const aParsed = parseUndername(a);
    const bParsed = parseUndername(b);

    // Prefer parseable names
    if (aParsed && !bParsed) return -1;
    if (!aParsed && bParsed) return 1;

    // Then by length (shorter is better)
    if (a.length !== b.length) return a.length - b.length;

    // Finally alphabetically
    return a.localeCompare(b);
  });

  return {
    canonical: sorted[0],
    duplicates: sorted.slice(1),
  };
}

/**
 * Fetch original filename from Arweave transaction tags
 */
async function fetchArweaveFilename(txId: string): Promise<string | null> {
  try {
    const query = `{
      transaction(id: "${txId}") {
        tags {
          name
          value
        }
      }
    }`;

    const response = await fetch('https://arweave.net/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      console.warn(`  [WARN] Failed to fetch tags from Arweave: ${response.statusText}`);
      return null;
    }

    const data: any = await response.json();
    const tags = data?.data?.transaction?.tags || [];

    // Look for Document-Name tag
    const documentNameTag = tags.find((tag: any) => tag.name === 'Document-Name');

    if (documentNameTag) {
      return documentNameTag.value;
    }

    return null;
  } catch (error) {
    console.warn(`  [WARN] Error fetching Arweave tags: ${error}`);
    return null;
  }
}

/**
 * Find case by case number
 */
async function findCaseByCaseNumber(pool: Pool, caseNumber: string): Promise<{ id: string } | null> {
  const result = await pool.query('SELECT id FROM legal_cases WHERE case_number = $1', [caseNumber]);
  return result.rows[0] || null;
}

/**
 * Main reconciliation function
 */
async function reconcileArnsRecords() {
  console.log('='.repeat(80));
  console.log('ArNS Records Reconciliation Script');
  console.log('='.repeat(80));
  console.log();

  if (dryRun) {
    console.log('[DRY RUN] No changes will be made to the database\n');
  }

  const startTime = Date.now();

  // Load Bitwarden secrets
  const bwAccessToken = process.env.BW_ACCESS_TOKEN;
  const bwProjectId = process.env.BW_PROJECT_ID;

  if (bwAccessToken && bwProjectId) {
    console.log('Loading secrets from Bitwarden...');
    await loadBitwardenSecrets(bwAccessToken, bwProjectId);
    console.log('Bitwarden secrets loaded\n');
  }

  // Initialize temp directory
  await fs.mkdir(TEMP_DIR, { recursive: true });

  // Initialize database pool
  const pool = new Pool({
    host: process.env.DATABASE_HOST || 'postgres',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    database: process.env.DATABASE_NAME || 'misjustice_dev',
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
  });

  const documentRepository = new DocumentRepository(pool);
  // Initialize Venice.ai analysis service (unless --skip-analysis flag is set)
  const analysisService = skipAnalysis ? null : new DocumentAnalysisService();

  // Get ArNS configuration
  const antProcessId = process.env.ANT_PROCESS_ID || 'iBwPYGTN04CpGT65CKfHGEeekTyzRjP2TtCUIlk96eM';
  const mainArnsName = process.env.MAIN_ARNS_NAME || 'misjusticealliance';

  console.log(`ANT Process ID: ${antProcessId}`);
  console.log(`Main ArNS Name: ${mainArnsName}\n`);

  // Initialize statistics
  const stats: ReconciliationStats = {
    totalRecords: 0,
    duplicatesFound: 0,
    duplicateRecords: [],
    matched: {
      byUndername: 0,
      byTxId: 0,
      byMd5Hash: 0,
      byCaseTypeSeq: 0,
      byMetadata: 0,
    },
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    analysisRun: 0,
    analysisFailed: 0,
    totalCost: 0,
    downloadedBytes: 0,
    elapsedSeconds: 0,
  };

  try {
    // Initialize ANT client
    console.log('Connecting to ANT...');

    let jwk;
    const arweaveKeyfile = process.env.ARWEAVE_KEYFILE;
    if (arweaveKeyfile) {
      jwk = JSON.parse(arweaveKeyfile);
    } else {
      throw new Error('ARWEAVE_KEYFILE not found in environment');
    }

    const signer = new ArweaveSigner(jwk);
    const ant = ANT.init({
      signer,
      processId: antProcessId,
    });

    // Get all records from ANT
    console.log('Fetching ArNS records from ANT...\n');
    const records = await ant.getRecords();

    let recordEntries = Object.entries(records);
    stats.totalRecords = recordEntries.length;

    // Filter out non-standard undernames (only keep cr-* pattern)
    const beforeFilter = recordEntries.length;
    recordEntries = recordEntries.filter(([undername]) => {
      return undername.toLowerCase().startsWith('cr-');
    });
    const filtered = beforeFilter - recordEntries.length;
    if (filtered > 0) {
      console.log(`Filtered out ${filtered} non-standard undernames (keeping only cr-* pattern)\n`);
    }

    // Filter by case if specified
    if (caseFilter) {
      recordEntries = recordEntries.filter(([undername]) => {
        const parsed = parseUndername(undername);
        return parsed && parsed.caseNumber === caseFilter.toUpperCase();
      });
      console.log(`Filtered to ${recordEntries.length} records for case ${caseFilter}\n`);
    }

    // Apply limit
    if (limit) {
      recordEntries = recordEntries.slice(0, limit);
      console.log(`Limited to first ${limit} records\n`);
    }

    console.log(`Processing ${recordEntries.length} ArNS records\n`);

    if (recordEntries.length === 0) {
      console.log('No ArNS records to process. Exiting.');
      return;
    }

    // Get all documents from database
    const docsResult = await pool.query<DocumentRecord>(`
      SELECT cd.id, cd.document_name, cd.document_type, cd.arweave_tx_id, cd.arns_undername,
             cd.md5_hash, cd.synopsis, cd.case_id,
             lc.case_number
      FROM case_documents cd
      JOIN legal_cases lc ON cd.case_id = lc.id
      ORDER BY lc.case_number, cd.document_type, cd.created_at
    `);
    const documents = docsResult.rows;

    console.log(`Found ${documents.length} documents in database\n`);

    // =========================================================================
    // PHASE 1: Download files and calculate MD5 hashes
    // =========================================================================
    console.log('='.repeat(80));
    console.log('PHASE 1: Downloading and Hashing Files');
    console.log('='.repeat(80));

    interface RecordWithHash {
      undername: string;
      txId: string;
      fullUndername: string;
      parsedName: ParsedUndername | null;
      md5Hash: string;
      fileSize: number;
      tempFilePath?: string; // Path to downloaded file in temp directory
      originalFilename?: string; // Original filename from Arweave tags
    }

    const recordsWithHashes: RecordWithHash[] = [];

    for (const [undername, record] of recordEntries) {
      const txId = (record as any).transactionId;
      const fullUndername = `${undername}_${mainArnsName}.arweave.net`;
      const parsedName = parseUndername(undername);

      console.log(`\n[${undername}]`);
      console.log(`  TX: ${txId}`);

      // Fetch original filename from Arweave tags
      const originalFilename = await fetchArweaveFilename(txId);
      if (originalFilename) {
        console.log(`  Original: ${originalFilename}`);
      }

      if (!skipDownload) {
        console.log(`  Downloading...`);
        const downloadResult = await downloadFromArweave(txId);

        if (!downloadResult) {
          console.log(`  [ERROR] Download failed`);
          stats.errors.push({
            undername,
            txId,
            errorType: 'download_failed',
            message: 'Failed to download from Arweave',
          });
          continue;
        }

        const { buffer, contentType } = downloadResult;
        const hashResult = calculateHashes(buffer);
        stats.downloadedBytes += hashResult.fileSize;
        console.log(`  Size: ${hashResult.fileSize} bytes`);
        console.log(`  MD5: ${hashResult.md5Hash}`);

        // Get proper file extension from Content-Type or original filename
        const fileExtension = getExtensionFromContentType(contentType, originalFilename || undefined);
        if (contentType) {
          console.log(`  Type: ${contentType} → ${fileExtension}`);
        }

        // Save file to temp directory with proper extension for Venice.ai analysis
        const tempFilePath = path.join(TEMP_DIR, `${txId}${fileExtension}`);
        await fs.writeFile(tempFilePath, buffer);

        recordsWithHashes.push({
          undername,
          txId,
          fullUndername,
          parsedName,
          md5Hash: hashResult.md5Hash,
          fileSize: hashResult.fileSize,
          tempFilePath,
          originalFilename: originalFilename || undefined,
        });
      } else {
        // Skip download mode - use TX ID as hash placeholder
        recordsWithHashes.push({
          undername,
          txId,
          fullUndername,
          parsedName,
          md5Hash: txId, // Use TX ID as unique identifier
          fileSize: 0,
          originalFilename: originalFilename || undefined,
        });
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    // =========================================================================
    // PHASE 2: Deduplicate by MD5 hash
    // =========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('PHASE 2: Deduplicating Records by MD5');
    console.log('='.repeat(80));

    const recordsByMd5 = new Map<string, RecordWithHash[]>();
    for (const record of recordsWithHashes) {
      if (!recordsByMd5.has(record.md5Hash)) {
        recordsByMd5.set(record.md5Hash, []);
      }
      recordsByMd5.get(record.md5Hash)!.push(record);
    }

    const canonicalRecords: RecordWithHash[] = [];
    const duplicatesToDelete: string[] = [];

    for (const [md5Hash, records] of Array.from(recordsByMd5.entries())) {
      if (records.length === 1) {
        // No duplicates
        canonicalRecords.push(records[0]);
      } else {
        // Found duplicates - choose canonical and mark others for deletion
        const undernames = records.map((r) => r.undername);
        const { canonical, duplicates } = chooseCanonical(undernames);

        const canonicalRecord = records.find((r) => r.undername === canonical)!;
        canonicalRecords.push(canonicalRecord);

        console.log(`\n[DUPLICATE FOUND] MD5: ${md5Hash.substring(0, 12)}...`);
        console.log(`  Canonical: ${canonical}`);
        console.log(`  Duplicates (${duplicates.length}):`);
        for (const dup of duplicates) {
          console.log(`    - ${dup}`);
          duplicatesToDelete.push(dup);
        }

        stats.duplicatesFound += duplicates.length;
        stats.duplicateRecords.push({ canonical, duplicates });
      }
    }

    console.log(`\nDeduplication complete:`);
    console.log(`  Unique records: ${canonicalRecords.length}`);
    console.log(`  Duplicates found: ${stats.duplicatesFound}`);

    // =========================================================================
    // PHASE 3: Delete duplicate undernames from ANT
    // =========================================================================
    if (duplicatesToDelete.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('PHASE 3: Deleting Duplicate Undernames from ANT');
      console.log('='.repeat(80));

      for (const undername of duplicatesToDelete) {
        console.log(`\n[DELETE] ${undername}`);
        if (!dryRun) {
          try {
            await ant.removeRecord({ undername });
            console.log(`  [DELETED] Successfully removed from ANT`);
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.log(`  [ERROR] Failed to delete: ${errorMessage}`);
            stats.errors.push({
              undername,
              errorType: 'database_error',
              message: `Failed to delete from ANT: ${errorMessage}`,
            });
          }
        } else {
          console.log(`  [DRY RUN] Would delete from ANT`);
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    // =========================================================================
    // PHASE 4: Process canonical records
    // =========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('PHASE 4: Processing Canonical Records');
    console.log('='.repeat(80));

    for (const record of canonicalRecords) {
      const { undername, txId, fullUndername, parsedName, md5Hash } = record;

      console.log(`\n[${undername}]`);
      console.log(`  TX: ${txId}`);

      if (parsedName) {
        console.log(`  Case: ${parsedName.caseNumber}, Type: ${parsedName.documentType}, Seq: ${parsedName.sequence}`);
      }

      // Match document using 5-tier strategy
      const matchedDoc = matchDocument(fullUndername, txId, md5Hash, documents, parsedName);

      if (matchedDoc) {
        // Document already exists - skip (no updates)
        stats.skipped++;
        console.log(`  [MATCH] ${matchedDoc.document_name}`);
        console.log(`  [SKIP] Record already exists`);
      } else {
        // No match - create new document record
        console.log(`  [NO MATCH] Creating new document record`);

        if (!parsedName) {
          console.log(`  [WARN] Cannot parse undername - skipping`);
          continue;
        }

        const caseRecord = await findCaseByCaseNumber(pool, parsedName.caseNumber);
        if (!caseRecord) {
          console.log(`  [ERROR] Case ${parsedName.caseNumber} not found`);
          stats.errors.push({
            undername,
            txId,
            errorType: 'case_not_found',
            message: `Case ${parsedName.caseNumber} does not exist`,
          });
          continue;
        }

        // Analyze with Venice.ai (unless --skip-analysis)
        let synopsis: string | null = null;
        let tags: string[] = [];

        // Use original filename if available, otherwise use undername
        const documentName = record.originalFilename || undername;

        if (analysisService && record.tempFilePath) {
          try {
            console.log(`  [ANALYZING] Running Venice.ai analysis...`);
            const analysis = await analysisService.analyzeDocument(record.tempFilePath, documentName);

            synopsis = analysis.synopsis;
            tags = analysis.tags;
            stats.analysisRun++;

            // Track cost
            if (analysis.tokenUsage) {
              const cost =
                (analysis.tokenUsage.inputTokens || 0) * VENICE_PRICING.inputTokenCost +
                (analysis.tokenUsage.outputTokens || 0) * VENICE_PRICING.outputTokenCost;
              stats.totalCost += cost;
              console.log(`  [ANALYSIS] Synopsis: "${synopsis?.substring(0, 60)}..." (cost: $${cost.toFixed(4)})`);
            } else {
              console.log(`  [ANALYSIS] Synopsis: "${synopsis?.substring(0, 60)}..."`);
            }
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.log(`  [WARN] Analysis failed: ${errorMessage}`);
            stats.analysisFailed++;
          }
        }

        // Create document record
        if (!dryRun) {
          // Create document with basic fields (using original filename)
          const newDoc = await documentRepository.create({
            caseId: caseRecord.id,
            documentType: parsedName.documentType as any, // Type assertion for string to enum
            documentName: documentName,
          });

          // Update with Arweave/ArNS fields and Venice.ai analysis
          await documentRepository.update(newDoc.id, {
            arweaveTxId: txId,
            fileSize: record.fileSize,
            md5Hash: md5Hash,
            arnsUndername: fullUndername,
            arnsStatus: ArnsStatus.ACTIVE,
            arnsUrl: `https://${fullUndername}`,
            synopsis: synopsis || undefined,
            tags: tags.length > 0 ? tags : undefined,
          });
        }

        stats.created++;
        console.log(`  ${dryRun ? '[DRY RUN]' : '[CREATED]'} New document${synopsis ? ' with AI synopsis' : ''}`);
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    // Calculate elapsed time
    stats.elapsedSeconds = (Date.now() - startTime) / 1000;

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('RECONCILIATION SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total records fetched: ${recordEntries.length}`);
    console.log(`Unique records (after dedup): ${canonicalRecords.length}`);
    console.log(`Duplicates found: ${stats.duplicatesFound}`);
    console.log(`\nMatching Strategy:`);
    console.log(`  By ArNS undername: ${stats.matched.byUndername}`);
    console.log(`  By Arweave TX ID:  ${stats.matched.byTxId}`);
    console.log(`  By MD5 hash:       ${stats.matched.byMd5Hash}`);
    console.log(`  By case+type+seq:  ${stats.matched.byCaseTypeSeq}`);
    console.log(`  By metadata:       ${stats.matched.byMetadata}`);
    console.log(`\nActions:`);
    console.log(`  Created:  ${stats.created}`);
    console.log(`  Updated:  ${stats.updated}`);
    console.log(`  Skipped:  ${stats.skipped}`);
    console.log(`  Errors:   ${stats.errors.length}`);
    console.log(`\nVenice.ai Analysis:`);
    console.log(`  Analyzed:     ${stats.analysisRun}`);
    console.log(`  Failed:       ${stats.analysisFailed}`);
    console.log(`  Total cost:   $${stats.totalCost.toFixed(4)}`);
    console.log(`\nPerformance:`);
    console.log(`  Downloaded:  ${(stats.downloadedBytes / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Elapsed:     ${stats.elapsedSeconds.toFixed(1)}s`);
    console.log('='.repeat(80));

    if (stats.duplicateRecords.length > 0) {
      console.log('\nDuplicate undernames removed:');
      console.log('-'.repeat(80));
      for (const { canonical, duplicates } of stats.duplicateRecords) {
        console.log(`  Canonical: ${canonical}`);
        for (const dup of duplicates) {
          console.log(`    Removed: ${dup}`);
        }
      }
      console.log('-'.repeat(80));
    }

    if (stats.errors.length > 0) {
      console.log('\nErrors encountered:');
      console.log('-'.repeat(80));
      for (const error of stats.errors) {
        console.log(`  ${error.undername} (${error.errorType}): ${error.message}`);
      }
      console.log('-'.repeat(80));
    }

    if (dryRun) {
      console.log('\n[DRY RUN] No changes were made to the database');
    }

    console.log('\nReconciliation complete!\n');
  } catch (error) {
    console.error('\nReconciliation failed:', error);
    process.exit(1);
  } finally {
    // Cleanup temp directory
    await fs.rm(TEMP_DIR, { recursive: true, force: true }).catch(() => {});
    await pool.end();
  }
}

// Cleanup on exit
process.on('exit', async () => {
  await fs.rm(TEMP_DIR, { recursive: true, force: true }).catch(() => {});
});

process.on('SIGINT', async () => {
  await fs.rm(TEMP_DIR, { recursive: true, force: true }).catch(() => {});
  process.exit();
});

// Run the reconciliation if executed directly
if (require.main === module) {
  reconcileArnsRecords().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}
