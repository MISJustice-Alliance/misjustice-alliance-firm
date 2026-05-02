#!/usr/bin/env npx ts-node
/**
 * Backfill Script: Analyze Existing Documents
 *
 * Analyzes documents that don't have synopsis/tags generated yet.
 * Uses Claude API with rate limiting to process documents in batches.
 *
 * Usage:
 *   npx ts-node src/scripts/analyzeExistingDocuments.ts [options]
 *
 * Options:
 *   --case=CR-2025-002  Only analyze documents from specific case
 *   --document=UUID     Analyze a single document by ID
 *   --dry-run           Show what would be analyzed without making changes
 *   --limit=10          Limit number of documents to process
 *   --delay=2000        Delay between API calls in ms (default: 2000)
 */

import { Pool } from 'pg';
import { DocumentAnalysisService, TokenUsage } from '../services/DocumentAnalysisService';
import { loadBitwardenSecrets } from '../services/BitwardenSecretsService';
import path from 'path';
import fs from 'fs';

// Load Bitwarden secrets if configured (before any service initialization)
async function loadSecrets(): Promise<void> {
  if (process.env.BW_ACCESS_TOKEN && process.env.BW_PROJECT_ID) {
    console.log('🔐 Loading secrets from Bitwarden...');
    await loadBitwardenSecrets(
      process.env.BW_ACCESS_TOKEN,
      process.env.BW_PROJECT_ID
    );
  }
}

// Venice.ai pricing (as of Jan 2026)
// Using qwen3-235b for text analysis (successor to llama-3.1-405b) and mistral-31-24b for vision
const PRICING = {
  textModel: 'qwen3-235b',
  visionModel: 'mistral-31-24b',
  // Average pricing across both models
  inputCostPer1M: 0.50,  // $0.50 per 1M input tokens (Venice Medium pricing)
  outputCostPer1M: 2.00, // $2.00 per 1M output tokens
};

// Parse command line arguments
const args = process.argv.slice(2);
const caseId = args.find(a => a.startsWith('--case='))?.split('=')[1];
const documentId = args.find(a => a.startsWith('--document='))?.split('=')[1];
const dryRun = args.includes('--dry-run');
const limitArg = args.find(a => a.startsWith('--limit='))?.split('=')[1];
const limit = limitArg ? parseInt(limitArg, 10) : undefined;
const delayArg = args.find(a => a.startsWith('--delay='))?.split('=')[1];
const delayMs = delayArg ? parseInt(delayArg, 10) : 2000;

// Database and analysis service (initialized after secrets load)
let pool: Pool;
let analysisService: DocumentAnalysisService;

function initializeServices(): void {
  // In Docker, use container-specific database settings
  const isDocker = process.env.HOSTNAME?.startsWith('misjustice') || fs.existsSync('/.dockerenv');

  pool = new Pool({
    host: isDocker ? 'postgres' : (process.env.DATABASE_HOST || 'localhost'),
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    database: isDocker ? 'misjustice_dev' : (process.env.DATABASE_NAME || 'misjustice_dev'),
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || process.env.POSTGRES_PASSWORD || '',
  });
  analysisService = new DocumentAnalysisService();
}

interface PendingDocument {
  id: string;
  name: string;
  file_path: string | null;
  case_id: string;
  mime_type: string;
}

interface CostSummary {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
}

function calculateCost(usage: TokenUsage): number {
  const inputCost = (usage.inputTokens / 1_000_000) * PRICING.inputCostPer1M;
  const outputCost = (usage.outputTokens / 1_000_000) * PRICING.outputCostPer1M;
  return inputCost + outputCost;
}

function formatCost(cost: number): string {
  return cost < 0.01 ? `$${cost.toFixed(6)}` : `$${cost.toFixed(4)}`;
}

