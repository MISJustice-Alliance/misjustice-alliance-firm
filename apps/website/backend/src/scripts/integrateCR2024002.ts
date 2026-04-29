/**
 * Integrate CR-2025-002 Case Files
 *
 * This script processes and integrates all files from the INTEGRATION/incoming/CR-2025-002
 * directory into the case documents database and file storage.
 *
 * Usage:
 *   npx ts-node src/scripts/integrateCR2024002.ts
 *
 * Options:
 *   --dry-run: Preview changes without making them
 *   --skip-upload: Skip copying files to storage (database only)
 */

import 'dotenv/config';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';
import { DocumentRepository } from '../repositories/DocumentRepository';
import { DocumentType } from '../models/Document';

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const skipUpload = args.includes('--skip-upload');

const INTEGRATION_DIR = path.resolve(
  __dirname,
  '../../../INTEGRATION/incoming/CR-2025-002'
);
const STORAGE_DIR = path.resolve(__dirname, '../../../frontend/public/documents');

/**
 * Document type mapping based on directory structure
 * Maps directory names to DocumentType enum values
 */
const DIRECTORY_TO_DOCUMENT_TYPE: Record<string, DocumentType> = {
  'Court-Documents': DocumentType.RULING,
  'Formal-Complaints': DocumentType.COMPLAINT,
  'Other-Victims': DocumentType.EVIDENCE,
  'Police Reports': DocumentType.EVIDENCE,
  'Tyleen-Root-Harassment': DocumentType.EVIDENCE,
  'YWCA-Missoula': DocumentType.EVIDENCE,
};

/**
 * File metadata extracted from directory scan
 */
interface FileMetadata {
  originalPath: string;
  relativePath: string;
  filename: string;
  directory: string;
  documentType: DocumentType;
  fileExtension: string;
  fileSize: number;
}

/**
 * Scan directory and collect file metadata
 */
function scanDirectory(dirPath: string, basePath: string = dirPath): FileMetadata[] {
  const files: FileMetadata[] = [];

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    // Skip system files and directories we don't want
    if (entry.name.startsWith('.') || entry.name === 'INDEX.md') {
      continue;
    }

    if (entry.isDirectory()) {
      // Recursively scan subdirectories
      files.push(...scanDirectory(fullPath, basePath));
    } else if (entry.isFile()) {
      const relativePath = path.relative(basePath, fullPath);
      const directory = path.dirname(relativePath);
      const topLevelDir = directory.split(path.sep)[0];
      const documentType = DIRECTORY_TO_DOCUMENT_TYPE[topLevelDir] || DocumentType.EVIDENCE;

      files.push({
        originalPath: fullPath,
        relativePath,
        filename: entry.name,
        directory: topLevelDir,
        documentType,
        fileExtension: path.extname(entry.name).toLowerCase(),
        fileSize: fs.statSync(fullPath).size,
      });
    }
  }

  return files;
}

/**
 * Get case ID for CR-2025-002
 */
async function getCaseId(pool: Pool): Promise<string | null> {
  const result = await pool.query(
    `SELECT id FROM legal_cases WHERE case_number = $1`,
    ['CR-2025-002']
  );

  return result.rows.length > 0 ? result.rows[0].id : null;
}

/**
 * Create case if it doesn't exist
 */
async function createCaseIfNotExists(pool: Pool): Promise<string> {
  const existingCaseId = await getCaseId(pool);

  if (existingCaseId) {
    return existingCaseId;
  }

  logger.info('Case CR-2025-002 not found, creating...');

  const result = await pool.query(
    `
    INSERT INTO legal_cases (
      case_number,
      plaintiff,
      defendant,
      jurisdiction,
      status,
      filed_date,
      case_facts,
      causes_of_action
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id
    `,
    [
      'CR-2025-002',
      'Anonymous Plaintiff',
      'YWCA Missoula, City of Missoula, Various Law Enforcement Agencies',
      'Montana/Washington',
      'discovery',
      '2018-06-03',
      'Comprehensive case documenting systemic civil rights violations, malicious prosecution, and institutional corruption involving YWCA Missoula, law enforcement, and judicial misconduct across Montana and Washington jurisdictions.',
      ['Civil Rights Violations', 'Malicious Prosecution', 'Institutional Corruption'],
    ]
  );

  if (!result.rows.length || !result.rows[0].id) {
    throw new Error('Failed to create case CR-2025-002');
  }

  const caseId: string = result.rows[0].id;
  logger.info('Created case CR-2025-002', { caseId });

  return caseId;
}

/**
 * Copy file to storage directory
 */
