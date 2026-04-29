/**
 * Document Controller
 * HTTP request handlers for document endpoints
 */

import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { DocumentService } from '../services/DocumentService';
import { ArweaveService } from '../services/arweaveService';
import { ArnsService, UndernameAlreadyExistsError, ArnsApiError } from '../services/ArnsService';
import { DocumentRepository } from '../repositories/DocumentRepository';
import { pool } from '../config/database';

// Initialize services
const arweaveService = new ArweaveService();
const documentService = new DocumentService(pool, arweaveService);
const documentRepository = new DocumentRepository(pool);
const arnsService = new ArnsService(documentRepository);

/**
 * Get all documents for a case
 * GET /api/cases/:caseId/documents
 */
export async function getDocumentsByCaseId(req: Request, res: Response): Promise<void> {
  try {
    let { caseId } = req.params;

    // Check if caseId is a case number (e.g., CR-2025-002) and convert to UUID
    const isCaseNumber = /^[A-Z]+-\d{4}-\d{3}$/.test(caseId);
    if (isCaseNumber) {
      const caseData = await pool.query(
        'SELECT id FROM legal_cases WHERE case_number = $1',
        [caseId]
      );
      if (caseData.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Case not found' },
        });
        return;
      }
      caseId = caseData.rows[0].id;
    }

    const documents = await documentService.getDocumentsByCaseId(caseId);

    res.status(200).json({
      success: true,
      data: documents,
      count: documents.length,
    });
  } catch (error) {
    console.error('[documentController] Error fetching documents:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch documents',
      },
    });
  }
}

/**
 * Get a single document by ID
 * GET /api/documents/:id
 */
export async function getDocumentById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const document = await documentService.getDocumentById(id);

    if (!document) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Document not found',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: document,
    });
  } catch (error) {
    console.error('[documentController] Error fetching document:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch document',
      },
    });
  }
}

/**
 * Get document statistics for a case
 * GET /api/cases/:caseId/documents/stats
 */
export async function getDocumentStats(req: Request, res: Response): Promise<void> {
  try {
    const { caseId } = req.params;

    const stats = await documentService.getDocumentStats(caseId);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('[documentController] Error fetching document stats:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch document statistics',
      },
    });
  }
}

/**
 * Archive a document to Arweave
 * POST /api/documents/:id/archive
 */
export async function archiveDocument(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { caseMetadata } = req.body;

    if (!caseMetadata) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Case metadata required for archival',
        },
      });
      return;
    }

    const result = await documentService.archiveDocument(id, caseMetadata);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'ARCHIVAL_FAILED',
          message: result.error || 'Document archival failed',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        documentId: result.documentId,
        arweaveTxId: result.arweaveTxId,
        message: 'Document archived successfully',
      },
    });
  } catch (error) {
    console.error('[documentController] Error archiving document:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to archive document',
      },
    });
  }
}

/**
 * Archive all pending documents for a case
 * POST /api/cases/:caseId/documents/archive
 */
export async function archiveCaseDocuments(req: Request, res: Response): Promise<void> {
  try {
    const { caseId } = req.params;
    const { caseMetadata } = req.body;

    if (!caseMetadata) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Case metadata required for archival',
        },
      });
      return;
    }

    const result = await documentService.archiveCaseDocuments(caseId, caseMetadata);

    res.status(200).json({
      success: true,
      data: result,
      message: `Archived ${result.successful} of ${result.totalDocuments} documents`,
    });
  } catch (error) {
    console.error('[documentController] Error archiving case documents:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to archive case documents',
      },
    });
  }
}

/**
 * Verify archived document integrity
 * GET /api/documents/:id/verify
 */
export async function verifyDocument(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const result = await documentService.verifyArchivedDocument(id);

    if (!result.valid) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VERIFICATION_FAILED',
          message: result.error || 'Document verification failed',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        valid: true,
        message: 'Document verified successfully',
      },
    });
  } catch (error) {
    console.error('[documentController] Error verifying document:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to verify document',
      },
    });
  }
}

/**
 * Register ArNS undername for a document
 * POST /api/admin/documents/:id/arns/register
 */
export async function registerArnsUndername(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Get document details
    const document = await documentRepository.findById(id);

    if (!document) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Document not found',
        },
      });
      return;
    }

    if (!document.arweaveTxId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'NOT_ARCHIVED',
          message: 'Document must be archived to Arweave before registering ArNS undername',
        },
      });
      return;
    }

    // Get case details for case number
    const caseData = await documentRepository.getCaseById(document.caseId);
    if (!caseData) {
      res.status(404).json({
        success: false,
        error: {
          code: 'CASE_NOT_FOUND',
          message: 'Associated case not found',
        },
      });
      return;
    }

    // Calculate sequence number for this document type
    const sequence = await arnsService.getNextSequenceNumber(
      document.caseId,
      document.documentType
    );

    // Register undername
    const result = await arnsService.registerUndername({
      caseNumber: caseData.caseNumber,
      documentType: document.documentType,
      arweaveTxId: document.arweaveTxId,
      sequence,
    });

    // Update document in database
    await documentRepository.updateArnsInfo(id, {
      arnsUndername: result.fullUndername,
      arnsStatus: 'active',
      arnsRegisteredAt: new Date(),
      arnsUrl: result.url,
    });

    res.status(200).json({
      success: true,
      data: {
        documentId: id,
        undername: result.fullUndername,
        url: result.url,
        txId: result.txId,
        message: 'ArNS undername registered successfully',
      },
    });
  } catch (error) {
    if (error instanceof UndernameAlreadyExistsError) {
      res.status(409).json({
        success: false,
        error: {
          code: 'UNDERNAME_EXISTS',
          message: error.message,
        },
      });
      return;
    }

    if (error instanceof ArnsApiError) {
      res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: 'ARNS_API_ERROR',
          message: error.message,
        },
      });
      return;
    }

    console.error('[documentController] Error registering ArNS undername:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to register ArNS undername',
      },
    });
  }
}

