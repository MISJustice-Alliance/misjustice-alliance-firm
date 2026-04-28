#!/usr/bin/env ts-node

/**
 * Re-analyze Documents that Failed Venice OCR
 *
 * This script re-analyzes specific documents that failed Venice OCR during
 * the initial reconciliation due to missing pdf2pic dependency.
 *
 * Target documents:
 * - ywcamissoula-secondnotice.pdf
 * - tyleen-root-harassment.pdf
 * - ELiseChard-OP-06.2018.pdf
 * - 02-MT_Bar_Complaint-received-redacted.pdf
 */

import { DocumentAnalysisService } from '../services/DocumentAnalysisService';
import { loadBitwardenSecrets } from '../services/BitwardenSecretsService';
import { pool } from '../config/database';
import path from 'path';
import fs from 'fs/promises';

const DOCUMENTS_TO_REANALYZE = [
  'ywcamissoula-secondnotice.pdf',
  'tyleen-root-harassment.pdf',
  'ELiseChard-OP-06.2018.pdf',
  '02-MT_Bar_Complaint-received-redacted.pdf',
];

const TEMP_DIR = '/tmp/ocr-reanalysis';

interface ReanalysisStats {
  total: number;
  found: number;
  reanalyzed: number;
  failed: number;
  totalCost: number;
}

async function downloadFromArweave(txId: string): Promise<Buffer> {
  const response = await fetch(`https://arweave.net/${txId}`);
  if (!response.ok) {
    throw new Error(`Failed to download from Arweave: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function main() {
  console.log('================================================================================');
  console.log('Re-analyze Failed Venice OCR Documents');
  console.log('================================================================================\n');

  // Load secrets from Bitwarden
  const bwAccessToken = process.env.BW_ACCESS_TOKEN;
  const bwProjectId = process.env.BW_PROJECT_ID;

  if (bwAccessToken && bwProjectId) {
    console.log('Loading secrets from Bitwarden...');
    await loadBitwardenSecrets(bwAccessToken, bwProjectId);
    console.log('Bitwarden secrets loaded\n');
  } else {
    console.log('Bitwarden credentials not found, using environment variables\n');
  }

  const stats: ReanalysisStats = {
    total: DOCUMENTS_TO_REANALYZE.length,
    found: 0,
    reanalyzed: 0,
    failed: 0,
    totalCost: 0,
  };

  // Create temp directory
  await fs.mkdir(TEMP_DIR, { recursive: true });

  const analysisService = new DocumentAnalysisService();

  try {
    for (const documentName of DOCUMENTS_TO_REANALYZE) {
      console.log(`\n[${documentName}]`);
      console.log('  Searching database...');

      // Find document by name
      const query = `
        SELECT id, document_name, arweave_tx_id, synopsis, tags
        FROM case_documents
        WHERE document_name = $1
        LIMIT 1
      `;
      const result = await pool.query(query, [documentName]);

      if (result.rows.length === 0) {
        console.log('  [NOT FOUND] Document not in database');
        continue;
      }

      const doc = result.rows[0];
      stats.found++;

      console.log(`  [FOUND] ID: ${doc.id}`);
      console.log(`  TX ID: ${doc.arweave_tx_id}`);
      console.log(`  Current synopsis: ${doc.synopsis?.substring(0, 80)}...`);

      if (!doc.arweave_tx_id) {
        console.log('  [SKIP] No Arweave TX ID');
        stats.failed++;
        continue;
      }

      // Download file
      console.log('  Downloading from Arweave...');
      const buffer = await downloadFromArweave(doc.arweave_tx_id);
      console.log(`  Downloaded: ${buffer.length} bytes`);

      // Save to temp file
      const tempFilePath = path.join(TEMP_DIR, `${doc.id}.pdf`);
      await fs.writeFile(tempFilePath, buffer);

      // Run Venice OCR analysis
      console.log('  [ANALYZING] Running Venice.ai OCR...');
      try {
        const analysis = await analysisService.analyzeDocument(tempFilePath, documentName);

        console.log(`  [SUCCESS] Synopsis: "${analysis.synopsis.substring(0, 100)}..."`);
        console.log(`  Tags: ${analysis.tags.join(', ')}`);
        console.log(`  Model: ${analysis.model}`);

        if (analysis.tokenUsage) {
          const VENICE_PRICING = {
            inputTokenCost: 0.50 / 1_000_000,
            outputTokenCost: 2.00 / 1_000_000,
          };
          const cost =
            analysis.tokenUsage.inputTokens * VENICE_PRICING.inputTokenCost +
            analysis.tokenUsage.outputTokens * VENICE_PRICING.outputTokenCost;
          console.log(`  Cost: $${cost.toFixed(4)}`);
          stats.totalCost += cost;
        }

        // Update document in database
        const updateQuery = `
          UPDATE case_documents
          SET synopsis = $1, tags = $2
          WHERE id = $3
        `;
        await pool.query(updateQuery, [analysis.synopsis, analysis.tags, doc.id]);

        console.log('  [UPDATED] Database record updated');
        stats.reanalyzed++;

        // Clean up temp file
        await fs.unlink(tempFilePath);

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`  [ERROR] Analysis failed: ${errorMessage}`);
        stats.failed++;
        // Clean up temp file even on error
        try {
          await fs.unlink(tempFilePath);
        } catch {
          // Ignore cleanup errors - file may already be deleted
        }
      }
    }

  } finally {
    // Clean up temp directory
    try {
      await fs.rm(TEMP_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors - directory may not exist
    }
  }

  console.log('\n================================================================================');
  console.log('RE-ANALYSIS SUMMARY');
  console.log('================================================================================');
  console.log(`Target documents:     ${stats.total}`);
  console.log(`Found in database:    ${stats.found}`);
  console.log(`Successfully analyzed: ${stats.reanalyzed}`);
  console.log(`Failed:               ${stats.failed}`);
  console.log(`Total Venice.ai cost: $${stats.totalCost.toFixed(4)}`);
  console.log('================================================================================\n');

  process.exit(0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
