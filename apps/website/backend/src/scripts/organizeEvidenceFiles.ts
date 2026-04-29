/**
 * Organize Evidence Files
 *
 * Reorganizes all evidence files into proper subdirectories based on evidence categories
 * and imports them into the database with correct metadata.
 *
 * Based on manual organization work done previously.
 *
 * Usage:
 *   npx ts-node src/scripts/organizeEvidenceFiles.ts
 *   npx ts-node src/scripts/organizeEvidenceFiles.ts --dry-run
 */

import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { Pool } from 'pg';
import { loadBitwardenSecrets } from '../services/BitwardenSecretsService';

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

// Database pool - will be initialized after loading secrets
let pool: Pool;

// Content archive base path
const CONTENT_ARCHIVE = path.resolve(__dirname, '../../content-archive/cases-pending');

// Evidence category directory mapping
const CATEGORY_DIRS: Record<string, string> = {
  'court-documents': 'Court-Documents',
  'formal-complaints': 'Formal-Complaints',
  'police-reports': 'Police-Reports',
  'attorney-correspondence': 'Attorney-Correspondence',
  'email-communications': 'E-Mail-Communications',
  'global-casefiles': 'Global-Casefiles',
  'public-documents': 'Public-Documents',
  'documented-harassment': 'Documented-Harassment',
  'documentation': 'Documentation',
  'victim-statements': 'Victim-Statements',
  'ywca-missoula': 'YWCA-Missoula',
};

// File organization rules by case
const FILE_ORGANIZATION: Record<string, Record<string, string[]>> = {
  'CR-2025-001': {
    'formal-complaints': [
      'ywcamissoula-firstnotice.pdf',
      'ywcamissoula-secondnotice.pdf'
    ],
    'global-casefiles': [
      'rico_timeline_real.png',
      'federal_funding_chart_real.png',
      'damages_by_victim_real.png'
    ],
    'public-documents': [
      'ywca-missoula-consolidated-financial-statements-years-2023-2024.pdf'
    ],
    'victim-statements': [
      'Arthur-Brown-Google-Review.jpeg',
      'Facebook-HIPPA-Violation-Thread-1.jpeg',
      'Facebook-HIPPA-Violation-Thread-2.jpeg',
      'YWCA-Reddit-Complaints.jpeg'
    ]
  },
  'CR-2025-002': {
    'court-documents': [
      'Missoula-Case-66-Court-Order-Dismissal.pdf',
      'Seattle-Case-613225-Dismissal.png',
      'Missoula-Case-201223-Dismissal-Lowney-iltr.pdf',
      'Edmonds_Trial-Nuno_Declaration_of_Ineffective Assistance.pdf'
    ],
    'formal-complaints': [
      'MT_DOJ_POST-EMail.pdf',
      'MT-DOJ-POST-Complaint-08-12-2025-REDACTED.pdf',
      'Ty-Nuno-Police-Complaint-Ethan-Smith-03-2018.pdf',
      'Office for Professional Accountability 2016OPA-1167.pdf',
      'Office of Professional Accountability_ 2016OPA-1167.pdf',
      'WA_State_Bar_Complaint_Patricia-Fulto_2016.pdf',
      'Missoula-Mayors-Office-7-29-2020.pdf',
      'WA-DOH-Case-2017-3122PY-Dr-Marta-Miranda.jpg',
      'complaint-ethan-smith-REDACTED.pdf'
    ],
    'global-casefiles': [
      'Nuno-Case-Relationship-Diagram.jpeg'
    ],
    'documented-harassment': [
      'tyleen-root-harassment.pdf'
    ],
    'police-reports': [
      'Seattle PD Written statement regarding incident #2016-348587.pdf'
    ],
    'public-documents': [
      'ywca-missoula-consolidated-financial-statements-years-2023-2024.pdf'
    ],
    'email-communications': [
      'ywca-first-notice-10-12-2025.pdf',
      'ywca-second-notice-12-5-2025.pdf'
    ],
    'attorney-correspondence': [
      'E-Mail-Bryan-Tipp-Dec-2020.pdf',
      'E-Mail-Bryan-Tipp-Jan-2021.pdf'
    ],
    'ywca-missoula': [
      'Nuno-YWCA-Complaint.jpg',
      'Nuno-PS-Witness-Statement-YWCA-Email-Complaint.pdf',
      'nuno-ywca-google-review01.jpeg',
      'nuno-ywca-google-review02.jpeg'
    ]
  },
  'CR-2025-003': {
    'documentation': [
      'ODC-25-147-mind-map.png',
      'Case-Study.pdf',
      'nuno-tipp-timeline.png',
      'Briefing-Document.pdf',
      'Case-Narrative.pdf',
      '11-Unlawful-Arrest-08-2018-Legal-Malpractice-Implications.pdf'
    ]
  }
};

