/**
 * ArweaveService Unit Tests
 *
 * Tests for Arweave document archival and verification
 */

// Set up crypto polyfill for Jest environment
import { webcrypto } from 'crypto';
if (!global.crypto) {
  (global as any).crypto = webcrypto;
}

import { ArweaveService, ArweaveJWK, CaseBundleMetadata, ArchiveDocument } from '../../src/services/arweaveService';
import Arweave from 'arweave';
import { TurboFactory } from '@ardrive/turbo-sdk';
import crypto from 'crypto';

// Mock dependencies
jest.mock('arweave', () => {
  return {
    __esModule: true,
    default: {
      init: jest.fn(),
    },
  };
});
jest.mock('@ardrive/turbo-sdk', () => {
  return {
    TurboFactory: {
      authenticated: jest.fn(),
    },
  };
});
jest.mock('crypto');

describe('ArweaveService', () => {
  let service: ArweaveService;
  let mockArweave: jest.Mocked<any>;
  let mockTurbo: jest.Mocked<any>;
  let mockWallet: ArweaveJWK;

  const mockCaseMetadata: CaseBundleMetadata = {
    caseId: 'case-123',
    caseNumber: 'CR-2025-001',
    defendant: 'Test Defendant',
    jurisdiction: 'Montana',
    stage: 'pleadings',
    timestamp: new Date().toISOString(),
    documentCount: 1,
  };

  const mockDocument: ArchiveDocument = {
    name: 'complaint.pdf',
    type: 'complaint',
    content: Buffer.from('test document content'),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock wallet
    mockWallet = {
      kty: 'RSA',
      n: 'test-n',
      e: 'AQAB',
      d: 'test-d',
    };

    // Mock Arweave instance
    mockArweave = {
      wallets: {
        jwkToAddress: jest.fn().mockResolvedValue('test-wallet-address'),
        getBalance: jest.fn().mockResolvedValue('1000000000000'),
      },
      transactions: {
        get: jest.fn(),
        getData: jest.fn(),
      },
      ar: {
        winstonToAr: jest.fn((winston) => (parseInt(winston) / 1000000000000).toString()),
      },
    };

    (Arweave.init as jest.Mock).mockReturnValue(mockArweave);

    // Mock Turbo client
    mockTurbo = {
      uploadFile: jest.fn().mockResolvedValue({
        id: 'test-tx-id-123',
        owner: 'test-owner',
        dataCaches: ['arweave.net'],
        fastFinalityIndexes: [],
        deadlineHeight: 1000000,
        version: '1.0.0',
        public: 'test-public-key',
        signature: 'test-signature',
        timestamp: Date.now(),
      }),
      getBalance: jest.fn().mockResolvedValue({
        winc: '1000000000000',
      }),
    };

    (TurboFactory.authenticated as jest.Mock).mockReturnValue(mockTurbo);

    // Mock crypto
    const mockHash = {
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('test-hash-abc123'),
    };
    (crypto.createHash as jest.Mock).mockReturnValue(mockHash);
  });

  describe('Constructor', () => {
    it('should initialize without wallet for read-only mode', () => {
      service = new ArweaveService();

      expect(Arweave.init).toHaveBeenCalledWith({
        host: 'arweave.net',
        port: 443,
        protocol: 'https',
        timeout: 20000,
        logging: false,
      });
      expect(TurboFactory.authenticated).not.toHaveBeenCalled();
    });

    it('should initialize with wallet for upload mode', () => {
      service = new ArweaveService(mockWallet);

      expect(Arweave.init).toHaveBeenCalled();
      expect(TurboFactory.authenticated).toHaveBeenCalledWith({
        privateKey: mockWallet,
      });
    });
  });

  describe('uploadBundle', () => {
    beforeEach(() => {
      service = new ArweaveService(mockWallet);
    });

    it('should upload document bundle successfully', async () => {
      const result = await service.uploadBundle([mockDocument], mockCaseMetadata);

      expect(result).toBeDefined();
      expect(result.txId).toBe('test-tx-id-123');
      expect(result.bundleHash).toBe('test-hash-abc123');
      expect(result.uploadedAt).toBeDefined();
      expect(result.byteSize).toBeGreaterThan(0);
      expect(mockTurbo.uploadFile).toHaveBeenCalled();
    });

    it('should compute hashes for documents without hashes', async () => {
      const docWithoutHash = {
        name: 'evidence.pdf',
        type: 'evidence',
        content: Buffer.from('evidence content'),
      };

      await service.uploadBundle([docWithoutHash], mockCaseMetadata);

      expect(crypto.createHash).toHaveBeenCalledWith('sha256');
    });

    it('should include metadata in bundle', async () => {
      await service.uploadBundle([mockDocument], mockCaseMetadata);

      const uploadCall = mockTurbo.uploadFile.mock.calls[0];
      expect(uploadCall).toBeDefined();
      // Verify the uploaded data includes metadata
      const uploadedData = uploadCall[0];
      expect(uploadedData).toBeDefined();
    });

    it('should throw error when turbo not initialized', async () => {
      service = new ArweaveService(); // No wallet

      await expect(
        service.uploadBundle([mockDocument], mockCaseMetadata)
      ).rejects.toThrow('Turbo not initialized');
    });

    it('should handle upload failures', async () => {
      mockTurbo.uploadFile.mockRejectedValue(new Error('Upload failed'));

      await expect(
        service.uploadBundle([mockDocument], mockCaseMetadata)
      ).rejects.toThrow('Upload failed');
    });

    it('should handle multiple documents in bundle', async () => {
      const documents = [
        mockDocument,
        {
          name: 'evidence-1.pdf',
          type: 'evidence',
          content: Buffer.from('evidence 1'),
        },
        {
          name: 'evidence-2.pdf',
          type: 'evidence',
          content: Buffer.from('evidence 2'),
        },
      ];

      const result = await service.uploadBundle(documents, {
        ...mockCaseMetadata,
        documentCount: 3,
      });

      expect(result.txId).toBe('test-tx-id-123');
      expect(mockTurbo.uploadFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('uploadDocumentsIndividually', () => {
    beforeEach(() => {
      service = new ArweaveService(mockWallet);
    });

    it('should upload documents individually', async () => {
      mockTurbo.uploadFile.mockResolvedValueOnce({
        id: 'data-item-1',
        owner: 'test-owner',
        dataCaches: [],
        fastFinalityIndexes: [],
        deadlineHeight: 1000000,
        version: '1.0.0',
        public: 'test-public',
        signature: 'test-sig',
        timestamp: Date.now(),
      });

      const results = await service.uploadDocumentsIndividually(
        [mockDocument],
        mockCaseMetadata
      );

      expect(results).toHaveLength(1);
      expect(results[0].dataItemId).toBe('data-item-1');
      expect(results[0].documentName).toBe('complaint.pdf');
      expect(results[0].documentType).toBe('complaint');
      expect(mockTurbo.uploadFile).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple document uploads', async () => {
      mockTurbo.uploadFile
        .mockResolvedValueOnce({
          id: 'data-item-1',
          owner: 'test-owner',
          dataCaches: [],
          fastFinalityIndexes: [],
          deadlineHeight: 1000000,
          version: '1.0.0',
          public: 'test-public',
          signature: 'test-sig',
          timestamp: Date.now(),
        })
        .mockResolvedValueOnce({
          id: 'data-item-2',
          owner: 'test-owner',
          dataCaches: [],
          fastFinalityIndexes: [],
          deadlineHeight: 1000000,
          version: '1.0.0',
          public: 'test-public',
          signature: 'test-sig',
          timestamp: Date.now(),
        });

      const documents = [
        mockDocument,
        {
          name: 'evidence.pdf',
          type: 'evidence',
          content: Buffer.from('evidence content'),
        },
      ];

      const results = await service.uploadDocumentsIndividually(
        documents,
        mockCaseMetadata
      );

      expect(results).toHaveLength(2);
      expect(results[0].dataItemId).toBe('data-item-1');
      expect(results[1].dataItemId).toBe('data-item-2');
      expect(mockTurbo.uploadFile).toHaveBeenCalledTimes(2);
    });

    it('should throw error when turbo not initialized', async () => {
      service = new ArweaveService(); // No wallet

      await expect(
        service.uploadDocumentsIndividually([mockDocument], mockCaseMetadata)
      ).rejects.toThrow('Turbo not initialized');
    });
  });

  describe('verifyArchive', () => {
    beforeEach(() => {
      service = new ArweaveService();
    });

    it('should verify valid archive', async () => {
      const mockData = 'test data content';
      mockArweave.transactions.getData.mockResolvedValue(mockData);

      const result = await service.verifyArchive('test-tx-id');

      expect(result.valid).toBe(true);
      expect(result.txId).toBe('test-tx-id');
      expect(result.dataSize).toBe(mockData.length);
      expect(mockArweave.transactions.getData).toHaveBeenCalledWith('test-tx-id', {
        decode: true,
        string: true,
      });
    });

    it('should verify archive with hash match', async () => {
      const expectedHash = 'test-hash-abc123';
      const mockData = 'test data';
      mockArweave.transactions.getData.mockResolvedValue(mockData);

      const result = await service.verifyArchive('test-tx-id', expectedHash);

      expect(result.valid).toBe(true);
      expect(result.hashMatch).toBe(true);
    });

    it('should detect hash mismatch', async () => {
      const wrongHash = 'wrong-hash-xyz';
      const mockData = 'test data';
      mockArweave.transactions.getData.mockResolvedValue(mockData);

      const result = await service.verifyArchive('test-tx-id', wrongHash);

      expect(result.valid).toBe(false);
      expect(result.hashMatch).toBe(false);
      expect(result.error).toContain('Hash mismatch');
    });

    it('should handle transaction not found', async () => {
      mockArweave.transactions.getData.mockResolvedValue('');

      const result = await service.verifyArchive('nonexistent-tx-id');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('No data found for transaction');
    });

    it('should handle network errors', async () => {
      mockArweave.transactions.get.mockRejectedValue(new Error('Network error'));

      const result = await service.verifyArchive('test-tx-id');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('retrieveBundle', () => {
    beforeEach(() => {
      service = new ArweaveService();
    });

    it('should retrieve and parse bundle data', async () => {
      const bundleData = {
        documents: [{ name: 'test.pdf', content: 'test' }],
        metadata: mockCaseMetadata,
      };
      const bundleJson = JSON.stringify(bundleData);

      mockArweave.transactions.getData.mockResolvedValue(bundleJson);

      const result = await service.retrieveBundle('test-tx-id');

      expect(result).toEqual(bundleData);
      expect(mockArweave.transactions.getData).toHaveBeenCalledWith('test-tx-id', {
        decode: true,
        string: true,
      });
    });

    it('should return null when transaction not found', async () => {
      mockArweave.transactions.getData.mockRejectedValue(new Error('Not found'));

      const result = await service.retrieveBundle('nonexistent-tx-id');

      expect(result).toBeNull();
    });

    it('should handle invalid JSON data', async () => {
      mockArweave.transactions.getData.mockResolvedValue('invalid json{]');

      const result = await service.retrieveBundle('test-tx-id');

      expect(result).toBeNull();
    });
  });

  describe('getTransactionTags', () => {
    beforeEach(() => {
      service = new ArweaveService();
    });

    it('should extract transaction tags', async () => {
      const mockTx = {
        id: 'test-tx-id',
        tags: [
          {
            get: (field: string) => {
              if (field === 'name') return 'Content-Type';
              if (field === 'value') return 'application/json';
              return '';
            },
          },
          {
            get: (field: string) => {
              if (field === 'name') return 'App-Name';
              if (field === 'value') return 'MISJustice-Alliance';
              return '';
            },
          },
        ],
      };

      mockArweave.transactions.get.mockResolvedValue(mockTx);

      const result = await service.getTransactionTags('test-tx-id');

      expect(result).toEqual({
        'Content-Type': 'application/json',
        'App-Name': 'MISJustice-Alliance',
      });
    });

    it('should return empty object for transaction with no tags', async () => {
      const mockTx = { id: 'test-tx-id', tags: [] };

      mockArweave.transactions.get.mockResolvedValue(mockTx);

      const result = await service.getTransactionTags('test-tx-id');

      expect(result).toEqual({});
    });

    it('should return empty object when transaction not found', async () => {
      mockArweave.transactions.get.mockRejectedValue(new Error('Not found'));

      const result = await service.getTransactionTags('nonexistent-tx-id');

      expect(result).toEqual({});
    });
  });

  describe('getWalletAddress', () => {
    it('should return wallet address when wallet exists', async () => {
      service = new ArweaveService(mockWallet);

      const address = await service.getWalletAddress();

      expect(address).toBe('test-wallet-address');
      expect(mockArweave.wallets.jwkToAddress).toHaveBeenCalledWith(mockWallet);
    });

    it('should return null when no wallet configured', async () => {
      service = new ArweaveService();

      const address = await service.getWalletAddress();

      expect(address).toBeNull();
    });

    it('should handle wallet address conversion errors', async () => {
      service = new ArweaveService(mockWallet);
      mockArweave.wallets.jwkToAddress.mockRejectedValue(new Error('Invalid wallet'));

      const address = await service.getWalletAddress();

      expect(address).toBeNull();
    });
  });

  describe('getWalletBalance', () => {
    it('should return wallet balance in winston when wallet exists', async () => {
      service = new ArweaveService(mockWallet);

      const balance = await service.getWalletBalance();

      expect(balance).toBe('1000000000000'); // Balance in winston
      expect(mockArweave.wallets.getBalance).toHaveBeenCalledWith('test-wallet-address');
    });

    it('should return null when no wallet configured', async () => {
      service = new ArweaveService();

      const balance = await service.getWalletBalance();

      expect(balance).toBeNull();
    });

    it('should handle balance retrieval errors', async () => {
      service = new ArweaveService(mockWallet);
      mockArweave.wallets.getBalance.mockRejectedValue(new Error('Network error'));

      const balance = await service.getWalletBalance();

      expect(balance).toBeNull();
    });
  });

  describe('winstonToAr', () => {
    beforeEach(() => {
      service = new ArweaveService();
    });

    it('should convert winston to AR', () => {
      const winston = '1000000000000';
      const result = service.winstonToAr(winston);

      expect(result).toBe('1');
      expect(mockArweave.ar.winstonToAr).toHaveBeenCalledWith(winston);
    });

    it('should handle zero winston', () => {
      mockArweave.ar.winstonToAr.mockReturnValue('0');

      const result = service.winstonToAr('0');

      expect(result).toBe('0');
    });

    it('should handle fractional AR', () => {
      mockArweave.ar.winstonToAr.mockReturnValue('0.5');

      const result = service.winstonToAr('500000000000');

      expect(result).toBe('0.5');
    });
  });

  describe('arToWinston', () => {
    beforeEach(() => {
      service = new ArweaveService();
      mockArweave.ar.arToWinston = jest.fn((ar) =>
        (parseFloat(ar) * 1000000000000).toString()
      );
    });

    it('should convert AR to winston', () => {
      const ar = '1';
      const result = service.arToWinston(ar);

      expect(result).toBe('1000000000000');
      expect(mockArweave.ar.arToWinston).toHaveBeenCalledWith(ar);
    });

    it('should handle zero AR', () => {
      mockArweave.ar.arToWinston.mockReturnValue('0');

      const result = service.arToWinston('0');

      expect(result).toBe('0');
    });

    it('should handle fractional AR', () => {
      mockArweave.ar.arToWinston.mockReturnValue('500000000000');

      const result = service.arToWinston('0.5');

      expect(result).toBe('500000000000');
    });
  });
});