async function getDocumentById(id: string): Promise<PendingDocument | null> {
  const result = await pool.query(
    `SELECT id, document_name as name, file_path, case_id,
            COALESCE(document_type, 'unknown') as mime_type
     FROM case_documents WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function getPendingDocuments(): Promise<PendingDocument[]> {
  // If specific document requested, return just that one
  if (documentId) {
    const doc = await getDocumentById(documentId);
    return doc ? [doc] : [];
  }

  let query = `
    SELECT id, document_name as name, file_path, case_id,
           COALESCE(document_type, 'unknown') as mime_type
    FROM case_documents
    WHERE synopsis IS NULL
  `;
  const params: string[] = [];

  if (caseId) {
    params.push(caseId);
    query += ` AND case_id = (SELECT id FROM legal_cases WHERE case_number = $${params.length})`;
  }

  query += ' ORDER BY created_at ASC';

  if (limit) {
    params.push(limit.toString());
    query += ` LIMIT $${params.length}`;
  }

  const result = await pool.query(query, params);
  return result.rows;
}

async function updateDocument(id: string, synopsis: string, tags: string[]): Promise<void> {
  await pool.query(
    'UPDATE case_documents SET synopsis = $1, tags = $2 WHERE id = $3',
    [synopsis, tags, id]
  );
}

function resolveFilePath(filePath: string | null): string | null {
  if (!filePath) return null;

  // Try multiple possible locations
  const possiblePaths = [
    filePath, // As stored in DB
    path.join('/app', filePath), // Docker container path
    path.join(process.cwd(), filePath), // Relative to working dir
    path.join(process.cwd(), 'content-archive', filePath.replace('/app/content-archive/', '')), // Local dev
    // Handle paths starting with /app/content-archive
    filePath.startsWith('/app/content-archive')
      ? path.join(process.cwd(), filePath.replace('/app/content-archive', 'content-archive'))
      : null,
    // Handle frontend public documents
    filePath.includes('/documents/')
      ? path.join(process.cwd(), 'frontend', 'public', filePath.split('/documents/')[1] ? `documents/${filePath.split('/documents/')[1]}` : '')
      : null,
  ].filter(Boolean) as string[];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('='.repeat(70));
  console.log('Document Analysis Script');
  console.log('='.repeat(70));
  console.log();

  // Load secrets from Bitwarden before initializing services
  await loadSecrets();
  initializeServices();

  if (dryRun) {
    console.log('*** DRY RUN MODE - No changes will be made ***\n');
  }

  if (documentId) {
    console.log(`Analyzing single document: ${documentId}`);
  } else if (caseId) {
    console.log(`Filtering by case: ${caseId}`);
  }

  if (limit) {
    console.log(`Limiting to ${limit} documents`);
  }

  console.log(`Delay between API calls: ${delayMs}ms`);
  console.log(`Venice.ai Models: ${PRICING.textModel} (text), ${PRICING.visionModel} (vision)`);
  console.log(`Pricing: ~$${PRICING.inputCostPer1M}/1M input, ~$${PRICING.outputCostPer1M}/1M output\n`);

  // Check for Venice API key
  if (!process.env.VENICE_API_KEY) {
    console.error('ERROR: VENICE_API_KEY environment variable is required');
    console.error('Set it with: export VENICE_API_KEY=your-api-key');
    console.error('Or ensure it is configured in Bitwarden Secrets Manager');
    process.exit(1);
  }

  try {
    // Get pending documents
    console.log('Fetching documents...');
    const documents = await getPendingDocuments();

    if (documentId && documents.length === 0) {
      console.log(`Document not found: ${documentId}`);
      return;
    }

    console.log(`Found ${documents.length} document(s) to process\n`);

    if (documents.length === 0) {
      console.log('No documents to process. Exiting.');
      return;
    }

    // Group by case for display (only if not single document mode)
    if (!documentId) {
      const byCase = documents.reduce((acc, doc) => {
        acc[doc.case_id] = (acc[doc.case_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('Documents by case:');
      for (const [cId, count] of Object.entries(byCase)) {
        console.log(`  ${cId}: ${count} documents`);
      }
      console.log();
    }

    // Process documents
    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    let skipped = 0;

    // Cost tracking
    const costSummary: CostSummary = {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCost: 0,
    };

    for (const doc of documents) {
      processed++;
      console.log('-'.repeat(70));
      console.log(`[${processed}/${documents.length}] Processing: ${doc.name}`);
      console.log(`  ID: ${doc.id}`);
      console.log(`  Case: ${doc.case_id}`);
      console.log(`  Type: ${doc.mime_type}`);

      // Resolve file path
      const resolvedPath = resolveFilePath(doc.file_path);

      if (!resolvedPath) {
        console.log(`  ⚠️  SKIPPED: File not found at ${doc.file_path}`);
        skipped++;
        continue;
      }

      console.log(`  Path: ${resolvedPath}`);

      if (dryRun) {
        console.log('  [DRY RUN] Would analyze document');
        succeeded++;
        continue;
      }

      try {
        // Analyze document
        const result = await analysisService.analyzeDocument(resolvedPath, doc.name);

        if (result.synopsis && result.tags.length > 0) {
          // Update database
          await updateDocument(doc.id, result.synopsis, result.tags);

          console.log(`  ✅ SUCCESS`);
          console.log(`     Synopsis: ${result.synopsis.substring(0, 100)}...`);
          console.log(`     Tags: [${result.tags.join(', ')}]`);
          console.log(`     Extracted: ${result.extractedTextLength} chars`);

          // Token usage and cost
          if (result.tokenUsage) {
            const cost = calculateCost(result.tokenUsage);
            costSummary.totalInputTokens += result.tokenUsage.inputTokens;
            costSummary.totalOutputTokens += result.tokenUsage.outputTokens;
            costSummary.totalCost += cost;

            console.log(`     Tokens: ${result.tokenUsage.inputTokens} in / ${result.tokenUsage.outputTokens} out`);
            console.log(`     Cost: ${formatCost(cost)}`);
          }

          succeeded++;
        } else {
          console.log(`  ⚠️  PARTIAL: Analysis returned incomplete results`);
          console.log(`     Synopsis: ${result.synopsis || '(none)'}`);
          console.log(`     Tags: ${result.tags.length} tags`);
          failed++;
        }
      } catch (error) {
        console.log(`  ❌ ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
        failed++;
      }

      // Rate limiting delay between API calls
      if (processed < documents.length) {
        console.log(`  Waiting ${delayMs}ms before next document...`);
        await sleep(delayMs);
      }

      console.log();
    }

    // Summary
    console.log('='.repeat(70));
    console.log('SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total processed: ${processed}`);
    console.log(`  Succeeded: ${succeeded}`);
    console.log(`  Failed: ${failed}`);
    console.log(`  Skipped: ${skipped}`);
    console.log();

    // API Usage Summary
    if (!dryRun && costSummary.totalInputTokens > 0) {
      console.log('-'.repeat(70));
      console.log('API USAGE');
      console.log('-'.repeat(70));
      console.log(`Venice.ai Models: ${PRICING.textModel} (text), ${PRICING.visionModel} (vision)`);
      console.log(`Total Input Tokens: ${costSummary.totalInputTokens.toLocaleString()}`);
      console.log(`Total Output Tokens: ${costSummary.totalOutputTokens.toLocaleString()}`);
      console.log(`Estimated Total Cost: ${formatCost(costSummary.totalCost)}`);
      console.log();
    }

    if (dryRun) {
      console.log('This was a dry run. Run without --dry-run to apply changes.');
    }

    // Output JSON for programmatic use (when analyzing single document)
    if (documentId && succeeded > 0) {
      console.log('-'.repeat(70));
      console.log('JSON OUTPUT (for programmatic use):');
      console.log(JSON.stringify({
        documentId,
        success: true,
        inputTokens: costSummary.totalInputTokens,
        outputTokens: costSummary.totalOutputTokens,
        estimatedCost: costSummary.totalCost,
      }, null, 2));
    }

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