// Files to remove (duplicates)
const FILES_TO_REMOVE: Record<string, string[]> = {
  'CR-2025-002': [
    'dr-marta-miranda-wa-doh-complaint.pdf'
  ]
};

/**
 * Document synopses/descriptions for evidence files
 * These provide context for each document and will be stored in the database synopsis field
 */
const FILE_SYNOPSES: Record<string, Record<string, string>> = {
  'CR-2025-001': {
    'ywcamissoula-firstnotice.pdf':
      'First formal notice to YWCA of Missoula from MISJustice Alliance, sent October 12, 2025. ' +
      'This letter initiated contact regarding the investigation into the Nuno case, requesting ' +
      'information about institutional policies and any actions taken regarding documented misconduct ' +
      'by YWCA staff members. No response was received.',

    'ywcamissoula-secondnotice.pdf':
      'Second notice to YWCA of Missoula from MISJustice Alliance, sent December 5, 2025, as a ' +
      'follow-up to the first notice (ywcamissoula-firstnotice.pdf). This letter provided ' +
      'additional information concerning the investigation into the Nuno case and requested a ' +
      'response and/or statement of action that was taken or planned to be taken regarding the matter. ' +
      'No response was ever received from YWCA of Missoula.',
  },
  'CR-2025-002': {
    'ywca-first-notice-10-12-2025.pdf':
      'First formal notice to YWCA of Missoula from MISJustice Alliance, sent October 12, 2025. ' +
      'This letter initiated contact regarding the investigation into the Nuno case, requesting ' +
      'information about institutional policies and any actions taken regarding documented misconduct ' +
      'by YWCA staff members. No response was received.',

    'ywca-second-notice-12-5-2025.pdf':
      'Second notice to YWCA of Missoula from MISJustice Alliance, sent December 5, 2025, as a ' +
      'follow-up to the first notice (ywca-first-notice-10-12-2025.pdf). This letter provided ' +
      'additional information concerning the investigation into the Nuno case and requested a ' +
      'response and/or statement of action that was taken or planned to be taken regarding the matter. ' +
      'No response was ever received from YWCA of Missoula.',

    'Ty-Nuno-Police-Complaint-Ethan-Smith-03-2018.pdf':
      'Formal police complaint filed by Tyrone Nuno (father of Elvis Nuno) against Officer Ethan Smith ' +
      'of Missoula Police Department in March 2018. Documents harassment of elderly parents and improper ' +
      'conduct by Officer Smith who was later removed from the case for "obvious appearance of impropriety."',

    'MT-DOJ-POST-Complaint-08-12-2025-REDACTED.pdf':
      'Notarized formal complaint filed with the Montana Department of Justice POST (Peace Officers ' +
      'Standards and Training) division, dated August 12, 2025. Documents ongoing police misconduct ' +
      "from 2018-2025 and the department's refusal to accept police reports or complaints regarding " +
      'the misconduct. Redacted version for public release.',

    'Missoula-Case-66-Court-Order-Dismissal.pdf':
      'Court order dismissing charges in Missoula Case 66. Evidence of prosecutorial failure to establish ' +
      'probable cause and judicial recognition of protected First Amendment activity.',

    'Missoula-Case-201223-Dismissal-Lowney-iltr.pdf':
      'Letter from Tipp, Colburn & Associates, P.C. to Deputy County Attorney Brian Lowney, dated ' +
      'December 23, 2020, requesting full dismissal with prejudice of Missoula stalking charges. ' +
      'Attorney Bryan Tipp notes that Mr. Nuno had been receiving ongoing harassment, and that the ' +
      'delayed dismissal created the appearance—even to someone familiar with the law—that Mr. Nuno ' +
      'remained under investigation and at risk of prosecution. Tipp reminds Lowney that the ' +
      "prosecutor's office was in breach of the non-prosecution agreement, which required dismissal " +
      'with prejudice one year after signing. As of the letter date, the deadline had passed by several weeks.',
  },
};

