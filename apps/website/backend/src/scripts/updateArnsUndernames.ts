/**
 * Update ArNS Undernames to New TX IDs
 *
 * Updates existing ArNS undername records to point to new Arweave transaction IDs.
 * Used when documents have been re-uploaded to Arweave and undernames need updating.
 *
 * Usage:
 *   npx ts-node src/scripts/updateArnsUndernames.ts
 *   npx ts-node src/scripts/updateArnsUndernames.ts --dry-run
 */

import 'dotenv/config';
import { Pool } from 'pg';
import { ArnsService } from '../services/ArnsService';
import { DocumentRepository } from '../repositories/DocumentRepository';
import { loadBitwardenSecrets } from '../services/BitwardenSecretsService';

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

// Undernames that need to be updated with new TX IDs
const UPDATES: Array<{ undername: string; newTxId: string; documentName: string }> = [
  {
    undername: 'cr-2025-003-complaint-4',
    newTxId: 'LtpoZ8c2hBC4r3ihxMTjdwHCEKk5fdKy31QDhuX92Sk',
    documentName: '01-ODC-No-25-147-Bryan-Tipp.pdf',
  },
  {
    undername: 'cr-2025-001-evidence-10',
    newTxId: 'PFbeLa9BeIFzYtDcEVSw4R9lIU-unOc7faqemqn_b_E',
    documentName: 'Arthur-Brown-Google-Review.jpeg',
  },
  {
    undername: 'cr-2025-002-evidence-19',
    newTxId: 'gnAB-YiJrdoFP2X3lyyf17Lj-0KpsA1DQsljwSs07xE',
    documentName: 'nuno-ywca-google-review01.jpeg',
  },
];

async function main() {
  console.log('======================================================================');
  console.log('Update ArNS Undernames Script');
  console.log('======================================================================');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  // Capture database config from Docker environment BEFORE loading Bitwarden
  const dbConfig = {
    user: process.env.DATABASE_USER || process.env.PGUSER || 'postgres',
    host: process.env.DATABASE_HOST || process.env.PGHOST || 'postgres',
    database: process.env.DATABASE_NAME || process.env.PGDATABASE || 'misjustice_dev',
    password: process.env.DATABASE_PASSWORD || process.env.PGPASSWORD || 'postgres',
    port: parseInt(process.env.DATABASE_PORT || process.env.PGPORT || '5432', 10),
  };

  // Load Bitwarden secrets
  const bwAccessToken = process.env.BW_ACCESS_TOKEN;
  const bwProjectId = process.env.BW_PROJECT_ID;

  if (bwAccessToken && bwProjectId) {
    console.log('🔐 Loading secrets from Bitwarden...');
    await loadBitwardenSecrets(bwAccessToken, bwProjectId);
    console.log('✅ Bitwarden secrets loaded\n');
  }

  // Initialize database connection and repositories
  const pool = new Pool(dbConfig);
  const documentRepository = new DocumentRepository(pool);

  // Get ArNS config from environment
  const antProcessId = process.env.ANT_PROCESS_ID || 'iBwPYGTN04CpGT65CKfHGEeekTyzRjP2TtCUIlk96eM';
  const mainArnsName = process.env.MAIN_ARNS_NAME || 'misjusticealliance';

  console.log(`📡 ANT Process ID: ${antProcessId}`);
  console.log(`🌐 Main ArNS Name: ${mainArnsName}\n`);

  // Initialize ArNS service with document repository
  const arnsService = new ArnsService(documentRepository);

  console.log('─'.repeat(70));
  console.log('Updating ArNS Undernames:');
  console.log('─'.repeat(70));

  let updated = 0;
  let failed = 0;

  for (const update of UPDATES) {
    console.log(`\n📝 ${update.undername}`);
    console.log(`   Document: ${update.documentName}`);
    console.log(`   New TX: ${update.newTxId}`);

    if (dryRun) {
      console.log(`   📋 Would update undername to point to new TX`);
      updated++;
      continue;
    }

    try {
      const result = await arnsService.updateUndername(update.undername, update.newTxId);
      console.log(`   ✅ Updated successfully!`);
      console.log(`   🔗 URL: ${result.url}`);
      console.log(`   📜 Registration TX: ${result.txId}`);
      updated++;
    } catch (error) {
      console.log(`   ❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 UPDATE SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total undernames:  ${UPDATES.length}`);
  console.log(`Updated:           ${updated}`);
  console.log(`Failed:            ${failed}`);
  console.log('='.repeat(70));

  if (failed > 0) {
    console.log('\n⚠ Some updates failed. Check logs above for details.');
    await pool.end();
    process.exit(1);
  }

  console.log('\n✅ All undernames updated successfully!\n');
  await pool.end();
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
