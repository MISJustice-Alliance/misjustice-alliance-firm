/**
 * Arweave Service
 *
 * Provides permanent archival of legal case documents to the Arweave permaweb.
 * Uses Turbo.io for efficient batch uploads and cryptographic verification.
 *
 * @module services/arweaveService
 * @version 1.0.0
 */

import Arweave from 'arweave';
import { TurboFactory, TurboAuthenticatedClient } from '@ardrive/turbo-sdk';
import crypto from 'crypto';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Arweave JWK (JSON Web Key) wallet format
 */
export interface ArweaveJWK {
  kty: string;
  n: string;
  e: string;
  d?: string;
  p?: string;
  q?: string;
  dp?: string;
  dq?: string;
  qi?: string;
}

/**
 * Arweave transaction tag
 */
export interface ArweaveTag {
  get(name: 'name' | 'value', options: { decode: boolean; string: boolean }): string;
}

/**
 * Metadata for case document bundle
 */
export interface CaseBundleMetadata {
  caseId: string;
  caseNumber: string;
  plaintiff?: string;  // Optional - may be anonymized
  defendant: string;
  jurisdiction: string;
  stage: 'intake' | 'research' | 'pleadings' | 'discovery' | 'trial' | 'final';
  timestamp: string;   // ISO 8601 format
  documentCount: number;
}

/**
 * Document to be included in archive bundle
 */
export interface ArchiveDocument {
  name: string;
  type: string;        // e.g., 'complaint', 'motion', 'brief'
  content: string | Buffer;
  hash?: string;       // SHA-256 hash (computed if not provided)
  databaseId?: string; // Optional database ID for reliable matching (prevents name collisions)
}

/**
 * Result of upload operation
 */
export interface UploadResult {
  txId: string;        // Arweave transaction ID
  bundleHash: string;  // SHA-256 hash of bundle
  uploadedAt: string;  // ISO 8601 timestamp
  byteSize: number;    // Total bytes uploaded
}

/**
 * Result of individual document upload (ANS-104 data item)
 */
export interface IndividualUploadResult {
  documentName: string;   // Original document filename
  documentType: string;   // Document type (complaint, evidence, etc.)
  dataItemId: string;     // Unique ANS-104 data item ID
  documentHash: string;   // SHA-256 hash of document content
  uploadedAt: string;     // ISO 8601 timestamp
  byteSize: number;       // Document size in bytes
  owner: string;          // Arweave wallet address
  databaseId?: string;    // Optional database ID for reliable matching (prevents name collisions)
}

/**
 * Result of verification operation
 */
export interface VerificationResult {
  valid: boolean;
  txId: string;
  retrievedAt: string;
  dataSize: number;
  hashMatch?: boolean;
  error?: string;
}

// ============================================================================
// Arweave Service Class
// ============================================================================

export class ArweaveService {
  private arweave: Arweave;
  private turbo: TurboAuthenticatedClient | null = null;
  private walletKey: ArweaveJWK | null;

  /**
   * Initialize Arweave service
   *
   * @param walletKey - Arweave wallet in JWK format (optional for read-only)
   */
  constructor(walletKey?: ArweaveJWK) {
    // Initialize Arweave connection to mainnet
    this.arweave = Arweave.init({
      host: 'arweave.net',
      port: 443,
      protocol: 'https',
      timeout: 20000,
      logging: false
    });

    this.walletKey = walletKey || null;

    // Initialize Turbo if wallet provided
    if (walletKey) {
      this.initializeTurbo(walletKey);
    }
  }