// Case directory mapping
const CASE_DIRS: Record<string, string> = {
  'CR-2025-001': '1-criminal-investigation-ywca_rico_dossier',
  'CR-2025-002': '2-criminal-investigation-nuno-case',
  'CR-2025-003': '3-legal-malpractice-nuno-v-bryan-tipp'
};

interface OrganizationStats {
  filesOrganized: number;
  directoriesCreated: number;
  filesRemoved: number;
  dbRecordsUpdated: number;
  errors: string[];
}

/**
 * Get case ID from case number
 */
async function getCaseId(caseNumber: string): Promise<string | null> {
  const result = await pool.query(
    'SELECT id FROM legal_cases WHERE case_number = $1',
    [caseNumber]
  );
  return result.rows[0]?.id || null;
}

/**
 * Find file in case directory (recursively search)
 */
async function findFile(caseDir: string, fileName: string): Promise<string | null> {
  const basePath = path.join(CONTENT_ARCHIVE, caseDir);

  async function searchDir(dir: string): Promise<string | null> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;

        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          const found = await searchDir(fullPath);
          if (found) return found;
        } else if (entry.isFile() && entry.name === fileName) {
          return fullPath;
        }
      }
    } catch (err) {
      // Directory doesn't exist or can't be read
    }

    return null;
  }

  return searchDir(basePath);
}

/**
 * Create evidence directory structure for a case
 */
async function createEvidenceDirectories(caseNumber: string): Promise<number> {
  const caseDir = CASE_DIRS[caseNumber];
  if (!caseDir) {
    throw new Error(`Unknown case number: ${caseNumber}`);
  }

  const evidenceBase = path.join(CONTENT_ARCHIVE, caseDir, 'evidentiary-documentation');
  let directoriesCreated = 0;

  // Get categories used by this case
  const organization = FILE_ORGANIZATION[caseNumber] || {};
  const categories = Object.keys(organization);

  for (const category of categories) {
    const dirName = CATEGORY_DIRS[category];
    if (!dirName) {
      console.warn(`  ⚠ Unknown category: ${category}`);
      continue;
    }

    const categoryDir = path.join(evidenceBase, dirName);

    try {
      await fs.access(categoryDir);
      console.log(`  ✓ Directory exists: ${dirName}`);
    } catch {
      if (!dryRun) {
        await fs.mkdir(categoryDir, { recursive: true });
      }
      console.log(`  ${dryRun ? '📋' : '✅'} Created directory: ${dirName}`);
      directoriesCreated++;
    }
  }

  return directoriesCreated;
}

/**
 * Organize files for a case
 */
