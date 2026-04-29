/**
 * Backfill ArNS Undernames for Existing Archived Documents
 *
 * This script registers ArNS undernames for all documents that have been
 * archived to Arweave but don't yet have ArNS undernames assigned.
 *
 * Usage:
 *   npx ts-node src/scripts/backfillArnsUndernames.ts
 *
 * Options:
 *   --dry-run: Preview changes without making them
 *   --limit=N: Only process N documents (for testing)
 */

import 'dotenv/config';
import { Pool } from 'pg';
import { DocumentRepository } from '../repositories/DocumentRepository';
import { ArnsService } from '../services/ArnsService';
import { logger } from '../utils/logger';
import { ArnsStatus } from '../models/Document';
import { loadBitwardenSecrets } from '../services/BitwardenSecretsService';

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitArg = args.find((arg) => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;

/**
 * Main backfill function
 */
async function backfillArnsUndernames() {
  logger.info('Starting ArNS undername backfill', {
    dryRun,
    limit: limit || 'unlimited',
  });

  // Capture database config from Docker environment BEFORE loading Bitwarden
  // (Bitwarden may have production values that would break container networking)
  const dbConfig = {
    user: process.env.DATABASE_USER || process.env.PGUSER || 'postgres',
    host: process.env.DATABASE_HOST || process.env.PGHOST || 'postgres',
    database: process.env.DATABASE_NAME || process.env.PGDATABASE || 'misjustice_dev',
    password: process.env.DATABASE_PASSWORD || process.env.PGPASSWORD || 'postgres',
    port: parseInt(process.env.DATABASE_PORT || process.env.PGPORT || '5432', 10),
  };

  // Load Bitwarden secrets if configured (for ArNS wallet, etc.)
  const bwAccessToken = process.env.BW_ACCESS_TOKEN;
  const bwProjectId = process.env.BW_PROJECT_ID;
  if (bwAccessToken && bwProjectId) {
    logger.info('Loading secrets from Bitwarden...');
    await loadBitwardenSecrets(bwAccessToken, bwProjectId);
  }

  // Initialize database connection with preserved Docker config
  const pool = new Pool(dbConfig);

  const documentRepository = new DocumentRepository(pool);
  const arnsService = new ArnsService(documentRepository);

  try {
    // Find all documents with Arweave TX ID but no ArNS undername
    const query = `
      SELECT id, case_id, document_name, document_type, arweave_tx_id
      FROM case_documents
      WHERE arweave_tx_id IS NOT NULL
        AND (arns_undername IS NULL OR arns_status = 'pending')
      ORDER BY created_at ASC
      ${limit ? `LIMIT ${limit}` : ''}
    `;

    const result = await pool.query(query);
    const documents = result.rows;

    logger.info(`Found ${documents.length} documents to process`);

    if (documents.length === 0) {
      logger.info('No documents need ArNS undernames. Exiting.');
      return;
    }

    // Display documents to be processed
    console.log('\n📋 Documents to process:');
    console.log('─'.repeat(80));
    for (const doc of documents) {
      console.log(
        `  • ${doc.document_name} (${doc.document_type}) - ${doc.arweave_tx_id}`
      );
    }
    console.log('─'.repeat(80));
    console.log();

    if (dryRun) {
      logger.info('DRY RUN MODE - No changes will be made');
      console.log('✓ Dry run complete. Use without --dry-run to apply changes.\n');
      return;
    }

    // Process each document
    let successCount = 0;
    let failureCount = 0;
    const errors: Array<{ documentId: string; error: string }> = [];

    // Track sequence numbers in-memory to avoid race conditions
    // Key format: "{caseId}:{documentType}"
    const sequenceCounters = new Map<string, number>();

    for (const doc of documents) {
      try {
        logger.info(`Processing document ${doc.id}`, {
          documentName: doc.document_name,
          documentType: doc.document_type,
        });

        // Get case details
        const caseData = await documentRepository.getCaseById(doc.case_id);
        if (!caseData) {
          throw new Error(`Case not found for document ${doc.id}`);
        }

        // Calculate sequence number using in-memory counter
        const counterKey = `${doc.case_id}:${doc.document_type}`;
        let sequence: number;

        if (!sequenceCounters.has(counterKey)) {
          // First document of this type for this case - get initial count from database
          sequence = await arnsService.getNextSequenceNumber(
            doc.case_id,
            doc.document_type
          );
          sequenceCounters.set(counterKey, sequence);
        } else {
          // Subsequent document - increment in-memory counter
          sequence = sequenceCounters.get(counterKey)! + 1;
          sequenceCounters.set(counterKey, sequence);
        }

        // Register ArNS undername
        const result = await arnsService.registerUndername({
          caseNumber: caseData.caseNumber,
          documentType: doc.document_type,
          arweaveTxId: doc.arweave_tx_id,
          sequence,
        });

        // Update document in database
        await documentRepository.updateArnsInfo(doc.id, {
          arnsUndername: result.fullUndername,
          arnsStatus: ArnsStatus.ACTIVE,
          arnsRegisteredAt: new Date(),
          arnsUrl: result.url,
        });

        successCount++;

        console.log(`  ✓ ${doc.document_name} → ${result.fullUndername}`);
        logger.info('ArNS undername registered successfully', {
          documentId: doc.id,
          undername: result.fullUndername,
        });
      } catch (error) {
        failureCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        errors.push({
          documentId: doc.id,
          error: errorMessage,
        });

        console.log(`  ✗ ${doc.document_name} - ${errorMessage}`);
        logger.error('Failed to register ArNS undername', {
          documentId: doc.id,
          error: errorMessage,
        });
      }
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 Backfill Summary');
    console.log('='.repeat(80));
    console.log(`Total documents processed: ${documents.length}`);
    console.log(`Successful registrations: ${successCount}`);
    console.log(`Failed registrations: ${failureCount}`);
    console.log('='.repeat(80));

    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      console.log('─'.repeat(80));
      for (const error of errors) {
        console.log(`  • Document ${error.documentId}: ${error.error}`);
      }
      console.log('─'.repeat(80));
    }

    console.log('\n✓ Backfill complete.\n');
  } catch (error) {
    logger.error('Backfill script failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    console.error('\n❌ Fatal error:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the backfill
backfillArnsUndernames().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