  /**
   * Initialize Turbo SDK for efficient uploads
   *
   * @private
   */
  private async initializeTurbo(walletKey: ArweaveJWK): Promise<void> {
    try {
      this.turbo = TurboFactory.authenticated({
        privateKey: walletKey
      });
      console.log('[ArweaveService] Turbo SDK initialized successfully');
    } catch (error) {
      console.error('[ArweaveService] Failed to initialize Turbo:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Turbo initialization failed: ${message}`);
    }
  }

  /**
   * Upload case document bundle to Arweave
   *
   * @param documents - Array of documents to archive
   * @param metadata - Case metadata
   * @returns Upload result with transaction ID
   *
   * @example
   * const result = await arweaveService.uploadBundle([
   *   { name: 'complaint.pdf', type: 'complaint', content: pdfBuffer }
   * ], {
   *   caseId: 'case-123',
   *   caseNumber: '2026-CV-001',
   *   defendant: 'City Police Department',
   *   jurisdiction: 'U.S. District Court - ND CA',
   *   stage: 'pleadings',
   *   timestamp: new Date().toISOString(),
   *   documentCount: 1
   * });
   * console.log('Archived to Arweave:', result.txId);
   */
  async uploadBundle(
    documents: ArchiveDocument[],
    metadata: CaseBundleMetadata
  ): Promise<UploadResult> {
    if (!this.turbo) {
      throw new Error('Turbo not initialized - wallet key required for uploads');
    }

    // Compute hashes for documents if not provided
    const documentsWithHashes = documents.map(doc => ({
      ...doc,
      hash: doc.hash || this.computeHash(
        typeof doc.content === 'string' ? Buffer.from(doc.content) : doc.content
      )
    }));

    // Create bundle
    const bundle = {
      documents: documentsWithHashes,
      metadata: {
        ...metadata,
        appName: 'MISJustice-Alliance',
        appVersion: '1.0.0'
      },
      timestamp: new Date().toISOString()
    };

    // Convert bundle to JSON
    const bundleJson = JSON.stringify(bundle, null, 2);
    const bundleBuffer = Buffer.from(bundleJson);

    // Compute bundle hash
    const bundleHash = this.computeHash(bundleBuffer);

    try {
      // Upload to Arweave via Turbo
      const result = await this.turbo.uploadFile({
        fileStreamFactory: () => bundleBuffer,
        fileSizeFactory: () => bundleBuffer.length,
        dataItemOpts: {
          tags: [
            { name: 'App-Name', value: 'MISJustice-Alliance' },
            { name: 'App-Version', value: '1.0.0' },
            { name: 'Content-Type', value: 'application/json' },
            { name: 'Case-ID', value: metadata.caseId },
            { name: 'Case-Number', value: metadata.caseNumber },
            { name: 'Stage', value: metadata.stage },
            { name: 'Document-Count', value: metadata.documentCount.toString() },
            { name: 'Bundle-Hash', value: bundleHash }
          ]
        }
      });

      console.log(`[ArweaveService] Upload successful: ${result.id}`);

      return {
        txId: result.id,
        bundleHash,
        uploadedAt: new Date().toISOString(),
        byteSize: bundleBuffer.length
      };

    } catch (error) {
      console.error('[ArweaveService] Upload failed:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Arweave upload failed: ${message}`);
    }
  }

  /**
   * Upload documents individually as separate ANS-104 data items
   *
   * This is the recommended approach for ArNS and WeaveDB integration.
   * Each document gets its own unique data item ID and can be accessed
   * individually at https://arweave.net/{dataItemId}
   *
   * @param documents - Array of documents to upload
   * @param metadata - Case metadata for tagging
   * @returns Array of upload results with individual data item IDs
   *
   * @example
   * const results = await arweaveService.uploadDocumentsIndividually([
   *   { name: 'complaint.pdf', type: 'complaint', content: pdfBuffer },
   *   { name: 'evidence.jpg', type: 'evidence', content: jpgBuffer }
   * ], caseMetadata);
   *
   * // Store each document's unique ID
   * await db.updateDocument(doc1Id, { arweave_tx_id: results[0].dataItemId });
   * await db.updateDocument(doc2Id, { arweave_tx_id: results[1].dataItemId });
   */
  async uploadDocumentsIndividually(
    documents: ArchiveDocument[],
    metadata: CaseBundleMetadata
  ): Promise<IndividualUploadResult[]> {
    if (!this.turbo) {
      throw new Error('Turbo not initialized - wallet key required for uploads');
    }

    const results: IndividualUploadResult[] = [];

    for (const doc of documents) {
      try {
        // Convert content to Buffer if it's a string
        const contentBuffer = typeof doc.content === 'string'
          ? Buffer.from(doc.content)
          : doc.content;

        // Compute hash if not provided
        const documentHash = doc.hash || this.computeHash(contentBuffer);

        // Determine content type from file extension
        const contentType = this.getContentType(doc.name);

        // Upload individual document as ANS-104 data item
        const result = await this.turbo.uploadFile({
          fileStreamFactory: () => contentBuffer,
          fileSizeFactory: () => contentBuffer.length,
          dataItemOpts: {
            tags: [
              { name: 'App-Name', value: 'MISJustice-Alliance' },
              { name: 'App-Version', value: '1.0.0' },
              { name: 'Content-Type', value: contentType },
              { name: 'Case-ID', value: metadata.caseId },
              { name: 'Case-Number', value: metadata.caseNumber },
              { name: 'Document-Type', value: doc.type },
              { name: 'Document-Name', value: doc.name },
              { name: 'Document-Hash', value: documentHash },
              { name: 'Stage', value: metadata.stage },
              { name: 'Plaintiff', value: metadata.plaintiff || 'Anonymous' },
              { name: 'Defendant', value: metadata.defendant || 'Unknown' },
              { name: 'Jurisdiction', value: metadata.jurisdiction || 'Unknown' },
            ]
          }
        });

        console.log(`[ArweaveService] Uploaded ${doc.name}: ${result.id}`);

        results.push({
          documentName: doc.name,
          documentType: doc.type,
          dataItemId: result.id,
          documentHash,
          uploadedAt: new Date().toISOString(),
          byteSize: contentBuffer.length,
          owner: result.owner,
          databaseId: doc.databaseId, // Pass through database ID for reliable matching
        });

      } catch (error) {
        console.error(`[ArweaveService] Upload failed for ${doc.name}:`, error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to upload ${doc.name}: ${message}`);
      }
    }

    return results;
  }

  /**
   * Helper to determine content type from file extension
   */
  private getContentType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    const contentTypes: Record<string, string> = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      txt: 'text/plain',
      json: 'application/json',
      html: 'text/html',
      md: 'text/markdown',
    };
    return contentTypes[ext || ''] || 'application/octet-stream';
  }

  /**
   * Verify archived document integrity
   *
   * @param txId - Arweave transaction ID
   * @param expectedHash - Optional expected SHA-256 hash to verify against
   * @returns Verification result
   *
   * @example
   * const verification = await arweaveService.verifyArchive('abc123def456');
   * if (verification.valid) {
   *   console.log('Archive verified successfully');
   * } else {
   *   console.error('Archive verification failed:', verification.error);
   * }
   */
  async verifyArchive(
    txId: string,
    expectedHash?: string
  ): Promise<VerificationResult> {
    try {
      // Get transaction data
      const data = await this.arweave.transactions.getData(txId, {
        decode: true,
        string: true
      });

      if (!data || data.length === 0) {
        return {
          valid: false,
          txId,
          retrievedAt: new Date().toISOString(),
          dataSize: 0,
          error: 'No data found for transaction'
        };
      }

      // If expected hash provided, verify it
      let hashMatch: boolean | undefined;
      if (expectedHash) {
        const actualHash = this.computeHash(Buffer.from(data as string));
        hashMatch = actualHash === expectedHash;

        if (!hashMatch) {
          return {
            valid: false,
            txId,
            retrievedAt: new Date().toISOString(),
            dataSize: (data as string).length,
            hashMatch: false,
            error: 'Hash mismatch - data may be corrupted'
          };
        }
      }

      // Verification successful
      return {
        valid: true,
        txId,
        retrievedAt: new Date().toISOString(),
        dataSize: (data as string).length,
        hashMatch
      };

    } catch (error) {
      console.error('[ArweaveService] Verification failed:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        valid: false,
        txId,
        retrievedAt: new Date().toISOString(),
        dataSize: 0,
        error: `Verification error: ${message}`
      };
    }
  }

  /**
   * Retrieve archived bundle from Arweave
   *
   * @param txId - Arweave transaction ID
   * @returns Parsed bundle or null if not found
   */
  async retrieveBundle(txId: string): Promise<any | null> {
    try {
      const data = await this.arweave.transactions.getData(txId, {
        decode: true,
        string: true
      });

      if (!data) {
        return null;
      }

      // Parse JSON bundle
      return JSON.parse(data as string);

    } catch (error) {
      console.error(`[ArweaveService] Failed to retrieve bundle ${txId}:`, error);
      return null;
    }
  }

  /**
   * Get transaction tags (metadata)
   *
   * @param txId - Arweave transaction ID
   * @returns Object with tag key-value pairs
   */
  async getTransactionTags(txId: string): Promise<Record<string, string>> {
    try {
      const tx = await this.arweave.transactions.get(txId);
      const tags: Record<string, string> = {};

      tx.tags.forEach((tag: ArweaveTag) => {
        const key = tag.get('name', { decode: true, string: true });
        const value = tag.get('value', { decode: true, string: true });
        tags[key] = value;
      });

      return tags;

    } catch (error) {
      console.error(`[ArweaveService] Failed to get tags for ${txId}:`, error);
      return {};
    }
  }

  /**
   * Compute SHA-256 hash of data
   *
   * @private
   * @param data - Data to hash
   * @returns Hex-encoded SHA-256 hash
   */
  private computeHash(data: Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Get wallet address (if wallet configured)
   *
   * @returns Arweave wallet address or null
   */
  async getWalletAddress(): Promise<string | null> {
    if (!this.walletKey) {
      return null;
    }

    try {
      const address = await this.arweave.wallets.jwkToAddress(this.walletKey);
      return address;
    } catch (error) {
      console.error('[ArweaveService] Failed to get wallet address:', error);
      return null;
    }
  }

  /**
   * Get wallet balance in Winston (smallest unit of AR)
   *
   * @returns Balance in Winston or null if wallet not configured
   */
  async getWalletBalance(): Promise<string | null> {
    const address = await this.getWalletAddress();
    if (!address) {
      return null;
    }

    try {
      const balance = await this.arweave.wallets.getBalance(address);
      return balance;
    } catch (error) {
      console.error('[ArweaveService] Failed to get wallet balance:', error);
      return null;
    }
  }

  /**
   * Convert Winston to AR
   *
   * @param winston - Amount in Winston
   * @returns Amount in AR
   */
  winstonToAr(winston: string): string {
    return this.arweave.ar.winstonToAr(winston);
  }

  /**
   * Convert AR to Winston
   *
   * @param ar - Amount in AR
   * @returns Amount in Winston
   */
  arToWinston(ar: string): string {
    return this.arweave.ar.arToWinston(ar);
  }
}

// ============================================================================
// Singleton Instance (Optional)
// ============================================================================

/**
 * Create singleton instance (requires wallet key from environment)
 *
 * Usage:
 * ```
 * import { arweaveService } from './services/arweaveService';
 * const result = await arweaveService.uploadBundle(...);
 * ```
 */
let _instance: ArweaveService | null = null;

export function getArweaveService(walletKey?: ArweaveJWK): ArweaveService {
  if (!_instance) {
    _instance = new ArweaveService(walletKey);
  }
  return _instance;
}

// Export singleton for convenience
export const arweaveService = getArweaveService();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Load Arweave wallet from environment or file
 *
 * Checks in order:
 * 1. ARWEAVE_KEYFILE - JSON wallet from Bitwarden Secrets Manager
 * 2. ARWEAVE_WALLET_KEY - Direct JSON wallet in environment
 * 3. ARWEAVE_WALLET_PATH - Path to wallet JSON file
 *
 * @returns JWK wallet object or null
 */
export async function loadWalletFromEnv(): Promise<ArweaveJWK | null> {
  // Check for Bitwarden secret first (ARWEAVE_KEYFILE)
  const bitwardenKeyfile = process.env.ARWEAVE_KEYFILE;
  if (bitwardenKeyfile) {
    try {
      console.log('[ArweaveService] Loading wallet from Bitwarden ARWEAVE_KEYFILE');
      return JSON.parse(bitwardenKeyfile);
    } catch (error) {
      console.error('[ArweaveService] Failed to parse ARWEAVE_KEYFILE:', error);
      return null;
    }
  }

  // Check for direct JSON wallet key
  const walletJson = process.env.ARWEAVE_WALLET_KEY;
  if (walletJson) {
    try {
      return JSON.parse(walletJson);
    } catch (error) {
      console.error('[ArweaveService] Failed to parse ARWEAVE_WALLET_KEY:', error);
      return null;
    }
  }

  // Check for wallet file path
  const walletPath = process.env.ARWEAVE_WALLET_PATH;
  if (walletPath) {
    try {
      const fs = await import('fs/promises');
      const walletData = await fs.readFile(walletPath, 'utf-8');
      return JSON.parse(walletData);
    } catch (error) {
      console.error(`[ArweaveService] Failed to load wallet from ${walletPath}:`, error);
      return null;
    }
  }

  console.warn('[ArweaveService] No wallet configured (ARWEAVE_KEYFILE, ARWEAVE_WALLET_KEY, or ARWEAVE_WALLET_PATH)');
  return null;
}

// ============================================================================
// Example Usage
// ============================================================================

/*
// Initialize service
const wallet = await loadWalletFromEnv();
const service = new ArweaveService(wallet);

// Upload case bundle
const uploadResult = await service.uploadBundle([
  {
    name: 'complaint.pdf',
    type: 'complaint',
    content: pdfBuffer
  },
  {
    name: 'research-memo.md',
    type: 'memo',
    content: memoMarkdown
  }
], {
  caseId: 'case-uuid-123',
  caseNumber: '2026-CV-001',
  defendant: 'City Police Department',
  jurisdiction: 'U.S. District Court - Northern District of California',
  stage: 'pleadings',
  timestamp: new Date().toISOString(),
  documentCount: 2
});

console.log('Archived to Arweave:', uploadResult.txId);

// Verify archive
const verification = await service.verifyArchive(
  uploadResult.txId,
  uploadResult.bundleHash
);

if (verification.valid) {
  console.log('Archive verified successfully');
} else {
  console.error('Verification failed:', verification.error);
}

// Retrieve bundle
const bundle = await service.retrieveBundle(uploadResult.txId);
console.log('Retrieved documents:', bundle.documents);
*/
