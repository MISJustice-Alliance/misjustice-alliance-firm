/**
 * Seed Cases from JSON Script
 * Directly loads case JSON files and populates the database
 *
 * Usage:
 *   npx ts-node src/scripts/seedCasesFromJSON.ts
 */

import 'dotenv/config';
import { Pool } from 'pg';
import fs from 'fs/promises';
import path from 'path';
import { loadBitwardenSecrets } from '../services/BitwardenSecretsService';

let pool: Pool;

interface CaseJSON {
  case: {
    title: string;
    description: string;
    status: string;
    jurisdiction: string;
    case_type: string;
    date_filed: string;
    plaintiff_name: string;
    defendant_name: string;
    outcome: string;
    notes?: string;
  };
  extended_metadata?: {
    case_number: string;
    damages_claimed?: number;
    tags?: string[];
    [key: string]: any;
  };
}

/**
 * Find all case JSON files
 */
async function findCaseFiles(): Promise<string[]> {
  const casesDir = '/opt/legal-advocacy-web/content-archive/content-archive/02-platform-ready/cases';
  try {
    const files = await fs.readdir(casesDir);
    return files
      .filter((f) => f.endsWith('.json'))
      .map((f) => path.join(casesDir, f));
  } catch (error) {
    console.error(`Error reading cases directory: ${error}`);
    return [];
  }
}

/**
 * Map case status to valid database values
 */
function mapStatus(status: string): string {
  const validStatuses = [
    'intake',
    'research',
    'pleadings',
    'discovery',
    'motions',
    'trial',
    'appeal',
    'settled',
    'closed',
  ];

  const normalized = status?.toLowerCase() || 'intake';

  // If status is already valid, return it
  if (validStatuses.includes(normalized)) {
    return normalized;
  }

  // Map common alternative values
  const statusMap: Record<string, string> = {
    open: 'intake',
    pending: 'intake',
    active: 'discovery',
    resolved: 'closed',
    filed: 'pleadings',
  };

  return statusMap[normalized] || 'intake';
}

/**
 * Insert a case into the database
 */
async function insertCase(caseData: CaseJSON): Promise<string> {
  const { case: caseInfo, extended_metadata } = caseData;

  const query = `
    INSERT INTO legal_cases (
      case_number,
      plaintiff,
      defendant,
      jurisdiction,
      status,
      filed_date,
      case_facts
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id
  `;

  const caseNumber = extended_metadata?.case_number || `CASE-${Date.now()}`;
  const filedDate = caseInfo.date_filed ? new Date(caseInfo.date_filed) : null;
  const mappedStatus = mapStatus(caseInfo.status);

  const values = [
    caseNumber,
    caseInfo.plaintiff_name || 'Unknown Plaintiff',
    caseInfo.defendant_name || 'Unknown Defendant',
    caseInfo.jurisdiction || 'Unknown Jurisdiction',
    mappedStatus,
    filedDate,
    caseInfo.description || caseInfo.title,
  ];

  try {
    const result = await pool.query(query, values);
    return result.rows[0].id;
  } catch (error) {
    console.error(`Database insert error: ${error}`);
    throw error;
  }
}

/**
 * Main seed function
 */
async function seedCases(): Promise<void> {
  let casesCreated = 0;
  const errors: string[] = [];

  try {
    console.log('🌱 Starting case data seeding from JSON files...\n');

    const caseFiles = await findCaseFiles();
    console.log(`📂 Found ${caseFiles.length} case JSON files\n`);

    if (caseFiles.length === 0) {
      console.warn('⚠️  No case JSON files found!');
      return;
    }

    // Clear existing data
    console.log('🗑️  Clearing existing case data...');
    await pool.query('DELETE FROM case_documents');
    await pool.query('DELETE FROM legal_cases');
    console.log('✅ Existing data cleared\n');

    // Process each case file
    for (const filePath of caseFiles) {
      try {
        const fileName = path.basename(filePath);
        console.log(`📁 Processing ${fileName}...`);

        const content = await fs.readFile(filePath, 'utf-8');
        const caseData = JSON.parse(content) as CaseJSON;

        const caseId = await insertCase(caseData);
        casesCreated++;
        console.log(`   ✅ Case created (ID: ${caseId})\n`);
      } catch (error) {
        const errorMsg = `Failed to process ${path.basename(filePath)}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(`   ❌ ${errorMsg}\n`);
        errors.push(errorMsg);
      }
    }

    console.log('📊 Seeding Summary');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Cases created:     ${casesCreated}`);
    console.log(`❌ Errors:            ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error}`);
      });
    }

    console.log('\n🎉 Seeding complete!\n');
  } catch (error) {
    console.error('\n💥 Seeding failed:', error);
    throw error;
  }
}

/**
 * Run the seed script
 */
async function main(): Promise<void> {
  try {
    // Load Bitwarden secrets if available
    const bwAccessToken = process.env.BW_ACCESS_TOKEN;
    const bwProjectId = process.env.BW_PROJECT_ID;

    if (bwAccessToken && bwProjectId) {
      console.log('🔐 Loading secrets from Bitwarden...');
      await loadBitwardenSecrets(bwAccessToken, bwProjectId);
      console.log('✅ Bitwarden secrets loaded\n');
    }

    // Initialize database pool
    pool = new Pool({
      host: process.env.DATABASE_HOST || 'postgres',
      port: parseInt(process.env.DATABASE_PORT || '5432', 10),
      database: process.env.DATABASE_NAME || 'misjustice_dev',
      user: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'postgres',
    });

    await seedCases();
  } catch (error) {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  } finally {
    await pool?.end();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { seedCases };
