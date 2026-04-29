#!/usr/bin/env ts-node

/**
 * Reorganize CR-2025-001 Documents
 *
 * Move documents to appropriate evidence categories:
 * - Formal Complaint
 * - Global Casefiles
 * - Victim Statements
 * - Public Documents
 */

import { pool } from '../config/database';

interface DocumentUpdate {
  filename: string;
  newType: string;
  evidenceCategory: string;
}

const UPDATES: DocumentUpdate[] = [
  // Evidence > Formal Complaint
  {
    filename: 'missoula-county-prosecutors-second-outreach-10-08-2025.pdf',
    newType: 'evidence',
    evidenceCategory: 'formal-complaint',
  },
  {
    filename: 'missoula-county-prosecutors-first-outreach-09-21-2025.pdf',
    newType: 'evidence',
    evidenceCategory: 'formal-complaint',
  },
  {
    filename: 'ywcamissoula-secondnotice.pdf',
    newType: 'evidence',
    evidenceCategory: 'formal-complaint',
  },
  {
    filename: 'ywcamissoula-firstnotice.pdf',
    newType: 'evidence',
    evidenceCategory: 'formal-complaint',
  },

  // Evidence > Global Casefiles
  {
    filename: 'remebering-when.pdf',
    newType: 'evidence',
    evidenceCategory: 'global-casefiles',
  },
  {
    filename: 'investigative-report-ywca-missoula.pdf',
    newType: 'evidence',
    evidenceCategory: 'global-casefiles',
  },
  {
    filename: 'shelter-and-the-storm-article.pdf',
    newType: 'evidence',
    evidenceCategory: 'global-casefiles',
  },
  {
    filename: 'case-study-state-of-montana-vs-elvis-nuno.pdf',
    newType: 'evidence',
    evidenceCategory: 'global-casefiles',
  },

  // Evidence > Victim Statements
  {
    filename: 'ywca-hippa-violation-01-30-2024.png',
    newType: 'evidence',
    evidenceCategory: 'victim-statements',
  },

  // Evidence > Public Documents
  {
    filename: 'missoula-needs-and-gaps-2024-final.pdf',
    newType: 'evidence',
    evidenceCategory: 'public-documents',
  },
  {
    filename: 'doj-missoula_mpd_compliancerpt_5-15.pdf',
    newType: 'evidence',
    evidenceCategory: 'public-documents',
  },
];

async function main() {
  console.log('================================================================================');
  console.log('Reorganize CR-2025-001 Documents');
  console.log('================================================================================\n');

  let successCount = 0;
  let notFoundCount = 0;
  let errorCount = 0;

  try {
    // Get CR-2025-001 case ID
    const caseQuery = 'SELECT id FROM legal_cases WHERE case_number = $1';
    const caseResult = await pool.query(caseQuery, ['CR-2025-001']);

    if (caseResult.rows.length === 0) {
      console.error('❌ Case CR-2025-001 not found');
      process.exit(1);
    }

    const caseId = caseResult.rows[0].id;
    console.log(`✓ Found case CR-2025-001 (ID: ${caseId})\n`);

    for (const update of UPDATES) {
      console.log(`\n[${update.filename}]`);
      console.log(`  Target: ${update.newType} > ${update.evidenceCategory}`);

      // Find document
      const findQuery = `
        SELECT id, document_type, tags, evidence_category
        FROM case_documents
        WHERE case_id = $1 AND document_name = $2
      `;
      const findResult = await pool.query(findQuery, [caseId, update.filename]);

      if (findResult.rows.length === 0) {
        console.log('  ❌ NOT FOUND in database');
        notFoundCount++;
        continue;
      }

      const doc = findResult.rows[0];
      console.log(`  Current type: ${doc.document_type}`);
      console.log(`  Current evidence_category: ${doc.evidence_category || 'none'}`);
      console.log(`  Current tags: ${doc.tags?.join(', ') || 'none'}`);

      // Add evidence category to tags if not already present
      const currentTags = doc.tags || [];
      const newTags = [...new Set([...currentTags, update.evidenceCategory])];

      // Update document with evidence_category field
      const updateQuery = `
        UPDATE case_documents
        SET document_type = $1, tags = $2, evidence_category = $3
        WHERE id = $4
      `;

      try {
        await pool.query(updateQuery, [update.newType, newTags, update.evidenceCategory, doc.id]);
        console.log(`  ✅ Updated: ${update.newType} | evidence_category: ${update.evidenceCategory}`);
        console.log(`     Tags: ${newTags.join(', ')}`);
        successCount++;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`  ❌ ERROR: ${errorMessage}`);
        errorCount++;
      }
    }

    console.log('\n================================================================================');
    console.log('REORGANIZATION SUMMARY');
    console.log('================================================================================');
    console.log(`Total documents:  ${UPDATES.length}`);
    console.log(`Successfully updated: ${successCount}`);
    console.log(`Not found:        ${notFoundCount}`);
    console.log(`Errors:           ${errorCount}`);
    console.log('================================================================================\n');

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }

  process.exit(0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
