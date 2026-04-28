/**
 * Verify Arweave Links
 *
 * Compares document names in the database with the Document-Name/File-Name
 * tags stored in Arweave transactions to identify mismatches.
 *
 * Usage:
 *   npx ts-node src/scripts/verifyArweaveLinks.ts
 *   npx ts-node src/scripts/verifyArweaveLinks.ts --category=evidence
 */

import 'dotenv/config';
import { Pool } from 'pg';
import { loadBitwardenSecrets } from '../services/BitwardenSecretsService';

// Parse command line arguments
const args = process.argv.slice(2);
const categoryFilter = args.find(a => a.startsWith('--category='))?.split('=')[1];

interface DocumentRecord {
  id: string;
  document_name: string;
  document_type: string;
  evidence_category: string | null;
  arweave_tx_id: string;
  arns_undername: string | null;
  case_number: string;
}

interface ArweaveMetadata {
  fileName?: string;
  contentType?: string;
  documentName?: string;
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
      contentType: tags.find(t => t.name === 'Content-Type')?.value,
    };
  } catch (error) {
    console.error(`  Error fetching metadata for ${txId}:`, error);
    return {};
  }
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
 * Main verification function
 */
async function main() {
  console.log('======================================================================');
  console.log('Arweave Link Verification Script');
  console.log('======================================================================\n');

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

  const pool = new Pool(dbConfig);

  try {
    // Build query based on filter
    let query = `
      SELECT cd.id, cd.document_name, cd.document_type, cd.evidence_category,
             cd.arweave_tx_id, cd.arns_undername, lc.case_number
      FROM case_documents cd
      JOIN legal_cases lc ON cd.case_id = lc.id
      WHERE cd.arweave_tx_id IS NOT NULL
    `;

    if (categoryFilter) {
      query += ` AND cd.evidence_category ILIKE '%${categoryFilter}%'`;
    }

    query += ` ORDER BY lc.case_number, cd.document_type, cd.document_name`;

    const result = await pool.query(query);
    const documents: DocumentRecord[] = result.rows;

    console.log(`📋 Checking ${documents.length} documents with Arweave TX IDs`);
    if (categoryFilter) {
      console.log(`   Filter: evidence_category LIKE '%${categoryFilter}%'`);
    }
    console.log('\n' + '─'.repeat(80));

    const mismatches: Array<{
      doc: DocumentRecord;
      arweaveFileName: string;
      issue: string;
    }> = [];

    const matches: DocumentRecord[] = [];
    const noMetadata: DocumentRecord[] = [];

    let processed = 0;

    for (const doc of documents) {
      processed++;
      process.stdout.write(`\r  Checking ${processed}/${documents.length}: ${doc.document_name.substring(0, 40)}...`);

      const metadata = await getArweaveMetadata(doc.arweave_tx_id);
      const arweaveFileName = metadata.documentName || metadata.fileName;

      if (!arweaveFileName) {
        noMetadata.push(doc);
        continue;
      }

      // Compare file names
      const dbNormalized = normalizeFileName(doc.document_name);
      const arNormalized = normalizeFileName(arweaveFileName);

      if (dbNormalized !== arNormalized) {
        // Check if it's a partial match
        const isPartialMatch = dbNormalized.includes(arNormalized) || arNormalized.includes(dbNormalized);

        if (!isPartialMatch) {
          mismatches.push({
            doc,
            arweaveFileName,
            issue: 'File name mismatch',
          });
        } else {
          matches.push(doc);
        }
      } else {
        matches.push(doc);
      }

      // Rate limit to avoid overwhelming Arweave gateway
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\r' + ' '.repeat(80) + '\r');
    console.log('─'.repeat(80));

    // Report results
    console.log('\n' + '='.repeat(80));
    console.log('📊 VERIFICATION RESULTS');
    console.log('='.repeat(80));
    console.log(`Total documents checked:  ${documents.length}`);
    console.log(`✅ Matching:              ${matches.length}`);
    console.log(`❌ Mismatched:            ${mismatches.length}`);
    console.log(`⚠ No metadata:           ${noMetadata.length}`);
    console.log('='.repeat(80));

    if (mismatches.length > 0) {
      console.log('\n❌ MISMATCHED DOCUMENTS:');
      console.log('─'.repeat(80));

      for (const m of mismatches) {
        console.log(`\n📄 ${m.doc.case_number} | ${m.doc.document_name}`);
        console.log(`   DB Name:      ${m.doc.document_name}`);
        console.log(`   Arweave Name: ${m.arweaveFileName}`);
        console.log(`   TX ID:        ${m.doc.arweave_tx_id}`);
        console.log(`   ArNS:         ${m.doc.arns_undername || 'none'}`);
        console.log(`   Category:     ${m.doc.evidence_category || m.doc.document_type}`);
        console.log(`   Issue:        ${m.issue}`);
      }
    }

    if (noMetadata.length > 0) {
      console.log('\n⚠ DOCUMENTS WITHOUT ARWEAVE METADATA:');
      console.log('─'.repeat(80));

      for (const doc of noMetadata) {
        console.log(`  • ${doc.case_number} | ${doc.document_name} (${doc.arweave_tx_id})`);
      }
    }

    console.log('\n');

  } catch (error) {
    console.error('\n💥 Verification failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
