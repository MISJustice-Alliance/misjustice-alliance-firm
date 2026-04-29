/**
 * Document Service
 * Business logic for document management and Arweave archival
 */

import { Pool } from 'pg';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';
import { DocumentRepository } from '../repositories/DocumentRepository';
import {
  ArweaveService,
  ArchiveDocument,
  CaseBundleMetadata,
  UploadResult,
} from './arweaveService';
import {
  Document,
  CreateDocumentDTO,
  UpdateDocumentDTO,
} from '../models/Document';
import { getDocumentAnalysisService } from './DocumentAnalysisService';
import { logger } from '../utils/logger';

/**
 * Result of archival operation
 */
export interface ArchivalResult {
  success: boolean;
  documentId: string;
  arweaveTxId?: string;
  error?: string;
}

/**
 * Batch archival result
 */
export interface BatchArchivalResult {
  totalDocuments: number;
  successful: number;
  failed: number;
  results: ArchivalResult[];
}

/**
 * Result of document analysis operation
 */
export interface DocumentAnalysisResult {
  success: boolean;
  documentId: string;
  synopsis?: string;
  tags?: string[];
  error?: string;
}

/**
 * Batch analysis result
 */
export interface BatchAnalysisResult {
  totalDocuments: number;
  successful: number;
  failed: number;
  results: DocumentAnalysisResult[];
}

export class DocumentService {
  private documentRepository: DocumentRepository;
  private arweaveService: ArweaveService;

  constructor(pool: Pool, arweaveService: ArweaveService) {
    this.documentRepository = new DocumentRepository(pool);
    this.arweaveService = arweaveService;
  }

  /**
   * Get all documents for a case
   */
  async getDocumentsByCaseId(caseId: string): Promise<Document[]> {
    return this.documentRepository.findByCaseId(caseId);
  }

  /**
   * Get a single document by ID
   */
  async getDocumentById(id: string): Promise<Document | null> {
    return this.documentRepository.findById(id);
  }

  /**
   * Create a new document
   */
  async createDocument(dto: CreateDocumentDTO): Promise<Document> {
    // Compute document hash if file path provided
    let documentHash: string | undefined;
    if (dto.filePath) {
      try {
        documentHash = await this.computeFileHash(dto.filePath);
      } catch (error) {
        console.error(`[DocumentService] Failed to compute hash for ${dto.filePath}:`, error);
        // Continue without hash - not critical for creation
      }
    }

    return this.documentRepository.create({
      ...dto,
      documentHash: documentHash || dto.documentHash,
    });
  }

  /**
   * Update a document
   */
  async updateDocument(id: string, dto: UpdateDocumentDTO): Promise<Document | null> {
    return this.documentRepository.update(id, dto);
  }

  /**
   * Delete a document
   */
  async deleteDocument(id: string): Promise<boolean> {
    return this.documentRepository.delete(id);
  }

  /**
   * Get documents awaiting Arweave archival
   */
  async getPendingArchivalDocuments(): Promise<Document[]> {
    return this.documentRepository.findPendingArchival();
  }

