/**
 * Verify Archival Setup
 *
 * Checks that all prerequisites are met before running archival script:
 * - Database connection
 * - Pending documents exist
 * - Document files are accessible
 * - Arweave wallet configured (optional - warns if missing)
 *
 * Usage:
 *   ts-node scripts/verify-setup.ts
 */

import { Pool } from 'pg';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../backend/.env') });

interface DocumentRow {
  id: string;
  case_id: string;
  filename: string;
  storage_path: string;
  arweave_tx_id: string | null;
}

interface CaseRow {
  id: string;
  case_number: string;
  title: string;
}

async function verifySetup(): Promise<void> {
  console.log('🔍 Verifying archival setup...\n');

  const issues: string[] = [];
  const warnings: string[] = [];

  // Check database connection
  console.log('1️⃣  Checking database connection...');
  const pool = new Pool({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    database: process.env.DATABASE_NAME || 'misjustice_dev',
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
  });

  try {
    await pool.query('SELECT 1');
    console.log('   ✅ Database connection successful\n');
  } catch (error) {
    console.error('   ❌ Database connection failed');
    console.error('   Error:', error instanceof Error ? error.message : 'Unknown error');
    issues.push('Database connection failed');
    console.log('');
  }

  // Check for pending documents
  console.log('2️⃣  Checking for pending documents...');
  try {
    const result = await pool.query<DocumentRow>(`
      SELECT id, case_id, filename, storage_path, arweave_tx_id
      FROM documents
      WHERE arweave_tx_id IS NULL
    `);

    const pendingDocs = result.rows;
    console.log(`   ✅ Found ${pendingDocs.length} documents pending archival\n`);

    if (pendingDocs.length === 0) {
      warnings.push('No documents pending archival');
    }

    // Check file accessibility
    if (pendingDocs.length > 0) {
      console.log('3️⃣  Checking document file accessibility...');
      let accessibleCount = 0;
      let missingCount = 0;

      for (const doc of pendingDocs) {
        const fullPath = path.resolve(__dirname, '../..', doc.storage_path);

        try {
          await fs.access(fullPath, fs.constants.R_OK);
          accessibleCount++;
        } catch (error) {
          console.error(`   ❌ Cannot read: ${doc.filename}`);
          console.error(`      Path: ${fullPath}`);
          missingCount++;
          issues.push(`Missing file: ${doc.filename}`);
        }
      }

      console.log(`   ✅ ${accessibleCount} files accessible`);
      if (missingCount > 0) {
        console.log(`   ❌ ${missingCount} files missing or unreadable`);
      }
      console.log('');
    }

    // List cases
    if (pendingDocs.length > 0) {
      console.log('4️⃣  Cases with pending documents:');
      const caseIds = [...new Set(pendingDocs.map((d: DocumentRow) => d.case_id))];

      for (const caseId of caseIds) {
        const caseResult = await pool.query<CaseRow>(`
          SELECT id, case_number, title
          FROM cases
          WHERE id = $1
        `, [caseId]);

        if (caseResult.rows.length > 0) {
          const caseData = caseResult.rows[0];
          const caseDocCount = pendingDocs.filter((d: DocumentRow) => d.case_id === caseId).length;
          console.log(`   📁 ${caseData.case_number}: ${caseData.title}`);
          console.log(`      ${caseDocCount} documents pending`);
        } else {
          console.error(`   ❌ Case ${caseId} not found in database`);
          issues.push(`Orphaned documents for case ${caseId}`);
        }
      }
      console.log('');
    }

  } catch (error) {
    console.error('   ❌ Failed to query documents');
    console.error('   Error:', error instanceof Error ? error.message : 'Unknown error');
    issues.push('Failed to query pending documents');
    console.log('');
  }

  // Check Arweave wallet configuration
  console.log('5️⃣  Checking Arweave wallet configuration...');
  const walletPath = process.env.ARWEAVE_WALLET_PATH;
  const walletKey = process.env.ARWEAVE_WALLET_KEY;

  if (!walletPath && !walletKey) {
    console.log('   ⚠️  No Arweave wallet configured');
    console.log('      Set ARWEAVE_WALLET_PATH or ARWEAVE_WALLET_KEY');
    console.log('      Archival will fail without a wallet');
    warnings.push('No Arweave wallet configured');
  } else if (walletPath) {
    try {
      await fs.access(walletPath, fs.constants.R_OK);
      console.log(`   ✅ Wallet file found: ${walletPath}`);

      // Try to read and parse wallet
      const walletContent = await fs.readFile(walletPath, 'utf-8');
      JSON.parse(walletContent);
      console.log('   ✅ Wallet file is valid JSON');
    } catch (error) {
      console.error('   ❌ Wallet file error');
      console.error('   Error:', error instanceof Error ? error.message : 'Unknown error');
      issues.push('Invalid or inaccessible wallet file');
    }
  } else if (walletKey) {
    try {
      JSON.parse(walletKey);
      console.log('   ✅ Wallet key is valid JSON');
    } catch (error) {
      console.error('   ❌ Wallet key is not valid JSON');
      issues.push('Invalid ARWEAVE_WALLET_KEY format');
    }
  }
  console.log('');

  // Summary
  console.log('='.repeat(60));
  console.log('📊 Verification Summary');
  console.log('='.repeat(60));

  if (issues.length === 0 && warnings.length === 0) {
    console.log('✅ All checks passed!');
    console.log('   System is ready for archival.');
    console.log('\nNext step:');
    console.log('   ts-node scripts/archive-documents.ts');
  } else {
    if (issues.length > 0) {
      console.log(`❌ ${issues.length} issue(s) found:\n`);
      issues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue}`);
      });
      console.log('\nFix these issues before running archival script.');
    }

    if (warnings.length > 0) {
      console.log(`\n⚠️  ${warnings.length} warning(s):\n`);
      warnings.forEach((warning, i) => {
        console.log(`   ${i + 1}. ${warning}`);
      });
      console.log('\nWarnings are non-critical but should be addressed.');
    }
  }
  console.log('='.repeat(60));

  await pool.end();
}

// Run verification
verifySetup().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