/**
 * Batch register ArNS undernames for multiple documents
 * POST /api/admin/documents/arns/batch-register
 */
export async function batchRegisterArnsUndernames(req: Request, res: Response): Promise<void> {
  try {
    const { documentIds } = req.body;

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'documentIds array is required and must not be empty',
        },
      });
      return;
    }

    // Batch register
    const results = await arnsService.batchRegisterUndernames(documentIds);

    // Count successes and failures
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    res.status(200).json({
      success: true,
      data: {
        total: results.length,
        successful,
        failed,
        results,
      },
      message: `Registered ${successful} of ${results.length} ArNS undernames`,
    });
  } catch (error) {
    console.error('[documentController] Error batch registering ArNS undernames:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to batch register ArNS undernames',
      },
    });
  }
}

/**
 * Get document by ArNS undername
 * GET /api/documents/arns/:undername
 */
export async function getDocumentByArnsUndername(req: Request, res: Response): Promise<void> {
  try {
    const { undername } = req.params;

    const document = await documentRepository.findByArnsUndername(undername);

    if (!document) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Document not found for this ArNS undername',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: document,
    });
  } catch (error) {
    console.error('[documentController] Error fetching document by ArNS undername:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch document',
      },
    });
  }
}

/**
 * Renew ArNS undername registration
 * POST /api/admin/documents/:id/arns/renew
 */
export async function renewArnsUndername(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { ttl } = req.body;

    const result = await arnsService.renewUndername(id, ttl);

    res.status(200).json({
      success: true,
      data: {
        documentId: id,
        undername: result.fullUndername,
        url: result.url,
        txId: result.txId,
        message: 'ArNS undername renewed successfully',
      },
    });
  } catch (error) {
    if (error instanceof ArnsApiError) {
      res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: 'ARNS_API_ERROR',
          message: error.message,
        },
      });
      return;
    }

    console.error('[documentController] Error renewing ArNS undername:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to renew ArNS undername',
      },
    });
  }
}

/**
 * Analyze a single document to generate synopsis and tags
 * POST /api/documents/:id/analyze
 */
export async function analyzeDocument(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const result = await documentService.analyzeDocument(id);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'ANALYSIS_FAILED',
          message: result.error || 'Document analysis failed',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        documentId: result.documentId,
        synopsis: result.synopsis,
        tags: result.tags,
        message: 'Document analyzed successfully',
      },
    });
  } catch (error) {
    console.error('[documentController] Error analyzing document:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to analyze document',
      },
    });
  }
}

/**
 * Analyze all pending documents for a case
 * POST /api/cases/:caseId/documents/analyze
 */
export async function analyzeCaseDocuments(req: Request, res: Response): Promise<void> {
  try {
    const { caseId } = req.params;

    const result = await documentService.analyzeCaseDocuments(caseId);

    res.status(200).json({
      success: true,
      data: result,
      message: `Analyzed ${result.successful} of ${result.totalDocuments} documents`,
    });
  } catch (error) {
    console.error('[documentController] Error analyzing case documents:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to analyze case documents',
      },
    });
  }
}

/**
 * Download/serve a local document file
 * GET /api/documents/:id/download
 */
export async function downloadDocument(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Get document details
    const document = await documentRepository.findById(id);

    if (!document) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Document not found',
        },
      });
      return;
    }

    // If document has Arweave TX ID, redirect to Arweave
    if (document.arweaveTxId) {
      const arweaveUrl = document.arnsUrl || `https://arweave.net/${document.arweaveTxId}`;
      res.redirect(302, arweaveUrl);
      return;
    }

    // Check if file path exists
    if (!document.filePath) {
      res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'Document file path not available',
        },
      });
      return;
    }

    // Verify file exists and is within allowed directory
    const filePath = document.filePath;
    const allowedBase = '/app/content-archive';

    // Security: Ensure the path is within the content-archive directory
    const normalizedPath = path.normalize(filePath);
    if (!normalizedPath.startsWith(allowedBase)) {
      console.error(`[documentController] Attempted path traversal: ${filePath}`);
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
      });
      return;
    }

    // Check if file exists
    if (!fs.existsSync(normalizedPath)) {
      res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'Document file not found on server',
        },
      });
      return;
    }

    // Determine content type based on file extension
    const ext = path.extname(document.documentName).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.txt': 'text/plain',
    };
    const contentType = contentTypes[ext] || 'application/octet-stream';

    // Set headers and stream the file
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${document.documentName}"`);

    const fileStream = fs.createReadStream(normalizedPath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('[documentController] Error downloading document:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to download document',
      },
    });
  }
}
