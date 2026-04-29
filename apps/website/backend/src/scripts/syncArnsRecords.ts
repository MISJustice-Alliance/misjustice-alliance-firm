/**
 * Sync ArNS Records to Database
 *
 * Scans existing ArNS undername records from the ANT process and updates
 * the database with arweave_tx_id and ArNS information for matching documents.
 *
 * Usage:
 *   npx ts-node src/scripts/syncArnsRecords.ts
 *   npx ts-node src/scripts/syncArnsRecords.ts --dry-run
 */

import 'dotenv/config';
import { Pool } from 'pg';
import { ANT, ArweaveSigner } from '@ar.io/sdk';
import { loadBitwardenSecrets } from '../services/BitwardenSecretsService';

// ANT Record type from AR.IO SDK
interface AntRecord {
  transactionId: string;
  ttlSeconds: number;
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

// Database pool
let pool: Pool;

// Case number migration mapping (old -> new)
const CASE_NUMBER_MIGRATION: Record<string, string> = {
  'CR-2024-001': 'CR-2025-001',
  'CR-2024-002': 'CR-2025-002',
  'CR-2024-003': 'CR-2025-003',
};

// Document name abbreviation mappings for doc# patterns
const DOC_NAME_PATTERNS: Record<string, RegExp> = {
  'case_summary': /01.*(case.*summary|summary)/i,
  'fbi_civil_rights_wa_cover_letter': /02.*(fbi.*civil.*rights.*wa|fbi.*wa)/i,
  'fbi_civil_rights_mt_cover_letter': /03.*(fbi.*civil.*rights.*mt|fbi.*mt)/i,
  'mt_ag_cover_letter': /04.*(montana.*ag|mt.*ag)/i,
  'wa_ag_cover_letter': /05.*(washington.*ag|wa.*ag)/i,
  'usao_mt_cover_letter': /06.*(usao.*montana|usao.*mt)/i,
  'usao_west_wa_cover_letter': /07.*(usao.*western.*washington|usao.*west.*wa)/i,
  'doj_public_integrity_cover_letter': /08.*(doj.*public.*integrity)/i,
  'danielle_chard_criminal_report': /09.*(danielle.*chard|chard.*criminal)/i,
  'elise_chard_criminal_report': /10.*(elise.*chard|comprehensive.*evidentiary)/i,
  'elvis_nuno_sworn_declaration': /11.*2.*(elvis.*nuno.*sworn|nuno.*declaration)/i,
  'evidentiary_documentation': /11.*3.*(comprehensive.*evidentiary|evidentiary.*documentation)/i,
  'ywca_supplemental': /11.*1.*(ywca.*supplemental|ywca.*institutional)/i,
};

// Cache for transaction metadata
const txMetadataCache: Map<string, { fileName?: string; contentType?: string }> = new Map();

/**
 * Fetch transaction metadata from Arweave GraphQL
 */
async function getTransactionMetadata(txId: string): Promise<{ fileName?: string; contentType?: string }> {
  // Check cache first
  if (txMetadataCache.has(txId)) {
    return txMetadataCache.get(txId)!;
  }

  try {
    // Use GraphQL to fetch transaction tags
    const response = await fetch('https://arweave.net/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query { transaction(id: "${txId}") { tags { name value } } }`
      }),
    });

    const data = await response.json() as { data?: { transaction?: { tags?: Array<{name: string, value: string}> } } };
    const tags = data?.data?.transaction?.tags || [];

    const fileName = tags.find((t: {name: string, value: string}) => t.name === 'Document-Name')?.value
      || tags.find((t: {name: string, value: string}) => t.name === 'File-Name')?.value
      || tags.find((t: {name: string, value: string}) => t.name === 'Title')?.value;
    const contentType = tags.find((t: {name: string, value: string}) => t.name === 'Content-Type')?.value;

    const metadata = { fileName, contentType };
    txMetadataCache.set(txId, metadata);
    return metadata;
  } catch (error) {
    // Transaction might not exist or be pending
    const metadata = {};
    txMetadataCache.set(txId, metadata);
    return metadata;
  }
}

/**
 * Main sync function
 */