async function organizeCase(caseNumber: string, stats: OrganizationStats): Promise<void> {
  console.log(`\n📁 Processing case: ${caseNumber}`);

  const caseId = await getCaseId(caseNumber);
  if (!caseId) {
    console.error(`  ❌ Case not found in database: ${caseNumber}`);
    stats.errors.push(`Case not found: ${caseNumber}`);
    return;
  }

  const caseDir = CASE_DIRS[caseNumber];
  const evidenceBase = path.join(CONTENT_ARCHIVE, caseDir, 'evidentiary-documentation');

  // Create directories
  const dirsCreated = await createEvidenceDirectories(caseNumber);
  stats.directoriesCreated += dirsCreated;

  // Organize files
  const organization = FILE_ORGANIZATION[caseNumber] || {};

  for (const [category, files] of Object.entries(organization)) {
    const dirName = CATEGORY_DIRS[category];
    const targetDir = path.join(evidenceBase, dirName);

    console.log(`\n  📂 ${dirName}:`);

    for (const fileName of files) {
      try {
        // Find the file
        const sourcePath = await findFile(caseDir, fileName);

        if (!sourcePath) {
          console.log(`    ⚠ File not found: ${fileName}`);
          stats.errors.push(`${caseNumber}: File not found - ${fileName}`);
          continue;
        }

        const targetPath = path.join(targetDir, fileName);

        // Check if already in correct location
        if (sourcePath === targetPath) {
          console.log(`    ✓ ${fileName} (already in place)`);

          // Update database record with category and synopsis if available
          if (!dryRun) {
            const synopsis = FILE_SYNOPSES[caseNumber]?.[fileName] || null;
            await pool.query(
              `UPDATE case_documents
               SET evidence_category = $1, synopsis = COALESCE($4, synopsis)
               WHERE case_id = $2 AND document_name = $3`,
              [category, caseId, fileName, synopsis]
            );
            stats.dbRecordsUpdated++;
          }
          continue;
        }

        // Move file
        if (!dryRun) {
          await fs.rename(sourcePath, targetPath);
        }
        console.log(`    ${dryRun ? '📋' : '✅'} Moved: ${fileName}`);
        stats.filesOrganized++;

        // Update database record with category, path, and synopsis if available
        if (!dryRun) {
          const containerPath = `/app/content-archive/cases-pending/${caseDir}/evidentiary-documentation/${dirName}/${fileName}`;
          const synopsis = FILE_SYNOPSES[caseNumber]?.[fileName] || null;
          await pool.query(
            `UPDATE case_documents
             SET evidence_category = $1, file_path = $2, synopsis = COALESCE($5, synopsis)
             WHERE case_id = $3 AND document_name = $4`,
            [category, containerPath, caseId, fileName, synopsis]
          );
          stats.dbRecordsUpdated++;
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        console.log(`    ❌ Error: ${fileName} - ${error}`);
        stats.errors.push(`${caseNumber}/${fileName}: ${error}`);
      }
    }
  }

  // Remove duplicate files
  const filesToRemove = FILES_TO_REMOVE[caseNumber] || [];
  if (filesToRemove.length > 0) {
    console.log(`\n  🗑️  Removing duplicates:`);

    for (const fileName of filesToRemove) {
      try {
        const filePath = await findFile(caseDir, fileName);

        if (!filePath) {
          console.log(`    ⚠ File not found: ${fileName}`);
          continue;
        }

        if (!dryRun) {
          await fs.unlink(filePath);
          // Remove from database
          await pool.query(
            'DELETE FROM case_documents WHERE case_id = $1 AND document_name = $2',
            [caseId, fileName]
          );
        }
        console.log(`    ${dryRun ? '📋' : '✅'} Removed: ${fileName}`);
        stats.filesRemoved++;
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        console.log(`    ❌ Error: ${fileName} - ${error}`);
        stats.errors.push(`${caseNumber}/${fileName}: ${error}`);
      }
    }
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  console.log('======================================================================');
  console.log('Evidence File Organization Script');
  console.log('======================================================================');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  // Load Bitwarden secrets
  const bwAccessToken = process.env.BW_ACCESS_TOKEN;
  const bwProjectId = process.env.BW_PROJECT_ID;

  if (bwAccessToken && bwProjectId) {
    console.log('🔐 Loading secrets from Bitwarden...');
    await loadBitwardenSecrets(bwAccessToken, bwProjectId);
    console.log('✅ Bitwarden secrets loaded\n');
  }

  // Initialize database pool
  pool = new Pool({
    host: 'postgres',
    port: 5432,
    database: 'misjustice_dev',
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
  });

  const stats: OrganizationStats = {
    filesOrganized: 0,
    directoriesCreated: 0,
    filesRemoved: 0,
    dbRecordsUpdated: 0,
    errors: []
  };

  try {
    // Organize each case
    for (const caseNumber of Object.keys(FILE_ORGANIZATION)) {
      await organizeCase(caseNumber, stats);
    }

    console.log('\n======================================================================');
    console.log('📊 ORGANIZATION SUMMARY');
    console.log('======================================================================');
    console.log(`Directories created:  ${stats.directoriesCreated}`);
    console.log(`Files organized:      ${stats.filesOrganized}`);
    console.log(`Files removed:        ${stats.filesRemoved}`);
    console.log(`DB records updated:   ${stats.dbRecordsUpdated}`);
    console.log(`Errors:               ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      stats.errors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error}`);
      });
    }

    console.log('\n✅ Organization complete!\n');
  } catch (error) {
    console.error('\n💥 Organization failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
