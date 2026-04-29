/**
 * Integrate Evidentiary Documentation into CR-2025-002
 *
 * Scans ../content-archive/evidentiary-documentation directory,
 * categorizes files by subdirectory, and inserts into database
 * with proper evidence_category tagging.
 *
 * Usage:
 *   npx ts-node src/scripts/integrateEvidence.ts
 *
 * Options:
 *   --dry-run: Preview changes without making them
 *   --case=CR-2025-XXX: Specify case number (default: CR-2025-002)
 */

import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { Pool } from 'pg';
import { DocumentType, EvidenceCategory } from '../models/Document';
import { logger } from '../utils/logger';

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const caseArg = args.find((arg) => arg.startsWith('--case='));
const caseNumber = caseArg ? caseArg.split('=')[1] : 'CR-2025-002';

// Evidence directory mapping
const EVIDENCE_DIR = path.resolve(__dirname, '../../../content-archive/evidentiary-documentation');

const CATEGORY_MAPPING: Record<string, EvidenceCategory> = {
  'Court-Documents': EvidenceCategory.COURT_DOCUMENTS,
  'Formal-Complaints': EvidenceCategory.FORMAL_COMPLAINTS,
  'Global-Casefiles': EvidenceCategory.GLOBAL_CASEFILES,
  'Other-Victims': EvidenceCategory.OTHER_VICTIMS,
  'Police Reports': EvidenceCategory.POLICE_REPORTS,
  'Tyleen-Root-Harassment': EvidenceCategory.TYLEEN_ROOT_HARASSMENT,
  'YWCA-Missoula': EvidenceCategory.YWCA_MISSOULA,
};

interface FileToImport {
  fileName: string;
  category: EvidenceCategory;
  fullPath: string;
  relativePath: string;
}

/**
 * Scan evidentiary documentation directory
 */
async function scanEvidenceDirectory(): Promise<FileToImport[]> {
  const filesToImport: FileToImport[] = [];

  logger.info('Scanning evidentiary documentation directory', {
    path: EVIDENCE_DIR,
  });

  try {
    const subdirs = await fs.readdir(EVIDENCE_DIR);

    for (const subdir of subdirs) {
      const subdirPath = path.join(EVIDENCE_DIR, subdir);
      const stat = await fs.stat(subdirPath);

      if (!stat.isDirectory()) continue;

      // Map subdirectory name to evidence category
      const category = CATEGORY_MAPPING[subdir];
      if (!category) {
        logger.warn(`Unknown category directory: ${subdir}`);
        continue;
      }

      // Scan files in category directory
      const files = await fs.readdir(subdirPath);

      for (const file of files) {
        // Skip hidden files and directories
        if (file.startsWith('.')) continue;

        const filePath = path.join(subdirPath, file);
        const fileStat = await fs.stat(filePath);

        if (!fileStat.isFile()) continue;

        // Only include supported file types
        const ext = path.extname(file).toLowerCase();
        if (!['.pdf', '.jpeg', '.jpg', '.png'].includes(ext)) {
          logger.warn(`Unsupported file type: ${file}`);
          continue;
        }

        filesToImport.push({
          fileName: file,
          category,
          fullPath: filePath,
          relativePath: path.join(subdir, file),
        });
      }
    }

    logger.info(`Found ${filesToImport.length} evidence files to import`, {
      breakdown: Object.entries(CATEGORY_MAPPING).map(([_dir, cat]) => ({
        category: cat,
        count: filesToImport.filter((f) => f.category === cat).length,
      })),
    });

    return filesToImport;
  } catch (error) {
    logger.error('Failed to scan evidence directory', { error });
    throw error;
  }
}

/**
 * Main integration function
 */
