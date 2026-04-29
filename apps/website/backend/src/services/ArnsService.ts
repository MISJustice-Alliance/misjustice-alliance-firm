/**
 * ArNS (Arweave Name System) Service
 *
 * Manages registration and lifecycle of ArNS undernames for individual
 * archived documents, providing human-readable URLs using the AO network.
 *
 * Example: cr-2024-001-complaint_misjusticealliance.arweave.net
 */

import { ANT, ArweaveSigner } from '@ar.io/sdk';
import { logger } from '../utils/logger';
import { DocumentRepository } from '../repositories/DocumentRepository';
import { ArnsStatus } from '../models/Document';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Configuration for ArNS service
 */
interface ArnsConfig {
  walletPath: string; // Path to Arweave JWK file
  antProcessId: string; // ANT AO process ID
  mainArnsName: string; // Main ArNS name (e.g., 'misjusticealliance')
  defaultTtl: number; // Time-to-live in seconds (3600 = 1 hour)
}

/**
 * Parameters for registering a new ArNS undername
 */
interface RegisterUnderParams {
  caseNumber: string;
  documentType: string;
  arweaveTxId: string;
  sequence?: number;
}

/**
 * Result of undername registration
 */
interface RegistrationResult {
  undername: string;
  fullUndername: string;
  url: string;
  txId: string;
}

/**
 * Error thrown when ArNS undername is already taken
 */
export class UndernameAlreadyExistsError extends Error {
  constructor(undername: string) {
    super(`ArNS undername already registered: ${undername}`);
    this.name = 'UndernameAlreadyExistsError';
  }
}

/**
 * Error thrown when ANT operation fails
 */
export class ArnsApiError extends Error {
  public readonly statusCode: number;
  public readonly cause?: Error;

  constructor(message: string, statusCode: number = 500, cause?: Error) {
    super(message);
    this.name = 'ArnsApiError';
    this.statusCode = statusCode;
    this.cause = cause;
  }
}

/**
 * ArNS Service Class
 */
export class ArnsService {
  private readonly config: ArnsConfig;
  private readonly documentRepository: DocumentRepository;
  private antClient: ReturnType<typeof ANT.init> | null = null;

  constructor(documentRepository: DocumentRepository, config?: Partial<ArnsConfig>) {
    this.documentRepository = documentRepository;

    // Default configuration
    this.config = {
      walletPath: config?.walletPath ||
        process.env.ARWEAVE_WALLET_PATH ||
        './backups/arweave-keyfile/arweave-keyfile-9GDgPda_R1sBkPovm2dI6u5snnGk1Bhb3IipeF3LCaQ-misjusticealliance.json',
      antProcessId: config?.antProcessId ||
        process.env.ANT_PROCESS_ID ||
        'iBwPYGTN04CpGT65CKfHGEeekTyzRjP2TtCUIlk96eM',
      mainArnsName: config?.mainArnsName ||
        process.env.MAIN_ARNS_NAME ||
        'misjusticealliance',
      defaultTtl: config?.defaultTtl || 3600,
    };
  }

