/**
 * Seed Cases Script
 * Populates the database with real case data from content-archive/cases-pending
 *
 * Usage:
 *   npm run seed:cases
 *   or: ts-node src/scripts/seedCases.ts
 *
 * Following Clean Architecture:
 * - Uses ContentScanner for infrastructure (file system)
 * - Uses DocumentAnalyzer for domain logic (metadata generation)
 * - Direct database access for data persistence
 */

import 'dotenv/config';
import { Pool } from 'pg';
import fs from 'fs/promises';
import path from 'path';
import { ContentScanner } from './utils/ContentScanner';
import {
  DocumentAnalyzer,
  type CaseMapping,
  type EnrichedDocument,
} from './utils/DocumentAnalyzer';
import { loadBitwardenSecrets } from '../services/BitwardenSecretsService';

// Database configuration - will be initialized after loading secrets
let pool: Pool;

interface SeedStats {
  casesCreated: number;
  documentsCreated: number;
  errors: string[];
}

/**
 * Load case mappings from JSON file
 */
async function loadCaseMappings(): Promise<Record<string, CaseMapping>> {
  const mappingsPath = path.join(__dirname, './data/caseMappings.json');
  const content = await fs.readFile(mappingsPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Insert a case into the database
 */
async function insertCase(caseData: CaseMapping): Promise<string> {
  const query = `
    INSERT INTO legal_cases (
      case_number,
      plaintiff,
      plaintiff_anon,
      defendant,
      jurisdiction,
      status,
      filed_date,
      case_facts,
      causes_of_action
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id
  `;

  const values = [
    caseData.caseNumber,
    caseData.plaintiff,
    caseData.plaintiffAnon || null,
    caseData.defendant,
    caseData.jurisdiction,
    caseData.status,
    caseData.filedDate || null,
    caseData.caseSummary || null, // Use case summary as case_facts
    caseData.causesOfAction || null,
  ];

  const result = await pool.query(query, values);
  return result.rows[0].id;
}

/**
 * Insert a document into the database
 */
async function insertDocument(
  caseId: string,
  enrichedDoc: EnrichedDocument
): Promise<string> {
  const query = `
    INSERT INTO case_documents (
      case_id,
      document_type,
      document_name,
      file_path
    ) VALUES ($1, $2, $3, $4)
    RETURNING id
  `;

  const values = [
    caseId,
    enrichedDoc.documentType,
    enrichedDoc.fileName,
    enrichedDoc.filePath,
  ];

  const result = await pool.query(query, values);
  return result.rows[0].id;
}

/**
 * Clear existing case data from the database
 */
async function clearExistingData(): Promise<void> {
  console.log('🗑️  Clearing existing case data...');

  // Delete in correct order due to foreign key constraints
  await pool.query('DELETE FROM case_documents');
  await pool.query('DELETE FROM legal_cases');

  console.log('✅ Existing data cleared');
}

/**
 * Main seed function
 */
async function seedCases(): Promise<SeedStats> {
  const stats: SeedStats = {
    casesCreated: 0,
    documentsCreated: 0,
    errors: [],
  };

  try {
    console.log('🌱 Starting case data seeding...\n');

    // Initialize utilities
    const scanner = new ContentScanner();
    const analyzer = new DocumentAnalyzer();
    const caseMappings = await loadCaseMappings();

    console.log('📂 Scanning case directories...');
    const caseDirectories = await scanner.scanCasesDirectory();
    console.log(`   Found ${caseDirectories.length} case directories\n`);

    // Clear existing data
    await clearExistingData();
    console.log();

    // Process each case directory
    for (const caseDir of caseDirectories) {
      try {
        console.log(`📁 Processing case: ${caseDir.name}`);

        // Get case mapping
        const caseMapping = caseMappings[caseDir.name];
        if (!caseMapping) {
          const error = `No mapping found for case: ${caseDir.name}`;
          console.error(`   ❌ ${error}`);
          stats.errors.push(error);
          continue;
        }

        // Insert case
        const caseId = await insertCase(caseMapping);
        stats.casesCreated++;
        console.log(`   ✅ Case created (ID: ${caseId})`);

        // Process documents
        console.log(`   📄 Processing ${caseDir.documents.length} documents...`);
        for (const doc of caseDir.documents) {
          try {
            // Analyze document with case mappings
            const enrichedDoc = await analyzer.analyzeDocument(doc, caseMapping);

            // Insert document
            const docId = await insertDocument(caseId, enrichedDoc);
            stats.documentsCreated++;

            console.log(
              `      • ${doc.fileName} (${enrichedDoc.documentType}) - ID: ${docId}`
            );
          } catch (error) {
            const errorMsg = `Failed to process document ${doc.fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            console.error(`      ❌ ${errorMsg}`);
            stats.errors.push(errorMsg);
          }
        }

        console.log(); // Blank line between cases
      } catch (error) {
        const errorMsg = `Failed to process case ${caseDir.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(`   ❌ ${errorMsg}\n`);
        stats.errors.push(errorMsg);
      }
    }

    return stats;
  } catch (error) {
    console.error('💥 Fatal error during seeding:', error);
    throw error;
  }
}

/**
 * Run the seed script
 */
async function main(): Promise<void> {
  try {
    // Load Bitwarden secrets first
    const bwAccessToken = process.env.BW_ACCESS_TOKEN;
    const bwProjectId = process.env.BW_PROJECT_ID;

    if (bwAccessToken && bwProjectId) {
      console.log('🔐 Loading secrets from Bitwarden...');
      await loadBitwardenSecrets(bwAccessToken, bwProjectId);
      console.log('✅ Bitwarden secrets loaded\n');
    }

    // Initialize database pool after secrets are loaded
    // Use 'postgres' as host (docker service name) since we're inside a container
    // Force misjustice_dev database
    pool = new Pool({
      host: 'postgres',
      port: 5432,
      database: 'misjustice_dev',
      user: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'postgres',
    });

    const stats = await seedCases();

    console.log('\n📊 Seeding Summary');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Cases created:     ${stats.casesCreated}`);
    console.log(`✅ Documents created: ${stats.documentsCreated}`);
    console.log(`❌ Errors:            ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      stats.errors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error}`);
      });
    }

    console.log('\n🎉 Seeding complete!\n');
  } catch (error) {
    console.error('\n💥 Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { seedCases, loadCaseMappings };
