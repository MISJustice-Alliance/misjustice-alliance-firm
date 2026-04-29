/**
 * Fix Arweave TX IDs
 *
 * Dynamically detects documents where the database TX ID points to wrong content
 * by comparing document names with Arweave metadata, then searches for the correct
 * TX ID and updates the database.
 *
 * This script is idempotent and can be run repeatedly.
 *
 * Usage:
 *   npx ts-node src/scripts/fixArweaveTxIds.ts
 *   npx ts-node src/scripts/fixArweaveTxIds.ts --dry-run
 *   npx ts-node src/scripts/fixArweaveTxIds.ts --case=CR-2025-002
 */

import 'dotenv/config';
import { Pool } from 'pg';
import Arweave from 'arweave';
import { loadBitwardenSecrets } from '../services/BitwardenSecretsService';

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const caseFilter = args.find(a => a.startsWith('--case='))?.split('=')[1];

interface DocumentRecord {
  id: string;
  document_name: string;
  arweave_tx_id: string;
  case_number: string;
}

interface ArweaveMetadata {
  documentName?: string;
  fileName?: string;
}

/**
 * Fetch transaction metadata from Arweave GraphQL
 */
async function getArweaveMetadata(txId: string): Promise<ArweaveMetadata> {
  try {
    const response = await fetch('https://arweave.net/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query {
          transaction(id: "${txId}") {
            tags { name value }
          }
        }`
      }),
    });

    const data = await response.json() as {
      data?: {
        transaction?: {
          tags?: Array<{ name: string; value: string }>
        }
      }
    };

    const tags = data?.data?.transaction?.tags || [];

    return {
      documentName: tags.find(t => t.name === 'Document-Name')?.value,
      fileName: tags.find(t => t.name === 'File-Name')?.value
        || tags.find(t => t.name === 'Title')?.value,
    };
  } catch (error) {
    return {};
  }
}

/**
 * Search for document by name from our wallet
 */
async function searchByOwnerAndName(
  fileName: string,
  ownerAddress: string
): Promise<string | null> {
  // Try Document-Name tag first
  const tagNames = ['Document-Name', 'File-Name', 'Title'];

  for (const tagName of tagNames) {
    try {
      const response = await fetch('https://arweave.net/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `query {
            transactions(
              owners: ["${ownerAddress}"]
              tags: [{ name: "${tagName}", values: ["${fileName}"] }]
              first: 5
            ) {
              edges {
                node { id }
              }
            }
          }`
        }),
      });

      const data = await response.json() as {
        data?: {
          transactions?: {
            edges?: Array<{ node: { id: string } }>;
          };
        };
      };

      const edges = data?.data?.transactions?.edges || [];
      if (edges.length > 0) {
        return edges[0].node.id;
      }
    } catch (error) {
      // Continue to next tag name
    }
  }

  return null;
}

/**
 * Normalize file name for comparison
 */
function normalizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[-_\s]+/g, '')
    .replace(/\.[^.]+$/, ''); // Remove extension
}

/**
 * Get wallet address from keyfile
 */
async function getWalletAddress(): Promise<string | null> {
  const keyfile = process.env.ARWEAVE_KEYFILE;
  if (!keyfile) return null;

  try {
    const jwk = JSON.parse(keyfile);
    const arweave = Arweave.init({
      host: 'arweave.net',
      port: 443,
      protocol: 'https',
    });
    return await arweave.wallets.jwkToAddress(jwk);
  } catch (error) {
    return null;
  }
}

async function main() {
  console.log('======================================================================');
  console.log('Fix Arweave TX IDs');
  console.log('======================================================================');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
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

  // Get wallet address
  const ownerAddress = await getWalletAddress();
  if (!ownerAddress) {
    console.error('❌ Could not determine wallet address from ARWEAVE_KEYFILE');
    process.exit(1);
  }
  console.log(`📍 Wallet address: ${ownerAddress}\n`);

  const pool = new Pool(dbConfig);

  try {
    // Build query
    let query = `
      SELECT cd.id, cd.document_name, cd.arweave_tx_id, lc.case_number
      FROM case_documents cd
      JOIN legal_cases lc ON cd.case_id = lc.id
      WHERE cd.arweave_tx_id IS NOT NULL
    `;

    if (caseFilter) {
      query += ` AND lc.case_number = '${caseFilter}'`;
    }

    query += ` ORDER BY lc.case_number, cd.document_name`;

    const result = await pool.query(query);
    const documents: DocumentRecord[] = result.rows;

    console.log(`📋 Checking ${documents.length} documents with Arweave TX IDs`);
    if (caseFilter) {
      console.log(`   Filter: case_number = '${caseFilter}'`);
    }
    console.log('\n' + '─'.repeat(70));

    // Phase 1: Detect mismatches
    console.log('\n📖 Phase 1: Detecting mismatches...\n');

    interface Mismatch {
      doc: DocumentRecord;
      arweaveFileName: string;
    }

    const mismatches: Mismatch[] = [];
    const matches: DocumentRecord[] = [];
    const noMetadata: DocumentRecord[] = [];

    let processed = 0;

    for (const doc of documents) {
      processed++;
      process.stdout.write(`\r  Checking ${processed}/${documents.length}: ${doc.document_name.substring(0, 40).padEnd(40)}...`);

      const metadata = await getArweaveMetadata(doc.arweave_tx_id);
      const arweaveFileName = metadata.documentName || metadata.fileName;

      if (!arweaveFileName) {
        noMetadata.push(doc);
        continue;
      }

      // Compare normalized names
      const dbNormalized = normalizeFileName(doc.document_name);
      const arNormalized = normalizeFileName(arweaveFileName);

      if (dbNormalized !== arNormalized) {
        // Check for partial match
        const isPartialMatch = dbNormalized.includes(arNormalized) || arNormalized.includes(dbNormalized);
        if (!isPartialMatch) {
          mismatches.push({ doc, arweaveFileName });
        } else {
          matches.push(doc);
        }
      } else {
        matches.push(doc);
      }

      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\r' + ' '.repeat(80) + '\r');
    console.log('─'.repeat(70));

    console.log('\n📊 DETECTION RESULTS');
    console.log('─'.repeat(70));
    console.log(`✅ Matching:     ${matches.length}`);
    console.log(`❌ Mismatched:   ${mismatches.length}`);
    console.log(`⚠️  No metadata:  ${noMetadata.length}`);
    console.log('─'.repeat(70));

    if (mismatches.length === 0) {
      console.log('\n✅ All Arweave TX IDs are correct!\n');
      await pool.end();
      return;
    }

    // Phase 2: Find correct TX IDs
    console.log('\n🔍 Phase 2: Searching for correct TX IDs...\n');

    interface Fix {
      doc: DocumentRecord;
      wrongTxId: string;
      correctTxId: string;
    }

    const fixes: Fix[] = [];
    const notFound: Mismatch[] = [];

    for (const mismatch of mismatches) {
      process.stdout.write(`\r  Searching: ${mismatch.doc.document_name.substring(0, 50).padEnd(50)}...`);

      const correctTxId = await searchByOwnerAndName(mismatch.doc.document_name, ownerAddress);

      if (correctTxId && correctTxId !== mismatch.doc.arweave_tx_id) {
        fixes.push({
          doc: mismatch.doc,
          wrongTxId: mismatch.doc.arweave_tx_id,
          correctTxId,
        });
        console.log(`\r  ✅ Found: ${mismatch.doc.document_name}`);
        console.log(`     Wrong TX:   ${mismatch.doc.arweave_tx_id}`);
        console.log(`     Correct TX: ${correctTxId}\n`);
      } else {
        notFound.push(mismatch);
        console.log(`\r  ⚠️  Not found: ${mismatch.doc.document_name}`);
      }

      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('\n' + '─'.repeat(70));

    // Phase 3: Apply fixes
    if (fixes.length > 0) {
      console.log(`\n📝 Phase 3: Applying ${fixes.length} fixes to database...`);

      let fixed = 0;
      let failed = 0;

      for (const fix of fixes) {
        if (dryRun) {
          console.log(`  📋 Would fix: ${fix.doc.document_name}`);
          console.log(`     ${fix.wrongTxId} → ${fix.correctTxId}`);
          fixed++;
        } else {
          try {
            await pool.query(
              `UPDATE case_documents SET arweave_tx_id = $1 WHERE id = $2`,
              [fix.correctTxId, fix.doc.id]
            );
            console.log(`  ✅ Fixed: ${fix.doc.document_name}`);
            console.log(`     ${fix.wrongTxId} → ${fix.correctTxId}`);
            fixed++;
          } catch (error) {
            console.log(`  ❌ Failed: ${fix.doc.document_name}`);
            failed++;
          }
        }
      }

      console.log('\n' + '='.repeat(70));
      console.log('📊 FIX SUMMARY');
      console.log('='.repeat(70));
      console.log(`Mismatches detected: ${mismatches.length}`);
      console.log(`Correct TX found:    ${fixes.length}`);
      console.log(`Fixed:               ${fixed}`);
      console.log(`Failed:              ${failed}`);
      console.log(`Not found:           ${notFound.length}`);
      console.log('='.repeat(70));
    }

    if (notFound.length > 0) {
      console.log('\n⚠️  Documents not found on Arweave (may need re-upload):');
      for (const m of notFound) {
        console.log(`  • ${m.doc.case_number} | ${m.doc.document_name}`);
        console.log(`    Currently points to: ${m.arweaveFileName}`);
      }
    }

    console.log('\n');

  } catch (error) {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