  /**
   * Archive a single document to Arweave
   */
  async archiveDocument(
    documentId: string,
    caseMetadata: Omit<CaseBundleMetadata, 'documentCount'>
  ): Promise<ArchivalResult> {
    try {
      // Get document from database
      const document = await this.documentRepository.findById(documentId);

      if (!document) {
        return {
          success: false,
          documentId,
          error: 'Document not found',
        };
      }

      if (document.arweaveTxId) {
        return {
          success: false,
          documentId,
          error: 'Document already archived',
          arweaveTxId: document.arweaveTxId,
        };
      }

      if (!document.filePath) {
        return {
          success: false,
          documentId,
          error: 'Document has no file path',
        };
      }

      // Read document file content
      const fileContent = await this.readDocumentFile(document.filePath);

      if (!fileContent) {
        return {
          success: false,
          documentId,
          error: `Failed to read file: ${document.filePath}`,
        };
      }

      // Prepare document for archival
      const archiveDoc: ArchiveDocument = {
        name: document.documentName,
        type: document.documentType,
        content: fileContent,
        hash: document.documentHash || undefined,
      };

      // Upload to Arweave
      const uploadResult: UploadResult = await this.arweaveService.uploadBundle(
        [archiveDoc],
        {
          ...caseMetadata,
          documentCount: 1,
        }
      );

      // Update document with Arweave TX ID
      await this.documentRepository.update(documentId, {
        arweaveTxId: uploadResult.txId,
      });

      console.log(`[DocumentService] Document ${documentId} archived to Arweave: ${uploadResult.txId}`);

      return {
        success: true,
        documentId,
        arweaveTxId: uploadResult.txId,
      };

    } catch (error) {
      console.error(`[DocumentService] Failed to archive document ${documentId}:`, error);
      return {
        success: false,
        documentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Archive multiple documents for a case in batch
   */
  async archiveCaseDocuments(
    caseId: string,
    caseMetadata: Omit<CaseBundleMetadata, 'documentCount'>
  ): Promise<BatchArchivalResult> {
    const documents = await this.documentRepository.findByCaseId(caseId);
    const pendingDocuments = documents.filter(doc => !doc.arweaveTxId);

    if (pendingDocuments.length === 0) {
      return {
        totalDocuments: 0,
        successful: 0,
        failed: 0,
        results: [],
      };
    }

    console.log(`[DocumentService] Archiving ${pendingDocuments.length} documents for case ${caseId}`);

    const results: ArchivalResult[] = [];
    let successful = 0;
    let failed = 0;

    // Archive each document individually
    // Note: Could be optimized to bundle multiple documents in single Arweave transaction
    for (const doc of pendingDocuments) {
      const result = await this.archiveDocument(doc.id, caseMetadata);
      results.push(result);

      if (result.success) {
        successful++;
      } else {
        failed++;
      }
    }

    return {
      totalDocuments: pendingDocuments.length,
      successful,
      failed,
      results,
    };
  }

  /**
   * Get document statistics for a case
   */
  async getDocumentStats(caseId: string): Promise<{
    totalDocuments: number;
    archivedDocuments: number;
    pendingArchival: number;
    totalSizeBytes: number;
  }> {
    return this.documentRepository.getStatsByCaseId(caseId);
  }

  /**
   * Verify archived document integrity
   */
  async verifyArchivedDocument(documentId: string): Promise<{
    valid: boolean;
    error?: string;
  }> {
    const document = await this.documentRepository.findById(documentId);

    if (!document) {
      return { valid: false, error: 'Document not found' };
    }

    if (!document.arweaveTxId) {
      return { valid: false, error: 'Document not archived yet' };
    }

    try {
      const verification = await this.arweaveService.verifyArchive(
        document.arweaveTxId,
        document.documentHash || undefined
      );

      return {
        valid: verification.valid,
        error: verification.error,
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  /**
   * Analyze a single document to generate synopsis and tags
   */
  async analyzeDocument(documentId: string): Promise<DocumentAnalysisResult> {
    try {
      const document = await this.documentRepository.findById(documentId);

      if (!document) {
        return {
          success: false,
          documentId,
          error: 'Document not found',
        };
      }

      if (!document.filePath) {
        return {
          success: false,
          documentId,
          error: 'Document has no file path',
        };
      }

      // Check if already analyzed
      if (document.synopsis) {
        return {
          success: true,
          documentId,
          synopsis: document.synopsis,
          tags: document.tags || [],
        };
      }

      logger.info('Analyzing document', { documentId, documentName: document.documentName });

      // Get analysis service and analyze document
      const analysisService = getDocumentAnalysisService();
      const analysis = await analysisService.analyzeDocument(
        document.filePath,
        document.documentName
      );

      // Update document with analysis results
      await this.documentRepository.updateSynopsisAndTags(
        documentId,
        analysis.synopsis,
        analysis.tags
      );

      logger.info('Document analysis complete', {
        documentId,
        synopsis: analysis.synopsis.slice(0, 100),
        tags: analysis.tags,
      });

      return {
        success: true,
        documentId,
        synopsis: analysis.synopsis,
        tags: analysis.tags,
      };

    } catch (error) {
      logger.error('Failed to analyze document', { documentId, error });
      return {
        success: false,
        documentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Analyze all pending documents for a case
   */
  async analyzeCaseDocuments(caseId: string): Promise<BatchAnalysisResult> {
    const pendingDocuments = await this.documentRepository.findPendingAnalysis(caseId);

    if (pendingDocuments.length === 0) {
      return {
        totalDocuments: 0,
        successful: 0,
        failed: 0,
        results: [],
      };
    }

    logger.info(`Analyzing ${pendingDocuments.length} documents for case ${caseId}`);

    const results: DocumentAnalysisResult[] = [];
    let successful = 0;
    let failed = 0;

    for (const doc of pendingDocuments) {
      const result = await this.analyzeDocument(doc.id);
      results.push(result);

      if (result.success) {
        successful++;
      } else {
        failed++;
      }

      // Add small delay between API calls to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return {
      totalDocuments: pendingDocuments.length,
      successful,
      failed,
      results,
    };
  }

  /**
   * Get documents pending analysis for a case
   */
  async getPendingAnalysisDocuments(caseId?: string): Promise<Document[]> {
    return this.documentRepository.findPendingAnalysis(caseId);
  }

  /**
   * Read document file from storage
   */
  private async readDocumentFile(filePath: string): Promise<Buffer | null> {
    try {
      return await fs.readFile(filePath);
    } catch (error) {
      console.error(`[DocumentService] Failed to read file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Compute SHA-256 hash of file
   */
  private async computeFileHash(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}