async function integrateEvidence() {
  logger.info('Starting evidence integration', {
    dryRun,
    caseNumber,
  });

  // Initialize database connection
  const pool = new Pool({
    user: process.env.PGUSER || 'legaladvocacy',
    host: process.env.PGHOST || 'localhost',
    database: process.env.PGDATABASE || 'legaladvocacy',
    password: process.env.PGPASSWORD || 'secure-password',
    port: parseInt(process.env.PGPORT || '5432', 10),
  });

  try {
    // Find case ID
    const caseResult = await pool.query(
      'SELECT id FROM legal_cases WHERE case_number = $1',
      [caseNumber]
    );

    if (caseResult.rows.length === 0) {
      throw new Error(`Case ${caseNumber} not found in database`);
    }

    const caseId = caseResult.rows[0].id;
    logger.info(`Found case ${caseNumber}`, { caseId });

    // Scan evidence directory
    const filesToImport = await scanEvidenceDirectory();

    if (filesToImport.length === 0) {
      logger.info('No files to import. Exiting.');
      return;
    }

    // Display files to be imported
    console.log('\n📋 Files to import:');
    console.log('─'.repeat(80));

    const categoryCounts: Record<string, number> = {};

    for (const file of filesToImport) {
      const categoryDisplay = file.category.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
      console.log(`  • [${categoryDisplay}] ${file.fileName}`);

      categoryCounts[file.category] = (categoryCounts[file.category] || 0) + 1;
    }

    console.log('─'.repeat(80));
    console.log('\n📊 Summary by category:');
    Object.entries(categoryCounts).forEach(([category, count]) => {
      const display = category.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
      console.log(`  ${display}: ${count} files`);
    });
    console.log('');

    if (dryRun) {
      logger.info('DRY RUN MODE - No changes will be made');
      console.log('✓ Dry run complete. Use without --dry-run to import files.\n');
      return;
    }

    // Import files
    let successCount = 0;
    let failureCount = 0;
    const errors: Array<{ fileName: string; error: string }> = [];

    for (const file of filesToImport) {
      try {
        // Check if file already exists in database
        const existingDoc = await pool.query(
          `SELECT id FROM case_documents
           WHERE case_id = $1 AND document_name = $2`,
          [caseId, file.fileName]
        );

        if (existingDoc.rows.length > 0) {
          logger.info(`Document already exists, skipping: ${file.fileName}`);
          continue;
        }

        // Insert document into database
        await pool.query(
          `INSERT INTO case_documents
             (case_id, document_name, document_type, evidence_category, file_path)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            caseId,
            file.fileName,
            DocumentType.EVIDENCE, // All evidentiary docs are type 'evidence'
            file.category,
            file.fullPath,
          ]
        );

        successCount++;
        console.log(`  ✓ Imported: ${file.fileName}`);

        logger.info('Document imported successfully', {
          caseId,
          fileName: file.fileName,
          category: file.category,
        });
      } catch (error) {
        failureCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        errors.push({
          fileName: file.fileName,
          error: errorMessage,
        });

        console.log(`  ✗ Failed: ${file.fileName} - ${errorMessage}`);
        logger.error('Failed to import document', {
          fileName: file.fileName,
          error: errorMessage,
        });
      }
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 Integration Summary');
    console.log('='.repeat(80));
    console.log(`Total files processed: ${filesToImport.length}`);
    console.log(`Successfully imported: ${successCount}`);
    console.log(`Failed imports: ${failureCount}`);
    console.log('='.repeat(80));

    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      console.log('─'.repeat(80));
      for (const error of errors) {
        console.log(`  • ${error.fileName}: ${error.error}`);
      }
      console.log('─'.repeat(80));
    }

    console.log('\n✓ Integration complete.');
    console.log('\nNext steps:');
    console.log('  1. Run: npm run archive:arweave (to upload files to Arweave)');
    console.log('  2. Run: npm run arns:backfill (to assign ArNS undernames)\n');
  } catch (error) {
    logger.error('Integration script failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    console.error('\n❌ Fatal error:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the integration
if (require.main === module) {
  integrateEvidence().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { integrateEvidence };
