/**
 * Fix ArNS Mismatches
 *
 * Compares ArNS undername records in the ANT with database TX IDs
 * and updates any mismatches so ArNS URLs point to correct documents.
 *
 * This script is idempotent and can be run repeatedly.
 *
 * Usage:
 *   npx ts-node src/scripts/fixArnsMismatches.ts
 *   npx ts-node src/scripts/fixArnsMismatches.ts --dry-run
 *   npx ts-node src/scripts/fixArnsMismatches.ts --case=CR-2025-002
 */

import 'dotenv/config';
import { Pool } from 'pg';
import { ANT } from '@ar.io/sdk';
import { loadBitwardenSecrets } from '../services/BitwardenSecretsService';
import { ArnsService } from '../services/ArnsService';
import { DocumentRepository } from '../repositories/DocumentRepository';

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const caseFilter = args.find(a => a.startsWith('--case='))?.split('=')[1];

interface Mismatch {
  documentName: string;
  undername: string;
  dbTxId: string;
  antTxId: string;
  documentId: string;
}

async function main() {
  console.log('======================================================================');
  console.log('Fix ArNS Mismatches');
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

  // Get ANT process ID from environment
  const antProcessId = process.env.ANT_PROCESS_ID || 'iBwPYGTN04CpGT65CKfHGEeekTyzRjP2TtCUIlk96eM';
  const mainArnsName = process.env.MAIN_ARNS_NAME || 'misjusticealliance';

  console.log(`📡 ANT Process ID: ${antProcessId}`);
  console.log(`🌐 Main ArNS Name: ${mainArnsName}\n`);

  const pool = new Pool(dbConfig);

  try {
    // Initialize ANT for reading records
    console.log('📖 Fetching ANT records...');
    const ant = ANT.init({ processId: antProcessId });
    const antRecords = await ant.getRecords();
    console.log(`   Found ${Object.keys(antRecords).length} ANT records\n`);

    // Build query based on filter
    let query = `
      SELECT cd.id, cd.document_name, cd.arweave_tx_id, cd.arns_undername, lc.case_number
      FROM case_documents cd
      JOIN legal_cases lc ON cd.case_id = lc.id
      WHERE cd.arns_undername IS NOT NULL
        AND cd.arweave_tx_id IS NOT NULL
    `;

    if (caseFilter) {
      query += ` AND lc.case_number = '${caseFilter}'`;
    }

    query += ` ORDER BY cd.arns_undername`;

    const result = await pool.query(query);
    console.log(`📋 Checking ${result.rows.length} documents with ArNS undernames`);
    if (caseFilter) {
      console.log(`   Filter: case_number = '${caseFilter}'`);
    }
    console.log('');

    // Find mismatches
    const mismatches: Mismatch[] = [];
    const matches: string[] = [];
    const notInAnt: string[] = [];

    for (const doc of result.rows) {
      // Extract just the undername part (before _misjusticealliance or similar suffix)
      const fullUndername = doc.arns_undername as string;
      const undername = fullUndername.replace(/_[^_]+$/, ''); // Remove suffix like _misjusticealliance

      const antRecord = antRecords[undername];

      if (!antRecord) {
        notInAnt.push(doc.document_name);
        continue;
      }

      if (antRecord.transactionId !== doc.arweave_tx_id) {
        mismatches.push({
          documentName: doc.document_name,
          undername: undername,
          dbTxId: doc.arweave_tx_id,
          antTxId: antRecord.transactionId,
          documentId: doc.id,
        });
      } else {
        matches.push(doc.document_name);
      }
    }

    // Report findings
    console.log('─'.repeat(70));
    console.log('📊 ANALYSIS RESULTS');
    console.log('─'.repeat(70));
    console.log(`✅ Matching:        ${matches.length}`);
    console.log(`❌ Mismatched:      ${mismatches.length}`);
    console.log(`⚠️  Not in ANT:      ${notInAnt.length}`);
    console.log('─'.repeat(70));

    if (mismatches.length === 0) {
      console.log('\n✅ All ArNS undernames are correctly configured!\n');
      await pool.end();
      return;
    }

    // Show mismatches
    console.log('\n❌ MISMATCHED UNDERNAMES:');
    console.log('─'.repeat(70));

    for (const m of mismatches) {
      console.log(`\n📄 ${m.documentName}`);
      console.log(`   Undername: ${m.undername}`);
      console.log(`   DB TX:     ${m.dbTxId}`);
      console.log(`   ANT TX:    ${m.antTxId} (WRONG)`);
    }

    if (dryRun) {
      console.log('\n📋 DRY RUN - Would update ' + mismatches.length + ' undernames');
      console.log('\nRun without --dry-run to apply fixes.\n');
      return;
    }

    // Fix mismatches
    console.log('\n' + '='.repeat(70));
    console.log('🔧 FIXING MISMATCHES');
    console.log('='.repeat(70));

    // Initialize ArNS service for updates
    const documentRepository = new DocumentRepository(pool);
    const arnsService = new ArnsService(documentRepository);

    let fixed = 0;
    let failed = 0;

    for (const m of mismatches) {
      console.log(`\n📝 Updating ${m.undername}...`);
      console.log(`   → ${m.dbTxId}`);

      try {
        const updateResult = await arnsService.updateUndername(m.undername, m.dbTxId);
        console.log(`   ✅ Updated! TX: ${updateResult.txId}`);
        fixed++;
      } catch (error) {
        console.log(`   ❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        failed++;
      }

      // Rate limit to avoid overwhelming AO
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 FIX SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total mismatches:  ${mismatches.length}`);
    console.log(`Fixed:             ${fixed}`);
    console.log(`Failed:            ${failed}`);
    console.log('='.repeat(70));

    if (failed > 0) {
      console.log('\n⚠️  Some updates failed. Check logs above for details.');
      await pool.end();
      process.exit(1);
    }

    console.log('\n✅ All ArNS mismatches fixed successfully!\n');

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