async function syncArnsRecords() {
  console.log('======================================================================');
  console.log('ArNS Records Sync Script');
  console.log('======================================================================');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  // Load Bitwarden secrets
  const bwAccessToken = process.env.BW_ACCESS_TOKEN;
  const bwProjectId = process.env.BW_PROJECT_ID;

  if (bwAccessToken && bwProjectId) {
    console.log('🔐 Loading secrets from Bitwarden...');
    await loadBitwardenSecrets(bwAccessToken, bwProjectId);
    console.log('✅ Bitwarden secrets loaded\n');
  }

  // Initialize database pool
  pool = new Pool({
    host: 'postgres',
    port: 5432,
    database: 'misjustice_dev',
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
  });

  // Get ArNS configuration
  const antProcessId = process.env.ANT_PROCESS_ID || 'iBwPYGTN04CpGT65CKfHGEeekTyzRjP2TtCUIlk96eM';
  const mainArnsName = process.env.MAIN_ARNS_NAME || 'misjusticealliance';

  console.log(`📡 ANT Process ID: ${antProcessId}`);
  console.log(`🌐 Main ArNS Name: ${mainArnsName}\n`);

  try {
    // Initialize ANT client
    console.log('🔗 Connecting to ANT...');

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
    console.log('📋 Fetching ArNS records from ANT...\n');
    const records = await ant.getRecords();

    const recordEntries = Object.entries(records);
    console.log(`Found ${recordEntries.length} ArNS records\n`);

    if (recordEntries.length === 0) {
      console.log('No ArNS records found. Exiting.');
      return;
    }

    // Get all documents from database
    const docsResult = await pool.query(`
      SELECT cd.id, cd.document_name, cd.document_type, cd.arweave_tx_id, cd.arns_undername,
             lc.case_number
      FROM case_documents cd
      JOIN legal_cases lc ON cd.case_id = lc.id
      ORDER BY lc.case_number, cd.document_type, cd.created_at
    `);
    const documents = docsResult.rows;

    console.log(`Found ${documents.length} documents in database\n`);

    // Stats
    let matched = 0;
    let updated = 0;
    let alreadySet = 0;
    const unmatched: string[] = [];

    console.log('─'.repeat(80));
    console.log('Processing ArNS Records:');
    console.log('─'.repeat(80));

    // Build a mapping of document name patterns to ArNS records
    const arnsByPattern: Record<string, {undername: string, txId: string}[]> = {};

    for (const [undername, record] of recordEntries) {
      const txId = (record as AntRecord).transactionId;

      // Extract patterns from undername for matching
      // Pattern 1: doc1_case_summary -> matches 01_Case_Summary*.pdf
      const docNumMatch = undername.match(/^doc(\d+)_(.+)$/);
      if (docNumMatch) {
        const docNum = docNumMatch[1].padStart(2, '0');
        const pattern = docNumMatch[2].toLowerCase();
        const key = `${docNum}_${pattern}`;
        if (!arnsByPattern[key]) arnsByPattern[key] = [];
        arnsByPattern[key].push({undername, txId});
      }

      // Pattern 2: cr-2025-001-complaint-2 -> matches by case+type+seq
      const caseMatch = undername.match(/^(cr-\d{4}-\d{3})-([a-z]+)(?:-(\d+))?$/i);
      if (caseMatch) {
        const key = `${caseMatch[1].toUpperCase()}_${caseMatch[2]}_${caseMatch[3] || '1'}`;
        if (!arnsByPattern[key]) arnsByPattern[key] = [];
        arnsByPattern[key].push({undername, txId});
      }
    }

    // Process each ArNS record
    for (const [undername, record] of recordEntries) {
      const txId = (record as AntRecord).transactionId;
      const fullUndername = `${undername}_${mainArnsName}`;
      const arnsUrl = `https://${fullUndername}.arweave.net`;

      // Try to find matching document
      // First check if any document already has this arns_undername
      let doc = documents.find(d => d.arns_undername === fullUndername);

      if (!doc) {
        // Try to match by arweave_tx_id
        doc = documents.find(d => d.arweave_tx_id === txId);
      }

      if (!doc) {
        // Try pattern matching based on document name
        // Pattern 1: doc1_case_summary -> 01_Case_Summary*.pdf
        const docNumMatch = undername.match(/^doc(\d+)_(.+)$/);
        if (docNumMatch) {
          const docNum = docNumMatch[1].padStart(2, '0');
          const patternName = docNumMatch[2];

          // First try the specific DOC_NAME_PATTERNS mapping
          const specificPattern = DOC_NAME_PATTERNS[patternName];
          if (specificPattern) {
            doc = documents.find(d =>
              d.case_number === 'CR-2025-002' && // These doc# patterns are for case 002
              specificPattern.test(d.document_name)
            );
          }

          // Fallback to generic pattern matching
          if (!doc) {
            const pattern = patternName.replace(/_/g, '[ _-]?');
            const regex = new RegExp(`^${docNum}[_-].*${pattern}`, 'i');
            doc = documents.find(d => regex.test(d.document_name.replace(/-Final.*$/, '')));
          }
        }
      }

      if (!doc) {
        // Try to parse undername to find matching document by case+type
        // Format: cr-2025-001-complaint or cr-2025-001-evidence-2
        const caseMatch = undername.match(/^(cr-\d{4}-\d{3})-([a-z]+)(?:-(\d+))?$/i);
        if (caseMatch) {
          let caseNumber = caseMatch[1].toUpperCase();
          const docType = caseMatch[2];
          const seq = parseInt(caseMatch[3] || '1', 10);

          // Apply case number migration for old case numbers
          if (CASE_NUMBER_MIGRATION[caseNumber]) {
            caseNumber = CASE_NUMBER_MIGRATION[caseNumber];
          }

          // Find documents for this case with matching type
          const caseDocs = documents.filter(d =>
            d.case_number === caseNumber &&
            !d.arweave_tx_id &&
            d.document_type?.toLowerCase() === docType.toLowerCase()
          );

          // Try to match by sequence
          if (caseDocs.length >= seq) {
            doc = caseDocs[seq - 1];
          }
        }
      }

      // Try matching by fetching Arweave transaction metadata (file name from tags)
      if (!doc) {
        try {
          const metadata = await getTransactionMetadata(txId);
          if (metadata.fileName) {
            // Try exact match first
            doc = documents.find(d =>
              !d.arweave_tx_id &&
              d.document_name === metadata.fileName
            );

            // Try normalized match (case-insensitive, handle spaces/underscores)
            if (!doc) {
              const normalizedTxFileName = metadata.fileName.toLowerCase().replace(/[-_\s]+/g, '');
              doc = documents.find(d => {
                if (d.arweave_tx_id) return false;
                const normalizedDocName = d.document_name.toLowerCase().replace(/[-_\s]+/g, '');
                return normalizedDocName === normalizedTxFileName ||
                       normalizedDocName.includes(normalizedTxFileName) ||
                       normalizedTxFileName.includes(normalizedDocName);
              });
            }
          }
        } catch (error) {
          // Ignore metadata fetch errors
        }
      }

      if (doc) {
        matched++;

        if (doc.arweave_tx_id === txId && doc.arns_undername === fullUndername) {
          alreadySet++;
          console.log(`  ✓ ${undername} → Already synced (${doc.document_name})`);
        } else {
          if (!dryRun) {
            await pool.query(`
              UPDATE case_documents
              SET arweave_tx_id = $1,
                  arns_undername = $2,
                  arns_status = 'active',
                  arns_registered_at = NOW(),
                  arns_url = $3
              WHERE id = $4
            `, [txId, fullUndername, arnsUrl, doc.id]);
          }
          updated++;
          console.log(`  ${dryRun ? '📋' : '✅'} ${undername} → ${doc.document_name}`);
          console.log(`      TX: ${txId}`);
        }
      } else {
        unmatched.push(`${undername} (${txId})`);
        console.log(`  ⚠ ${undername} → No matching document found`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 SYNC SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total ArNS records:     ${recordEntries.length}`);
    console.log(`Matched to documents:   ${matched}`);
    console.log(`  - Already synced:     ${alreadySet}`);
    console.log(`  - Updated:            ${updated}`);
    console.log(`Unmatched records:      ${unmatched.length}`);
    console.log('='.repeat(80));

    if (unmatched.length > 0) {
      console.log('\n⚠ Unmatched ArNS records:');
      console.log('─'.repeat(80));
      for (const record of unmatched) {
        console.log(`  • ${record}`);
      }
      console.log('─'.repeat(80));
    }

    console.log('\n✅ Sync complete!\n');

  } catch (error) {
    console.error('\n💥 Sync failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the sync
syncArnsRecords().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
