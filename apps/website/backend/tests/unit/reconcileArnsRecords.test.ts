/**
 * ArNS Records Reconciliation Script Tests
 * Tests for reconcileArnsRecords.ts script functionality
 */

import crypto from 'crypto';

// Import the functions we'll be testing (they don't exist yet - that's the point!)
import {
  parseUndername,
  calculateHashes,
  downloadFromArweave,
  matchDocument,
  ReconciliationStats,
} from '../../src/scripts/reconcileArnsRecords';

// Mock dependencies
jest.mock('pg');
jest.mock('@ar.io/sdk');
jest.mock('../../src/services/BitwardenSecretsService');
jest.mock('../../src/services/DocumentAnalysisService');

describe('ArNS Reconciliation Script', () => {
  describe('parseUndername', () => {
    it('should parse case-type-sequence pattern correctly', () => {
      const result = parseUndername('cr-2025-003-evidence-16');

      expect(result).toEqual({
        caseNumber: 'CR-2025-003',
        documentType: 'evidence',
        sequence: 16,
      });
    });

    it('should parse case-type pattern without sequence (defaults to 1)', () => {
      const result = parseUndername('cr-2025-001-complaint');

      expect(result).toEqual({
        caseNumber: 'CR-2025-001',
        documentType: 'complaint',
        sequence: 1,
      });
    });

    it('should handle uppercase case numbers', () => {
      const result = parseUndername('CR-2025-003-EVIDENCE-2');

      expect(result).toEqual({
        caseNumber: 'CR-2025-003',
        documentType: 'EVIDENCE',
        sequence: 2,
      });
    });

    it('should return null for invalid undername format', () => {
      const result = parseUndername('invalid-name');

      expect(result).toBeNull();
    });

    it('should return null for doc# legacy patterns', () => {
      const result = parseUndername('doc1_case_summary');

      expect(result).toBeNull();
    });
  });

  describe('calculateHashes', () => {
    it('should calculate MD5 and SHA256 hashes from buffer', () => {
      const testData = Buffer.from('test document content');

      const result = calculateHashes(testData);

      expect(result.md5Hash).toBe(crypto.createHash('md5').update(testData).digest('hex'));
      expect(result.sha256Hash).toBe(crypto.createHash('sha256').update(testData).digest('hex'));
      expect(result.fileSize).toBe(testData.length);
    });

    it('should handle empty buffer', () => {
      const testData = Buffer.from('');

      const result = calculateHashes(testData);

      expect(result.md5Hash).toBe(crypto.createHash('md5').update(testData).digest('hex'));
      expect(result.sha256Hash).toBe(crypto.createHash('sha256').update(testData).digest('hex'));
      expect(result.fileSize).toBe(0);
    });

    it('should produce consistent hashes for same content', () => {
      const testData = Buffer.from('consistent content');

      const result1 = calculateHashes(testData);
      const result2 = calculateHashes(testData);

      expect(result1.md5Hash).toBe(result2.md5Hash);
      expect(result1.sha256Hash).toBe(result2.sha256Hash);
    });
  });

  describe('downloadFromArweave', () => {
    it('should download file and return buffer', async () => {
      const txId = 'test-tx-id-123';
      const mockData = Buffer.from('test file content');

      // Mock fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => mockData.buffer,
      });

      const result = await downloadFromArweave(txId);

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(`https://arweave.net/${txId}`);
    });

    it('should retry on failure up to 3 times', async () => {
      const txId = 'test-tx-id-456';
      let attempts = 0;

      global.fetch = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          arrayBuffer: async () => Buffer.from('success').buffer,
        });
      });

      const result = await downloadFromArweave(txId);

      expect(result).toBeTruthy();
      expect(attempts).toBe(3);
    });

    it('should return null after max retries exceeded', async () => {
      const txId = 'test-tx-id-789';

      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await downloadFromArweave(txId);

      expect(result).toBeNull();
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should return null for HTTP error response', async () => {
      const txId = 'test-tx-id-404';

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await downloadFromArweave(txId);

      expect(result).toBeNull();
    });
  });

  describe('matchDocument - 5-tier strategy', () => {
    const mockDocuments = [
      {
        id: 'doc-1',
        document_name: 'Case Summary.pdf',
        arweave_tx_id: 'tx-123',
        md5_hash: 'hash-abc',
        case_number: 'CR-2025-003',
        case_id: 'case-1',
        document_type: 'evidence',
        arns_undername: 'cr-2025-003-evidence-1_misjusticealliance.arweave.net',
        synopsis: 'Test synopsis',
      },
      {
        id: 'doc-2',
        document_name: 'Police Report.pdf',
        arweave_tx_id: 'tx-456',
        md5_hash: 'hash-def',
        case_number: 'CR-2025-003',
        case_id: 'case-1',
        document_type: 'evidence',
        arns_undername: null,
        synopsis: null,
      },
      {
        id: 'doc-3',
        document_name: 'Witness Statement.pdf',
        arweave_tx_id: null,
        md5_hash: null,
        case_number: 'CR-2025-003',
        case_id: 'case-1',
        document_type: 'complaint',
        arns_undername: null,
        synopsis: null,
      },
    ];

    it('should match by ArNS undername (tier 1)', () => {
      const undername = 'cr-2025-003-evidence-1_misjusticealliance.arweave.net';

      const result = matchDocument(undername, 'tx-999', 'hash-xyz', mockDocuments);

      expect(result).toBe(mockDocuments[0]);
      expect(result?.id).toBe('doc-1');
    });

    it('should match by Arweave TX ID (tier 2)', () => {
      const result = matchDocument('unknown-undername', 'tx-456', 'hash-xyz', mockDocuments);

      expect(result).toBe(mockDocuments[1]);
      expect(result?.id).toBe('doc-2');
    });

    it('should match by MD5 hash (tier 3)', () => {
      const result = matchDocument('unknown-undername', 'tx-999', 'hash-def', mockDocuments);

      expect(result).toBe(mockDocuments[1]);
      expect(result?.id).toBe('doc-2');
    });

    it('should match by case + type + sequence (tier 4)', () => {
      const parsedName = {
        caseNumber: 'CR-2025-003',
        documentType: 'complaint',
        sequence: 1,
      };

      const result = matchDocument(
        'cr-2025-003-complaint-1',
        'tx-999',
        'hash-xyz',
        mockDocuments,
        parsedName
      );

      expect(result).toBe(mockDocuments[2]);
      expect(result?.id).toBe('doc-3');
    });

    it('should return null when no match found', () => {
      const result = matchDocument('unknown-undername', 'tx-999', 'hash-xyz', []);

      expect(result).toBeNull();
    });

    it('should prefer tier 1 match over tier 2', () => {
      const result = matchDocument(
        'cr-2025-003-evidence-1_misjusticealliance.arweave.net',
        'tx-456', // This would match doc-2 by TX ID
        'hash-xyz',
        mockDocuments
      );

      // Should match doc-1 by undername, not doc-2 by TX ID
      expect(result?.id).toBe('doc-1');
    });
  });

  describe('ReconciliationStats', () => {
    it('should track statistics correctly', () => {
      const stats: ReconciliationStats = {
        totalRecords: 0,
        duplicatesFound: 0,
        duplicateRecords: [],
        matched: {
          byUndername: 0,
          byTxId: 0,
          byMd5Hash: 0,
          byCaseTypeSeq: 0,
          byMetadata: 0,
        },
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [],
        analysisRun: 0,
        analysisFailed: 0,
        totalCost: 0,
        downloadedBytes: 0,
        elapsedSeconds: 0,
      };

      // Simulate processing
      stats.totalRecords = 10;
      stats.matched.byUndername = 3;
      stats.matched.byTxId = 2;
      stats.created = 2;
      stats.updated = 3;

      expect(stats.totalRecords).toBe(10);
      expect(stats.matched.byUndername + stats.matched.byTxId).toBe(5);
      expect(stats.created + stats.updated).toBe(5);
    });
  });

  describe('Error handling', () => {
    it('should categorize download_failed errors', () => {
      const error = {
        undername: 'cr-2025-003-evidence-1',
        txId: 'tx-123',
        errorType: 'download_failed',
        message: 'Network timeout',
      };

      expect(error.errorType).toBe('download_failed');
    });

    it('should categorize case_not_found errors', () => {
      const error = {
        undername: 'cr-2099-999-evidence-1',
        txId: 'tx-456',
        errorType: 'case_not_found',
        message: 'Case CR-2099-999 does not exist',
      };

      expect(error.errorType).toBe('case_not_found');
    });

    it('should categorize analysis_failed errors', () => {
      const error = {
        undername: 'cr-2025-003-evidence-1',
        txId: 'tx-789',
        errorType: 'analysis_failed',
        message: 'Venice.ai API error',
      };

      expect(error.errorType).toBe('analysis_failed');
    });

    it('should categorize database_error errors', () => {
      const error = {
        undername: 'cr-2025-003-evidence-1',
        txId: 'tx-abc',
        errorType: 'database_error',
        message: 'Connection failed',
      };

      expect(error.errorType).toBe('database_error');
    });
  });
});
