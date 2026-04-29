/**
 * DocumentRepository Unit Tests
 *
 * Tests for document data access layer
 */

import { DocumentRepository } from '../../src/repositories/DocumentRepository';
import { CreateDocumentDTO, UpdateDocumentDTO, DocumentType } from '../../src/models';
import { Pool, QueryResult } from 'pg';

// Mock pg Pool
const mockQuery = jest.fn() as jest.MockedFunction<(text: string, values?: any[]) => Promise<QueryResult>>;
const mockPool = {
  query: mockQuery,
  connect: jest.fn(),
  end: jest.fn(),
  on: jest.fn(),
} as unknown as Pool;

jest.mock('pg', () => ({
  Pool: jest.fn(() => mockPool),
}));

describe('DocumentRepository', () => {
  let repository: DocumentRepository;

  beforeEach(() => {
    repository = new DocumentRepository(mockPool);
    jest.clearAllMocks();
  });

  const mockDocumentRow = {
    id: 'doc-123',
    case_id: 'case-456',
    document_type: DocumentType.EVIDENCE,
    document_name: 'test-document.pdf',
    arweave_tx_id: 'arweave-tx-123',
    document_hash: 'hash123',
    md5_hash: 'md5hash123',
    file_size: 1024,
    synopsis: 'Test synopsis',
    tags: ['test', 'document'],
    evidence_category: 'formal-complaints',
    arns_undername: 'test-doc',
    arns_status: 'active',
    arns_url: 'https://test-doc.arweave.net',
    created_at: new Date(),
    updated_at: new Date(),
  };

  describe('create', () => {
    it('should create a new document', async () => {
      const dto: CreateDocumentDTO = {
        caseId: 'case-456',
        documentType: DocumentType.EVIDENCE,
        documentName: 'test-document.pdf',
        documentHash: 'hash123',
      };

      mockQuery.mockResolvedValue({ rows: [mockDocumentRow], rowCount: 1, command: 'INSERT', oid: 0, fields: [] });

      const result = await repository.create(dto);

      expect(result).toBeDefined();
      expect(result.id).toBe('doc-123');
      expect(result.documentName).toBe('test-document.pdf');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO case_documents'),
        expect.any(Array)
      );
    });

    it('should create document with optional fields', async () => {
      const dto: CreateDocumentDTO = {
        caseId: 'case-456',
        documentType: DocumentType.EVIDENCE,
        documentName: 'test.pdf',
        filePath: '/path/to/test.pdf',
      };

      mockQuery.mockResolvedValue({ rows: [mockDocumentRow], rowCount: 1, command: 'INSERT', oid: 0, fields: [] });

      const result = await repository.create(dto);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO case_documents'),
        expect.arrayContaining(['case-456', 'evidence', 'test.pdf'])
      );
    });

    it('should handle database errors', async () => {
      const dto: CreateDocumentDTO = {
        caseId: 'case-456',
        documentType: DocumentType.EVIDENCE,
        documentName: 'test.pdf',
      };

      mockQuery.mockRejectedValue(new Error('Database error'));

      await expect(repository.create(dto)).rejects.toThrow('Database error');
    });
  });

  describe('findById', () => {
    it('should return document when found', async () => {
      mockQuery.mockResolvedValue({ rows: [mockDocumentRow], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });

      const result = await repository.findById('doc-123');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('doc-123');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['doc-123']
      );
    });

    it('should return null when document not found', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] });

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByCaseId', () => {
    it('should return all documents for a case', async () => {
      const mockRows = [mockDocumentRow, { ...mockDocumentRow, id: 'doc-456' }];

      mockQuery.mockResolvedValue({ rows: mockRows, rowCount: 2, command: 'SELECT', oid: 0, fields: [] });

      const result = await repository.findByCaseId('case-456');

      expect(result).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE case_id = $1'),
        ['case-456']
      );
    });

    it('should return empty array when no documents found', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] });

      const result = await repository.findByCaseId('case-999');

      expect(result).toHaveLength(0);
    });
  });

  describe('findPendingArchival', () => {
    it('should return documents pending archival', async () => {
      const pendingDoc = { ...mockDocumentRow, arweave_tx_id: null };
      mockQuery.mockResolvedValue({ rows: [pendingDoc], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });

      const result = await repository.findPendingArchival();

      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE arweave_tx_id IS NULL')
      );
    });
  });

  describe('findPendingAnalysis', () => {
    it('should return documents pending analysis', async () => {
      const pendingDoc = { ...mockDocumentRow, synopsis: null };
      mockQuery.mockResolvedValue({ rows: [pendingDoc], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });

      const result = await repository.findPendingAnalysis();

      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE synopsis IS NULL'),
        expect.any(Array)
      );
    });

    it('should filter by case ID when provided', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] });

      await repository.findPendingAnalysis('case-123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND case_id = $'),
        expect.arrayContaining(['case-123'])
      );
    });
  });

  describe('update', () => {
    it('should update document fields', async () => {
      const updates: UpdateDocumentDTO = {
        synopsis: 'Updated synopsis',
        tags: ['updated', 'tags'],
        arweaveTxId: 'new-tx-id',
      };

      mockQuery.mockResolvedValue({ rows: [{ ...mockDocumentRow, synopsis: 'Updated synopsis' }], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] });

      const result = await repository.update('doc-123', updates);

      expect(result).not.toBeNull();
      expect(result!.synopsis).toBe('Updated synopsis');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE case_documents'),
        expect.any(Array)
      );
    });

    it('should return null when document not found', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0, command: 'UPDATE', oid: 0, fields: [] });

      const result = await repository.update('nonexistent', { synopsis: 'test' });

      expect(result).toBeNull();
    });

    it('should handle updating multiple fields', async () => {
      const updates: UpdateDocumentDTO = {
        synopsis: 'New synopsis',
        tags: ['tag1', 'tag2'],
        arweaveTxId: 'new-tx',
        documentHash: 'newhash',
        fileSize: 2048,
      };

      mockQuery.mockResolvedValue({ rows: [mockDocumentRow], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] });

      const result = await repository.update('doc-123', updates);

      expect(result).not.toBeNull();
    });
  });

  describe('updateSynopsisAndTags', () => {
    it('should update synopsis and tags', async () => {
      mockQuery.mockResolvedValue({ rows: [mockDocumentRow], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] });

      const result = await repository.updateSynopsisAndTags(
        'doc-123',
        'New synopsis',
        ['tag1', 'tag2']
      );

      expect(result).not.toBeNull();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE case_documents'),
        expect.arrayContaining(['New synopsis', ['tag1', 'tag2'], 'doc-123'])
      );
    });

    it('should return null when document not found', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0, command: 'UPDATE', oid: 0, fields: [] });

      const result = await repository.updateSynopsisAndTags(
        'nonexistent',
        'Synopsis',
        ['tag']
      );

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete document successfully', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1, command: 'DELETE', oid: 0, fields: [] });

      const result = await repository.delete('doc-123');

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM case_documents WHERE id = $1',
        ['doc-123']
      );
    });

    it('should return false when document not found', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0, command: 'DELETE', oid: 0, fields: [] });

      const result = await repository.delete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('getStatsByCaseId', () => {
    it('should return document statistics for a case', async () => {
      const mockStats = {
        total_documents: '10',
        archived_documents: '8',
        pending_archival: '2',
        total_size_bytes: '1048576',
      };

      mockQuery.mockResolvedValue({ rows: [mockStats], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });

      const result = await repository.getStatsByCaseId('case-456');

      expect(result.totalDocuments).toBe(10);
      expect(result.archivedDocuments).toBe(8);
      expect(result.pendingArchival).toBe(2);
      expect(result.totalSizeBytes).toBe(1048576);
    });
  });

  describe('findByArnsUndername', () => {
    it('should find document by ArNS undername', async () => {
      mockQuery.mockResolvedValue({ rows: [mockDocumentRow], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });

      const result = await repository.findByArnsUndername('test-doc');

      expect(result).not.toBeNull();
      expect(result!.arnsUndername).toBe('test-doc');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE arns_undername = $1'),
        ['test-doc']
      );
    });

    it('should return null when undername not found', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] });

      const result = await repository.findByArnsUndername('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByCaseAndType', () => {
    it('should find documents by case and type', async () => {
      const mockRows = [mockDocumentRow, { ...mockDocumentRow, id: 'doc-789' }];
      mockQuery.mockResolvedValue({ rows: mockRows, rowCount: 2, command: 'SELECT', oid: 0, fields: [] });

      const result = await repository.findByCaseAndType('case-456', 'evidence');

      expect(result).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE case_id = $1 AND document_type = $2'),
        ['case-456', 'evidence']
      );
    });
  });

  describe('getCaseById', () => {
    it('should return case information', async () => {
      const mockCase = {
        id: 'case-456',
        case_number: 'CR-2025-001',
      };

      mockQuery.mockResolvedValue({ rows: [mockCase], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });

      const result = await repository.getCaseById('case-456');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('case-456');
      expect(result!.caseNumber).toBe('CR-2025-001');
    });

    it('should return null when case not found', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] });

      const result = await repository.getCaseById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateArnsInfo', () => {
    it('should update ArNS information', async () => {
      mockQuery.mockResolvedValue({ rows: [mockDocumentRow], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] });

      const result = await repository.updateArnsInfo('doc-123', {
        arnsUndername: 'test-undername',
        arnsStatus: 'active',
        arnsUrl: 'https://test-undername.arweave.net',
      });

      expect(result).not.toBeNull();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE case_documents'),
        expect.any(Array)
      );
    });

    it('should return null when document not found', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0, command: 'UPDATE', oid: 0, fields: [] });

      const result = await repository.updateArnsInfo('nonexistent', {
        arnsUndername: 'test',
        arnsStatus: 'active',
        arnsUrl: 'url',
      });

      expect(result).toBeNull();
    });
  });
});
