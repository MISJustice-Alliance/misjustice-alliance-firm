/**
 * DocumentService Unit Tests
 *
 * Tests for document business logic and Arweave archival
 */

import { DocumentService } from '../../src/services/DocumentService';
import { DocumentRepository } from '../../src/repositories/DocumentRepository';
import { ArweaveService } from '../../src/services/arweaveService';
import { getDocumentAnalysisService } from '../../src/services/DocumentAnalysisService';
import { Pool } from 'pg';
import { CreateDocumentDTO, UpdateDocumentDTO, DocumentType, ArnsStatus } from '../../src/models';

// Mock dependencies
jest.mock('../../src/repositories/DocumentRepository');
jest.mock('../../src/services/arweaveService');
jest.mock('../../src/services/DocumentAnalysisService');
jest.mock('pg');
jest.mock('fs/promises');

const mockPool = {} as Pool;

describe('DocumentService', () => {
  let service: DocumentService;
  let mockDocumentRepository: jest.Mocked<DocumentRepository>;
  let mockArweaveService: jest.Mocked<ArweaveService>;
  let mockAnalysisService: any;

  const mockDocument = {
    id: 'doc-123',
    caseId: 'case-456',
    documentType: DocumentType.EVIDENCE,
    documentName: 'test-document.pdf',
    filePath: '/path/to/test.pdf',
    arweaveTxId: 'arweave-tx-123',
    documentHash: 'hash-abc',
    md5Hash: 'md5-hash-abc',
    fileSize: 1024,
    synopsis: 'Test synopsis',
    tags: ['test', 'evidence'],
    arnsStatus: ArnsStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    mockDocumentRepository = {
      findByCaseId: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findPendingArchival: jest.fn(),
      findPendingAnalysis: jest.fn(),
      getStatsByCaseId: jest.fn(),
    } as any;

    mockArweaveService = {
      uploadBundle: jest.fn(),
      verifyArchive: jest.fn(),
    } as any;

    mockAnalysisService = {
      analyzeDocument: jest.fn(),
    };

    (DocumentRepository as jest.Mock).mockImplementation(() => mockDocumentRepository);
    (ArweaveService as jest.Mock).mockImplementation(() => mockArweaveService);
    (getDocumentAnalysisService as jest.Mock).mockReturnValue(mockAnalysisService);

    service = new DocumentService(mockPool, mockArweaveService);

    // Mock file system operations
    const fs = require('fs/promises');
    fs.readFile = jest.fn().mockResolvedValue(Buffer.from('test file content'));
  });

  describe('getDocumentsByCaseId', () => {
    it('should return all documents for a case', async () => {
      const documents = [mockDocument, { ...mockDocument, id: 'doc-789' }];
      mockDocumentRepository.findByCaseId.mockResolvedValue(documents);

      const result = await service.getDocumentsByCaseId('case-456');

      expect(result).toEqual(documents);
      expect(mockDocumentRepository.findByCaseId).toHaveBeenCalledWith('case-456');
    });

    it('should return empty array when no documents found', async () => {
      mockDocumentRepository.findByCaseId.mockResolvedValue([]);

      const result = await service.getDocumentsByCaseId('case-999');

      expect(result).toEqual([]);
    });
  });

  describe('getDocumentById', () => {
    it('should return document when found', async () => {
      mockDocumentRepository.findById.mockResolvedValue(mockDocument);

      const result = await service.getDocumentById('doc-123');

      expect(result).toEqual(mockDocument);
      expect(mockDocumentRepository.findById).toHaveBeenCalledWith('doc-123');
    });

    it('should return null when document not found', async () => {
      mockDocumentRepository.findById.mockResolvedValue(null);

      const result = await service.getDocumentById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createDocument', () => {
    it('should create a new document', async () => {
      const createDto: CreateDocumentDTO = {
        caseId: 'case-456',
        documentType: DocumentType.EVIDENCE,
        documentName: 'new-document.pdf',
        filePath: '/path/to/new.pdf',
      };

      mockDocumentRepository.create.mockResolvedValue(mockDocument);

      const result = await service.createDocument(createDto);

      expect(result).toEqual(mockDocument);
      expect(mockDocumentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          caseId: createDto.caseId,
          documentType: createDto.documentType,
          documentName: createDto.documentName,
          filePath: createDto.filePath,
          documentHash: expect.any(String), // Hash computed from file
        })
      );
    });
  });

  describe('updateDocument', () => {
    it('should update document fields', async () => {
      const updateDto: UpdateDocumentDTO = {
        documentName: 'updated.pdf',
        synopsis: 'Updated synopsis',
      };

      const updatedDoc = { ...mockDocument, ...updateDto };
      mockDocumentRepository.update.mockResolvedValue(updatedDoc);

      const result = await service.updateDocument('doc-123', updateDto);

      expect(result).toEqual(updatedDoc);
      expect(mockDocumentRepository.update).toHaveBeenCalledWith('doc-123', updateDto);
    });

    it('should return null when document not found', async () => {
      mockDocumentRepository.update.mockResolvedValue(null);

      const result = await service.updateDocument('nonexistent', {});

      expect(result).toBeNull();
    });
  });

  describe('deleteDocument', () => {
    it('should delete document successfully', async () => {
      mockDocumentRepository.delete.mockResolvedValue(true);

      const result = await service.deleteDocument('doc-123');

      expect(result).toBe(true);
      expect(mockDocumentRepository.delete).toHaveBeenCalledWith('doc-123');
    });

    it('should return false when document not found', async () => {
      mockDocumentRepository.delete.mockResolvedValue(false);

      const result = await service.deleteDocument('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('getPendingArchivalDocuments', () => {
    it('should return documents pending archival', async () => {
      const pendingDocs = [
        { ...mockDocument, arweaveTxId: null },
        { ...mockDocument, id: 'doc-789', arweaveTxId: null },
      ];
      mockDocumentRepository.findPendingArchival.mockResolvedValue(pendingDocs);

      const result = await service.getPendingArchivalDocuments();

      expect(result).toEqual(pendingDocs);
      expect(mockDocumentRepository.findPendingArchival).toHaveBeenCalled();
    });
  });

  describe('archiveDocument', () => {
    const mockCaseMetadata = {
      caseId: 'case-456',
      caseNumber: 'CR-2025-001',
      defendant: 'Test Defendant',
      jurisdiction: 'Montana',
      stage: 'pleadings' as const,
      timestamp: new Date().toISOString(),
    };

    it('should archive document successfully', async () => {
      const docWithoutArweave = { ...mockDocument, arweaveTxId: null };
      mockDocumentRepository.findById.mockResolvedValue(docWithoutArweave);
      mockArweaveService.uploadBundle.mockResolvedValue({
        txId: 'arweave-tx-new',
        bundleHash: 'bundle-hash-123',
        uploadedAt: new Date().toISOString(),
        byteSize: 1024,
      });
      mockDocumentRepository.update.mockResolvedValue({
        ...mockDocument,
        arweaveTxId: 'arweave-tx-new',
      });

      const result = await service.archiveDocument('doc-123', mockCaseMetadata);

      expect(result.success).toBe(true);
      expect(result.arweaveTxId).toBe('arweave-tx-new');
      expect(mockArweaveService.uploadBundle).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: mockDocument.documentName,
            type: mockDocument.documentType,
          }),
        ]),
        expect.objectContaining({
          ...mockCaseMetadata,
          documentCount: 1,
        })
      );
      expect(mockDocumentRepository.update).toHaveBeenCalledWith(
        'doc-123',
        expect.objectContaining({ arweaveTxId: 'arweave-tx-new' })
      );
    });

    it('should return error when document not found', async () => {
      mockDocumentRepository.findById.mockResolvedValue(null);

      const result = await service.archiveDocument('nonexistent', mockCaseMetadata);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should return error when document already archived', async () => {
      mockDocumentRepository.findById.mockResolvedValue(mockDocument);

      const result = await service.archiveDocument('doc-123', mockCaseMetadata);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already archived');
    });

    it('should return error when file path missing', async () => {
      mockDocumentRepository.findById.mockResolvedValue({
        ...mockDocument,
        arweaveTxId: null,
        filePath: null,
      });

      const result = await service.archiveDocument('doc-123', mockCaseMetadata);

      expect(result.success).toBe(false);
      expect(result.error).toContain('file path');
    });

    it('should handle uploadBundle errors', async () => {
      const docWithoutArweave = { ...mockDocument, arweaveTxId: null };
      mockDocumentRepository.findById.mockResolvedValue(docWithoutArweave);
      mockArweaveService.uploadBundle.mockRejectedValue(new Error('Upload failed'));

      const result = await service.archiveDocument('doc-123', mockCaseMetadata);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Upload failed');
    });
  });

  describe('archiveCaseDocuments', () => {
    const mockCaseMetadata = {
      caseId: 'case-456',
      caseNumber: 'CR-2025-001',
      defendant: 'Test Defendant',
      jurisdiction: 'Montana',
      stage: 'pleadings' as const,
      timestamp: new Date().toISOString(),
    };

    it('should archive multiple documents for a case', async () => {
      const pendingDocs = [
        { ...mockDocument, id: 'doc-1', arweaveTxId: null, filePath: '/path/1.pdf' },
        { ...mockDocument, id: 'doc-2', arweaveTxId: null, filePath: '/path/2.pdf' },
      ];

      mockDocumentRepository.findByCaseId.mockResolvedValue(pendingDocs);
      mockDocumentRepository.findById
        .mockResolvedValueOnce(pendingDocs[0])
        .mockResolvedValueOnce(pendingDocs[1]);
      mockArweaveService.uploadBundle.mockResolvedValue({
        txId: 'arweave-tx-batch',
        bundleHash: 'bundle-hash',
        uploadedAt: new Date().toISOString(),
        byteSize: 2048,
      });
      mockDocumentRepository.update.mockResolvedValue(mockDocument);

      const result = await service.archiveCaseDocuments('case-456', mockCaseMetadata);

      expect(result.totalDocuments).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('should handle partial failures in batch archival', async () => {
      const docs = [
        { ...mockDocument, id: 'doc-1', arweaveTxId: null, filePath: '/path/1.pdf' },
        { ...mockDocument, id: 'doc-2', arweaveTxId: null, filePath: '/path/2.pdf' },
      ];

      mockDocumentRepository.findByCaseId.mockResolvedValue(docs);
      mockDocumentRepository.findById
        .mockResolvedValueOnce(docs[0])
        .mockResolvedValueOnce(docs[1]);
      mockArweaveService.uploadBundle
        .mockResolvedValueOnce({
          txId: 'tx-1',
          bundleHash: 'hash-1',
          uploadedAt: new Date().toISOString(),
          byteSize: 1024,
        })
        .mockRejectedValueOnce(new Error('Upload failed'));
      mockDocumentRepository.update.mockResolvedValueOnce(mockDocument);

      const result = await service.archiveCaseDocuments('case-456', mockCaseMetadata);

      expect(result.totalDocuments).toBe(2);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
    });

    it('should return zero results when no pending documents', async () => {
      mockDocumentRepository.findByCaseId.mockResolvedValue([mockDocument]); // Already archived

      const result = await service.archiveCaseDocuments('case-456', mockCaseMetadata);

      expect(result.totalDocuments).toBe(0);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(0);
    });
  });

  describe('getDocumentStats', () => {
    it('should return document statistics', async () => {
      const stats = {
        totalDocuments: 10,
        archivedDocuments: 8,
        pendingArchival: 2,
        totalSizeBytes: 1048576,
      };

      mockDocumentRepository.getStatsByCaseId.mockResolvedValue(stats);

      const result = await service.getDocumentStats('case-456');

      expect(result).toEqual(stats);
      expect(mockDocumentRepository.getStatsByCaseId).toHaveBeenCalledWith('case-456');
    });
  });

  describe('verifyArchivedDocument', () => {
    it('should verify archived document successfully', async () => {
      mockDocumentRepository.findById.mockResolvedValue(mockDocument);
      mockArweaveService.verifyArchive.mockResolvedValue({
        valid: true,
        txId: 'arweave-tx-123',
        retrievedAt: new Date().toISOString(),
        dataSize: 1024,
        hashMatch: true,
      });

      const result = await service.verifyArchivedDocument('doc-123');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockArweaveService.verifyArchive).toHaveBeenCalledWith('arweave-tx-123', 'hash-abc');
    });

    it('should return error when document not found', async () => {
      mockDocumentRepository.findById.mockResolvedValue(null);

      const result = await service.verifyArchivedDocument('nonexistent');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should return error when document not archived', async () => {
      mockDocumentRepository.findById.mockResolvedValue({
        ...mockDocument,
        arweaveTxId: null,
      });

      const result = await service.verifyArchivedDocument('doc-123');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('not archived');
    });

    it('should return error when verification fails', async () => {
      mockDocumentRepository.findById.mockResolvedValue(mockDocument);
      mockArweaveService.verifyArchive.mockResolvedValue({
        valid: false,
        txId: 'arweave-tx-123',
        retrievedAt: new Date().toISOString(),
        dataSize: 0,
        error: 'Transaction not found on Arweave',
      });

      const result = await service.verifyArchivedDocument('doc-123');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Transaction not found on Arweave');
    });
  });

  describe('analyzeDocument', () => {
    it('should analyze document successfully', async () => {
      const docWithoutSynopsis = { ...mockDocument, synopsis: null };
      mockDocumentRepository.findById.mockResolvedValue(docWithoutSynopsis);
      mockDocumentRepository.updateSynopsisAndTags = jest.fn();
      mockAnalysisService.analyzeDocument.mockResolvedValue({
        synopsis: 'AI-generated synopsis',
        tags: ['evidence', 'police-report'],
        tokenUsage: { prompt_tokens: 100, completion_tokens: 50 },
      });

      const result = await service.analyzeDocument('doc-123');

      expect(result.success).toBe(true);
      expect(result.synopsis).toBe('AI-generated synopsis');
      expect(result.tags).toEqual(['evidence', 'police-report']);
      expect(mockAnalysisService.analyzeDocument).toHaveBeenCalledWith(
        mockDocument.filePath,
        mockDocument.documentName
      );
      expect(mockDocumentRepository.updateSynopsisAndTags).toHaveBeenCalledWith(
        'doc-123',
        'AI-generated synopsis',
        ['evidence', 'police-report']
      );
    });

    it('should return error when document not found', async () => {
      mockDocumentRepository.findById.mockResolvedValue(null);

      const result = await service.analyzeDocument('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should return already analyzed document if synopsis exists', async () => {
      mockDocumentRepository.findById.mockResolvedValue(mockDocument);

      const result = await service.analyzeDocument('doc-123');

      expect(result.success).toBe(true);
      expect(result.synopsis).toBe('Test synopsis');
      expect(mockAnalysisService.analyzeDocument).not.toHaveBeenCalled();
    });

    it('should return error when file path missing', async () => {
      mockDocumentRepository.findById.mockResolvedValue({
        ...mockDocument,
        filePath: null,
        synopsis: null,
      });

      const result = await service.analyzeDocument('doc-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('file path');
    });

    it('should handle analysis service errors', async () => {
      const docWithoutSynopsis = { ...mockDocument, synopsis: null };
      mockDocumentRepository.findById.mockResolvedValue(docWithoutSynopsis);
      mockAnalysisService.analyzeDocument.mockRejectedValue(new Error('Analysis failed'));

      const result = await service.analyzeDocument('doc-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Analysis failed');
    });
  });

  describe('analyzeCaseDocuments', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      mockDocumentRepository.updateSynopsisAndTags = jest.fn();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should analyze multiple documents for a case', async () => {
      const docs = [
        { ...mockDocument, id: 'doc-1', synopsis: null, filePath: '/path/1.pdf' },
        { ...mockDocument, id: 'doc-2', synopsis: null, filePath: '/path/2.pdf' },
      ];

      mockDocumentRepository.findPendingAnalysis.mockResolvedValue(docs);
      mockDocumentRepository.findById
        .mockResolvedValueOnce(docs[0])
        .mockResolvedValueOnce(docs[1]);
      mockAnalysisService.analyzeDocument.mockResolvedValue({
        synopsis: 'Synopsis',
        tags: ['tag'],
        tokenUsage: { prompt_tokens: 100, completion_tokens: 50 },
      });

      const promise = service.analyzeCaseDocuments('case-456');
      await jest.advanceTimersByTimeAsync(2000); // Skip delays
      const result = await promise;

      expect(result.totalDocuments).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('should handle partial failures in batch analysis', async () => {
      const docs = [
        { ...mockDocument, id: 'doc-1', synopsis: null, filePath: '/path/1.pdf' },
        { ...mockDocument, id: 'doc-2', synopsis: null, filePath: '/path/2.pdf' },
      ];

      mockDocumentRepository.findPendingAnalysis.mockResolvedValue(docs);
      mockDocumentRepository.findById
        .mockResolvedValueOnce(docs[0])
        .mockResolvedValueOnce(null); // Second doc not found

      mockAnalysisService.analyzeDocument.mockResolvedValue({
        synopsis: 'Synopsis',
        tags: ['tag'],
        tokenUsage: { prompt_tokens: 100, completion_tokens: 50 },
      });

      const promise = service.analyzeCaseDocuments('case-456');
      await jest.advanceTimersByTimeAsync(2000); // Skip delays
      const result = await promise;

      expect(result.totalDocuments).toBe(2);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
    });
  });

  describe('getPendingAnalysisDocuments', () => {
    it('should return all pending analysis documents', async () => {
      const pendingDocs = [
        { ...mockDocument, synopsis: null },
        { ...mockDocument, id: 'doc-789', synopsis: null },
      ];
      mockDocumentRepository.findPendingAnalysis.mockResolvedValue(pendingDocs);

      const result = await service.getPendingAnalysisDocuments();

      expect(result).toEqual(pendingDocs);
      expect(mockDocumentRepository.findPendingAnalysis).toHaveBeenCalledWith(undefined);
    });

    it('should filter by case ID when provided', async () => {
      const pendingDocs = [{ ...mockDocument, synopsis: null }];
      mockDocumentRepository.findPendingAnalysis.mockResolvedValue(pendingDocs);

      const result = await service.getPendingAnalysisDocuments('case-456');

      expect(result).toEqual(pendingDocs);
      expect(mockDocumentRepository.findPendingAnalysis).toHaveBeenCalledWith('case-456');
    });
  });
});