function copyFileToStorage(file: FileMetadata, caseNumber: string): string {
  const caseStorageDir = path.join(STORAGE_DIR, caseNumber);

  // Create case directory if it doesn't exist
  if (!fs.existsSync(caseStorageDir)) {
    fs.mkdirSync(caseStorageDir, { recursive: true });
  }

  // Create subdirectory for document type
  const typeDir = path.join(caseStorageDir, file.directory);
  if (!fs.existsSync(typeDir)) {
    fs.mkdirSync(typeDir, { recursive: true });
  }

  // Generate unique filename to avoid conflicts
  const timestamp = Date.now();
  const basename = path.basename(file.filename, file.fileExtension);
  const newFilename = `${basename}-${timestamp}${file.fileExtension}`;
  const destPath = path.join(typeDir, newFilename);

  // Copy file
  fs.copyFileSync(file.originalPath, destPath);

  // Return relative path for database
  return path.relative(STORAGE_DIR, destPath);
}

/**
 * Create document record in database
 */
async function createDocumentRecord(
  documentRepository: DocumentRepository,
  file: FileMetadata,
  caseId: string,
  filePath: string
): Promise<string> {
  const result = await documentRepository.create({
    caseId,
    documentName: file.filename,
    documentType: file.documentType,
    filePath,
  });

  return result.id;
}

/**
 * Main integration function
 */
async function integrateCR2024002() {
  logger.info('Starting CR-2025-002 case integration', {
    dryRun,
    skipUpload,
  });

  // Check if integration directory exists
  if (!fs.existsSync(INTEGRATION_DIR)) {
    console.error(`❌ Integration directory not found: ${INTEGRATION_DIR}`);
    process.exit(1);
  }

  // Scan files
  console.log('\n📁 Scanning files...');
  const files = scanDirectory(INTEGRATION_DIR);
  console.log(`Found ${files.length} files to integrate\n`);

  // Group by directory
  const filesByDirectory: Record<string, FileMetadata[]> = {};
  for (const file of files) {
    if (!filesByDirectory[file.directory]) {
      filesByDirectory[file.directory] = [];
    }
    filesByDirectory[file.directory].push(file);
  }

  // Display summary
  console.log('📊 Files by category:');
  console.log('─'.repeat(80));
  for (const [dir, dirFiles] of Object.entries(filesByDirectory)) {
    const docType = DIRECTORY_TO_DOCUMENT_TYPE[dir] || DocumentType.EVIDENCE;
    console.log(`  ${docType} (${dir}): ${dirFiles.length} files`);
  }
  console.log('─'.repeat(80));
  console.log();

  if (dryRun) {
    console.log('✓ DRY RUN MODE - No changes will be made\n');
    console.log('Preview of files to integrate:');
    console.log('─'.repeat(80));
    for (const file of files) {
      console.log(`  • ${file.directory}/${file.filename}`);
      console.log(`    Type: ${file.documentType}`);
      console.log(`    Size: ${(file.fileSize / 1024).toFixed(2)} KB`);
      console.log();
    }
    console.log('─'.repeat(80));
    return;
  }

  // Initialize database connection
  const pool = new Pool({
    user: process.env.PGUSER || 'legaladvocacy',
    host: process.env.PGHOST || 'localhost',
    database: process.env.PGDATABASE || 'legaladvocacy',
    password: process.env.PGPASSWORD || 'secure-password',
    port: parseInt(process.env.PGPORT || '5432', 10),
  });

  const documentRepository = new DocumentRepository(pool);

  try {
    // Ensure case exists
    const caseId = await createCaseIfNotExists(pool);
    console.log(`✓ Case ID: ${caseId}\n`);

    // Process each file
    let successCount = 0;
    let failureCount = 0;
    const errors: Array<{ file: string; error: string }> = [];

    console.log('📤 Processing files...\n');

    for (const file of files) {
      try {
        // Copy file to storage (unless skipped)
        let filePath = file.relativePath;
        if (!skipUpload) {
          filePath = copyFileToStorage(file, 'CR-2025-002');
        }

        // Create document record
        const documentId = await createDocumentRecord(
          documentRepository,
          file,
          caseId,
          filePath
        );

        successCount++;
        console.log(`  ✓ ${file.directory}/${file.filename} → ${documentId}`);
      } catch (error) {
        failureCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        errors.push({
          file: `${file.directory}/${file.filename}`,
          error: errorMessage,
        });

        console.log(`  ✗ ${file.directory}/${file.filename} - ${errorMessage}`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 Integration Summary');
    console.log('='.repeat(80));
    console.log(`Total files processed: ${files.length}`);
    console.log(`Successful integrations: ${successCount}`);
    console.log(`Failed integrations: ${failureCount}`);
    console.log('='.repeat(80));

    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      console.log('─'.repeat(80));
      for (const error of errors) {
        console.log(`  • ${error.file}: ${error.error}`);
      }
      console.log('─'.repeat(80));
    }

    console.log('\n✓ Integration complete.\n');
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
integrateCR2024002().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