  /**
   * Initialize ANT client with signer
   * Lazy-loaded on first use
   */
  private async getAntClient() {
    if (this.antClient) {
      return this.antClient;
    }

    try {
      let jwk;

      // Check for Bitwarden ARWEAVE_KEYFILE first (JSON string in env var)
      const arweaveKeyfile = process.env.ARWEAVE_KEYFILE;
      if (arweaveKeyfile) {
        logger.info('Loading ANT wallet from Bitwarden ARWEAVE_KEYFILE');
        jwk = JSON.parse(arweaveKeyfile);
      } else {
        // Fall back to reading from file
        const walletPath = path.resolve(this.config.walletPath);
        logger.info('Loading ANT wallet from file', { walletPath });
        const jwkData = fs.readFileSync(walletPath, 'utf-8');
        jwk = JSON.parse(jwkData);
      }

      // Create signer from JWK
      const signer = new ArweaveSigner(jwk);

      // Initialize ANT client
      this.antClient = ANT.init({
        signer,
        processId: this.config.antProcessId,
      });

      logger.info('ANT client initialized successfully', {
        processId: this.config.antProcessId,
        arnsName: this.config.mainArnsName,
      });

      return this.antClient;
    } catch (error) {
      logger.error('Failed to initialize ANT client', {
        error: error instanceof Error ? error.message : 'Unknown error',
        walletPath: this.config.walletPath,
      });
      throw new ArnsApiError(
        'Failed to initialize ANT client',
        500,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Register an ArNS undername for a document
   *
   * @param params - Registration parameters
   * @returns Registration result with undername and URL
   * @throws UndernameAlreadyExistsError if undername is taken
   * @throws ArnsApiError if ANT operation fails
   */
  async registerUndername(params: RegisterUnderParams): Promise<RegistrationResult> {
    const { caseNumber, documentType, arweaveTxId, sequence = 1 } = params;

    // Generate undername following naming convention
    const undername = this.generateUndername(caseNumber, documentType, sequence);
    const fullUndername = `${undername}_${this.config.mainArnsName}`;

    logger.info('Registering ArNS undername', {
      undername,
      fullUndername,
      arweaveTxId,
      caseNumber,
      documentType,
    });

    // Check if undername is already taken
    const exists = await this.checkUndernameTaken(undername);
    if (exists) {
      logger.warn('ArNS undername already exists', { undername });
      throw new UndernameAlreadyExistsError(fullUndername);
    }

    try {
      // Get ANT client
      const ant = await this.getAntClient();

      // Set undername record via AO network message
      const result = await ant.setUndernameRecord({
        undername,
        transactionId: arweaveTxId,
        ttlSeconds: this.config.defaultTtl,
      });

      const registrationTxId = result.id;

      logger.info('ArNS undername registered successfully', {
        undername,
        fullUndername,
        registrationTxId,
        arweaveTxId,
      });

      return {
        undername,
        fullUndername,
        url: `https://${fullUndername}.arweave.net`,
        txId: registrationTxId,
      };
    } catch (error) {
      logger.error('Failed to register ArNS undername', {
        undername,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new ArnsApiError(
        `Failed to register ArNS undername: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Generate ArNS undername following naming convention
   *
   * Pattern: {case-number}-{document-type}[-{sequence}]
   * Example: cr-2024-001-complaint, cr-2024-001-evidence-2
   *
   * Note: ArNS undernames use underscore (_) separator, not hyphen
   *
   * @param caseNumber - Case number (e.g., "CR-2025-001")
   * @param documentType - Document type (e.g., "complaint", "evidence")
   * @param sequence - Sequence number for duplicate types (default: 1)
   * @returns Sanitized undername
   */
  private generateUndername(
    caseNumber: string,
    documentType: string,
    sequence: number
  ): string {
    // Sanitize case number (lowercase, remove special chars except hyphens)
    const sanitizedCaseNumber = caseNumber
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens

    // Sanitize document type (lowercase, replace spaces/special chars with hyphens)
    const sanitizedDocType = documentType
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-') // Collapse multiple hyphens
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      .substring(0, 30); // Limit length

    // Add sequence number if > 1
    if (sequence > 1) {
      return `${sanitizedCaseNumber}-${sanitizedDocType}-${sequence}`;
    }

    return `${sanitizedCaseNumber}-${sanitizedDocType}`;
  }

  /**
   * Check if an ArNS undername is already taken
   *
   * @param undername - Short undername (without parent domain)
   * @returns True if taken, false if available
   */
  private async checkUndernameTaken(undername: string): Promise<boolean> {
    // Check in local database first (faster)
    const existingDoc = await this.documentRepository.findByArnsUndername(
      `${undername}_${this.config.mainArnsName}`
    );

    if (existingDoc) {
      return true;
    }

    // Query ANT to verify (check if record exists)
    try {
      const ant = await this.getAntClient();
      const records = await ant.getRecords();

      // Check if undername exists in records
      return undername in records;
    } catch (error) {
      // If ANT query fails, rely on database check
      logger.warn('Failed to check undername availability via ANT', {
        undername,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return false; // Assume available if we can't verify
    }
  }

  /**
   * Calculate the next sequence number for a document type within a case
   *
   * Used when multiple documents of the same type exist (e.g., evidence-1, evidence-2)
   *
   * @param caseId - UUID of the case
   * @param documentType - Type of document
   * @returns Next sequence number (starting from 1)
   */
  async getNextSequenceNumber(caseId: string, documentType: string): Promise<number> {
    const existingDocs = await this.documentRepository.findByCaseAndType(caseId, documentType);

    // Count ALL documents with Arweave TX IDs (regardless of ArNS status)
    // This ensures idempotent sequence numbering - script restarts won't cause conflicts
    // If a document has an Arweave TX ID, it should get a sequence number
    const documentCount = existingDocs.filter(
      (doc) => doc.arweaveTxId !== null && doc.arweaveTxId !== undefined
    ).length;

    return documentCount + 1;
  }

  /**
   * Batch register ArNS undernames for multiple documents
   *
   * @param documentIds - Array of document UUIDs
   * @returns Array of registration results with success/failure status
   */
  async batchRegisterUndernames(
    documentIds: string[]
  ): Promise<Array<{ documentId: string; success: boolean; result?: RegistrationResult; error?: string }>> {
    const results = [];

    for (const documentId of documentIds) {
      try {
        // Get document details
        const document = await this.documentRepository.findById(documentId);

        if (!document) {
          results.push({
            documentId,
            success: false,
            error: 'Document not found',
          });
          continue;
        }

        if (!document.arweaveTxId) {
          results.push({
            documentId,
            success: false,
            error: 'Document not yet archived to Arweave',
          });
          continue;
        }

        // Get case details for case number
        const caseData = await this.documentRepository.getCaseById(document.caseId);
        if (!caseData) {
          results.push({
            documentId,
            success: false,
            error: 'Associated case not found',
          });
          continue;
        }

        // Calculate sequence number
        const sequence = await this.getNextSequenceNumber(
          document.caseId,
          document.documentType
        );

        // Register undername
        const result = await this.registerUndername({
          caseNumber: caseData.caseNumber,
          documentType: document.documentType,
          arweaveTxId: document.arweaveTxId,
          sequence,
        });

        // Update document in database
        await this.documentRepository.updateArnsInfo(documentId, {
          arnsUndername: result.fullUndername,
          arnsStatus: ArnsStatus.ACTIVE,
          arnsRegisteredAt: new Date(),
          arnsUrl: result.url,
        });

        results.push({
          documentId,
          success: true,
          result,
        });

        logger.info('Batch registration successful', {
          documentId,
          undername: result.fullUndername,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        results.push({
          documentId,
          success: false,
          error: errorMessage,
        });

        logger.error('Batch registration failed for document', {
          documentId,
          error: errorMessage,
        });
      }
    }

    return results;
  }

  /**
   * Renew/update an existing ArNS undername record
   *
   * @param documentId - UUID of document
   * @param newTtl - New TTL in seconds (optional, defaults to config.defaultTtl)
   * @returns Updated registration result
   */
  async renewUndername(documentId: string, newTtl?: number): Promise<RegistrationResult> {
    const document = await this.documentRepository.findById(documentId);

    if (!document || !document.arnsUndername || !document.arweaveTxId) {
      throw new Error('Document or ArNS undername not found');
    }

    // Extract undername from full undername (remove suffix)
    const undername = document.arnsUndername.replace(`_${this.config.mainArnsName}`, '');
    const ttl = newTtl || this.config.defaultTtl;

    try {
      // Get ANT client
      const ant = await this.getAntClient();

      // Update undername record with new TTL
      const result = await ant.setUndernameRecord({
        undername,
        transactionId: document.arweaveTxId,
        ttlSeconds: ttl,
      });

      logger.info('ArNS undername renewed successfully', {
        documentId,
        undername: document.arnsUndername,
        newTtl: ttl,
      });

      return {
        undername,
        fullUndername: document.arnsUndername,
        url: document.arnsUrl!,
        txId: result.id,
      };
    } catch (error) {
      logger.error('Failed to renew ArNS undername', {
        documentId,
        undername: document.arnsUndername,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new ArnsApiError(
        `Failed to renew ArNS undername: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Update an existing ArNS undername to point to a new Arweave TX ID
   *
   * Used when a document has been re-uploaded to Arweave with a new TX ID
   * and the existing undername needs to be updated to point to the new location.
   *
   * @param undername - The short undername (without parent domain suffix)
   * @param newArweaveTxId - The new Arweave transaction ID to point to
   * @returns Updated registration result
   */
  async updateUndername(undername: string, newArweaveTxId: string): Promise<RegistrationResult> {
    const fullUndername = `${undername}_${this.config.mainArnsName}`;

    logger.info('Updating ArNS undername to new TX ID', {
      undername,
      fullUndername,
      newArweaveTxId,
    });

    try {
      // Get ANT client
      const ant = await this.getAntClient();

      // Update undername record with new TX ID
      const result = await ant.setUndernameRecord({
        undername,
        transactionId: newArweaveTxId,
        ttlSeconds: this.config.defaultTtl,
      });

      logger.info('ArNS undername updated successfully', {
        undername,
        fullUndername,
        newArweaveTxId,
        registrationTxId: result.id,
      });

      return {
        undername,
        fullUndername,
        url: `https://${fullUndername}.arweave.net`,
        txId: result.id,
      };
    } catch (error) {
      logger.error('Failed to update ArNS undername', {
        undername,
        newArweaveTxId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new ArnsApiError(
        `Failed to update ArNS undername: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Remove an ArNS undername record
   *
   * @param documentId - UUID of document
   * @returns Transaction ID of removal
   */
  async removeUndername(documentId: string): Promise<string> {
    const document = await this.documentRepository.findById(documentId);

    if (!document || !document.arnsUndername) {
      throw new Error('Document or ArNS undername not found');
    }

    // Extract undername from full undername
    const undername = document.arnsUndername.replace(`_${this.config.mainArnsName}`, '');

    try {
      // Get ANT client
      const ant = await this.getAntClient();

      // Remove undername record
      const result = await ant.removeUndernameRecord({
        undername,
      });

      // Update document in database
      await this.documentRepository.updateArnsInfo(documentId, {
        arnsUndername: undefined,
        arnsStatus: ArnsStatus.NONE,
        arnsRegisteredAt: undefined,
        arnsUrl: undefined,
      });

      logger.info('ArNS undername removed successfully', {
        documentId,
        undername: document.arnsUndername,
      });

      return result.id;
    } catch (error) {
      logger.error('Failed to remove ArNS undername', {
        documentId,
        undername: document.arnsUndername,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new ArnsApiError(
        `Failed to remove ArNS undername: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }
}
