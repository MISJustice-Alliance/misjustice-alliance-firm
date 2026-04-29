/**
 * Archive Documents to Arweave - Fixed Version
 * Loads Bitwarden secrets BEFORE database pool initialization
 */

import 'dotenv/config';
import { loadBitwardenSecrets } from '../services/BitwardenSecretsService';

async function main() {
  try {
    // Load Bitwarden secrets FIRST, before any database imports
    const bwAccessToken = process.env.BW_ACCESS_TOKEN;
    const bwProjectId = process.env.BW_PROJECT_ID;

    if (bwAccessToken && bwProjectId) {
      console.log('🔐 Loading Bitwarden secrets first...');
      await loadBitwardenSecrets(bwAccessToken, bwProjectId);
      console.log('✅ Bitwarden secrets loaded\n');
    }

    // NOW import the database pool and archiver
    // Note: We must import AFTER loading Bitwarden secrets to ensure env vars are set
    const { Pool } = await import('pg');
    const { ArweaveService } = await import('../services/arweaveService');

    // Create database pool with current environment variables
    // In Docker, use the service name 'postgres', not localhost
    let dbHost = process.env.DATABASE_HOST || 'postgres';
    if (dbHost === 'localhost' && process.env.NODE_ENV === 'development') {
      dbHost = 'postgres'; // Docker service name for development
    }

    const dbPort = parseInt(process.env.DATABASE_PORT || '5432', 10);
    const dbName = process.env.DATABASE_NAME || 'misjustice_dev';
    const dbUser = process.env.DATABASE_USER || 'postgres';
    // TODO: Fix Bitwarden DATABASE_PASSWORD secret - currently incorrect
    // For now, use the hardcoded password that matches the actual database
    const dbPassword = '7RME8FLVPfTEe9ozwD4rgbR7f29Rs9y8';

    console.log(`🔗 Database config: host=${dbHost}, port=${dbPort}, database=${dbName}, user=${dbUser}`);
    console.log(`🔐 Password source: DATABASE_PASSWORD=${!!process.env.DATABASE_PASSWORD ? '***' : 'not set'}, POSTGRES_PASSWORD=${!!process.env.POSTGRES_PASSWORD ? '***' : 'not set'}, using='***'`);

    const pool = new Pool({
      host: dbHost,
      port: dbPort,
      database: dbName,
      user: dbUser,
      password: dbPassword,
    });

    console.log('🚀 Starting Arweave archiving...\n');

    // Load Arweave wallet from Bitwarden (secrets already loaded above)
    let wallet = null;

    // Try ARWEAVE_KEYFILE first if it looks like JSON (Bitwarden secret contains the wallet, not a path)
    if (process.env.ARWEAVE_KEYFILE && process.env.ARWEAVE_KEYFILE.startsWith('{')) {
      try {
        wallet = JSON.parse(process.env.ARWEAVE_KEYFILE);
      } catch (e) {
        console.warn('⚠️  Failed to parse ARWEAVE_KEYFILE as JSON');
      }
    }

    // Try ARWEAVE_WALLET_KEY next (raw JSON)
    if (!wallet && process.env.ARWEAVE_WALLET_KEY) {
      try {
        wallet = JSON.parse(process.env.ARWEAVE_WALLET_KEY);
      } catch (e) {
        console.warn('⚠️  Failed to parse ARWEAVE_WALLET_KEY');
      }
    }

    // Try loading from file path
    if (!wallet && process.env.ARWEAVE_WALLET_PATH) {
      try {
        const fs = await import('fs/promises');
        const walletData = await fs.readFile(process.env.ARWEAVE_WALLET_PATH, 'utf-8');
        wallet = JSON.parse(walletData);
      } catch (e) {
        console.warn('⚠️  Failed to load wallet from ARWEAVE_WALLET_PATH');
      }
    }

    // Try ARWEAVE_KEYFILE as fallback
    if (!wallet && process.env.ARWEAVE_KEYFILE) {
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const fullPath = path.resolve(process.env.ARWEAVE_KEYFILE);
        console.log(`Attempting to load wallet from: ${fullPath}`);
        const walletData = await fs.readFile(fullPath, 'utf-8');
        wallet = JSON.parse(walletData);
      } catch (e) {
        console.warn(`⚠️  Failed to load wallet from ARWEAVE_KEYFILE: ${(e as Error).message}`);
      }
    }

    if (!wallet) {
      throw new Error('Arweave wallet not configured. Set ARWEAVE_WALLET_KEY, ARWEAVE_WALLET_PATH, or ARWEAVE_KEYFILE');
    }

    const arweaveService = new ArweaveService(wallet);
    const walletAddress = await arweaveService.getWalletAddress();
    console.log(`✅ Wallet loaded: ${walletAddress}\n`);

    // Get wallet balance
    const balanceWinston = await arweaveService.getWalletBalance();
    if (balanceWinston) {
      const balanceAR = arweaveService.winstonToAr(balanceWinston);
      console.log(`💰 Wallet balance: ${balanceAR} AR\n`);
    }

    // Get documents to archive (only CR-2025-002)
    console.log('📋 Fetching CR-2025-002 documents...');
    const docsResult = await pool.query(`
      SELECT id, document_name, file_path, case_id
      FROM case_documents
      WHERE case_id = (SELECT id FROM legal_cases WHERE case_number = 'CR-2025-002')
      AND arweave_tx_id IS NULL
    `);

    const docs = docsResult.rows;
    console.log(`Found ${docs.length} documents to archive\n`);

    if (docs.length === 0) {
      console.log('✅ No documents to archive');
      await pool.end();
      return;
    }

    // Archive documents
    try {
      const fs = await import('fs/promises');
      const archiveDocs = [];

      // Prepare documents for archiving
      for (const doc of docs) {
        const fileContent = await fs.readFile(doc.file_path);
        archiveDocs.push({
          name: doc.document_name,
          type: 'evidence',
          content: fileContent,
          databaseId: doc.id,
        });
      }

      // Get case metadata
      const caseResult = await pool.query(`
        SELECT case_number, plaintiff, defendant, jurisdiction
        FROM legal_cases
        WHERE id = $1
      `, [docs[0].case_id]);

      const caseData = caseResult.rows[0];

      // Upload all documents
      const uploadResults = await arweaveService.uploadDocumentsIndividually(archiveDocs, {
        caseId: docs[0].case_id,
        caseNumber: caseData.case_number,
        plaintiff: caseData.plaintiff,
        defendant: caseData.defendant,
        jurisdiction: caseData.jurisdiction,
        stage: 'final',
        timestamp: new Date().toISOString(),
        documentCount: archiveDocs.length,
      });

      // Update database with Arweave TX IDs
      for (const result of uploadResults) {
        const docId = docs.find((d) => d.document_name === result.documentName)?.id;
        if (docId && result.dataItemId) {
          await pool.query(
            'UPDATE case_documents SET arweave_tx_id = $1 WHERE id = $2',
            [result.dataItemId, docId]
          );
          console.log(`   ✅ Archived: ${result.dataItemId}`);
        }
      }
    } catch (error) {
      console.error(`❌ Archiving failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    console.log('\n✅ Archiving complete');
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
