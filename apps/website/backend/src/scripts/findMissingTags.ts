/**
 * Find Documents Missing Proper Tags
 *
 * Identifies documents uploaded via ArDrive or other tools that are
 * missing our standard Document-Name tags.
 */

import 'dotenv/config';
import { Pool } from 'pg';
import { loadBitwardenSecrets } from '../services/BitwardenSecretsService';

async function main() {
  console.log('======================================================================');
  console.log('Find Documents Missing Tags');
  console.log('======================================================================\n');

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

  const pool = new Pool(dbConfig);

  try {
    const result = await pool.query(`
      SELECT cd.id, cd.document_name, cd.arweave_tx_id, cd.file_path, lc.case_number
      FROM case_documents cd
      JOIN legal_cases lc ON cd.case_id = lc.id
      WHERE cd.arweave_tx_id IS NOT NULL
      ORDER BY lc.case_number, cd.document_name
    `);

    console.log(`📋 Checking ${result.rows.length} documents for missing tags...\n`);

    interface MissingDoc {
      id: string;
      documentName: string;
      txId: string;
      filePath: string;
      caseNumber: string;
      appName: string;
    }

    const missingTags: MissingDoc[] = [];
    let checked = 0;

    for (const doc of result.rows) {
      checked++;
      process.stdout.write(`\r  Checking ${checked}/${result.rows.length}...`);

      const response = await fetch('https://arweave.net/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `query { transaction(id: "${doc.arweave_tx_id}") { tags { name value } } }`
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
      const hasDocName = tags.some(t => t.name === 'Document-Name');
      const appName = tags.find(t => t.name === 'App-Name')?.value || 'unknown';

      if (!hasDocName) {
        missingTags.push({
          id: doc.id,
          documentName: doc.document_name,
          txId: doc.arweave_tx_id,
          filePath: doc.file_path,
          caseNumber: doc.case_number,
          appName,
        });
      }

      await new Promise(r => setTimeout(r, 50));
    }

    console.log('\r' + ' '.repeat(50) + '\r');
    console.log('─'.repeat(70));
    console.log('\n📊 RESULTS');
    console.log('─'.repeat(70));
    console.log(`Total documents:        ${result.rows.length}`);
    console.log(`Missing Document-Name:  ${missingTags.length}`);
    console.log('─'.repeat(70));

    if (missingTags.length > 0) {
      console.log('\n📄 Documents needing re-upload:\n');
      for (const doc of missingTags) {
        console.log(`  ${doc.caseNumber} | ${doc.documentName}`);
        console.log(`    TX: ${doc.txId}`);
        console.log(`    App: ${doc.appName}`);
        console.log(`    Path: ${doc.filePath || 'no file path'}`);
        console.log('');
      }
    }

    console.log('\n');

  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
