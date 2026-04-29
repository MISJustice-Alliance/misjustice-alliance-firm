/**
 * CaseService Unit Tests
 *
 * Tests for case business logic and validation
 */

import { CaseService, CaseServiceError } from '../../src/services/CaseService';
import { CaseRepository } from '../../src/repositories/CaseRepository';
import { Case, CreateCaseDTO, UpdateCaseDTO, CaseStatus, CaseFilters } from '../../src/models';

// Mock CaseRepository
jest.mock('../../src/repositories/CaseRepository');

describe('CaseService', () => {
  let service: CaseService;
  let mockRepository: jest.Mocked<CaseRepository>;

  const mockCase: Case = {
    id: 'case-123',
    caseNumber: 'CR-2025-001',
    plaintiff: 'John Doe',
    plaintiffAnon: 'J.D.',
    defendant: 'City Police',
    jurisdiction: 'Montana',
    filedDate: new Date('2025-01-15'),
    status: CaseStatus.FILED,
    causesOfAction: ['Civil Rights'],
    caseFacts: 'Test case facts',
    arweaveTxIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByCaseNumber: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      search: jest.fn(),
      addArweaveTransaction: jest.fn(),
    } as jest.Mocked<CaseRepository>;

    service = new CaseService(mockRepository);
  });

  describe('createCase', () => {
    const validCaseData: CreateCaseDTO = {
      caseNumber: 'CR-2025-001',
      plaintiff: 'John Doe',
      defendant: 'City Police',
      jurisdiction: 'Montana',
      status: CaseStatus.FILED,
    };

    it('should create a new case successfully', async () => {
      mockRepository.findByCaseNumber.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(mockCase);

      const result = await service.createCase(validCaseData);

      expect(result).toEqual(mockCase);
      expect(mockRepository.findByCaseNumber).toHaveBeenCalledWith('CR-2025-001');
      expect(mockRepository.create).toHaveBeenCalledWith(validCaseData);
    });

    it('should throw error when case number is missing', async () => {
      const invalidData = { ...validCaseData, caseNumber: '' };

      await expect(service.createCase(invalidData)).rejects.toThrow(
        new CaseServiceError('Case number is required', 400)
      );
    });

    it('should throw error when case number is whitespace', async () => {
      const invalidData = { ...validCaseData, caseNumber: '   ' };

      await expect(service.createCase(invalidData)).rejects.toThrow(
        new CaseServiceError('Case number is required', 400)
      );
    });

    it('should throw error when plaintiff is missing', async () => {
      const invalidData = { ...validCaseData, plaintiff: '' };

      await expect(service.createCase(invalidData)).rejects.toThrow(
        new CaseServiceError('Plaintiff name is required', 400)
      );
    });

    it('should throw error when defendant is missing', async () => {
      const invalidData = { ...validCaseData, defendant: '' };

      await expect(service.createCase(invalidData)).rejects.toThrow(
        new CaseServiceError('Defendant name is required', 400)
      );
    });

    it('should throw error when jurisdiction is missing', async () => {
      const invalidData = { ...validCaseData, jurisdiction: '' };

      await expect(service.createCase(invalidData)).rejects.toThrow(
        new CaseServiceError('Jurisdiction is required', 400)
      );
    });

    it('should throw error when duplicate case number exists', async () => {
      mockRepository.findByCaseNumber.mockResolvedValue(mockCase);

      await expect(service.createCase(validCaseData)).rejects.toThrow(
        new CaseServiceError('Case with number CR-2025-001 already exists', 409)
      );
    });

    it('should handle repository errors', async () => {
      mockRepository.findByCaseNumber.mockResolvedValue(null);
      mockRepository.create.mockRejectedValue(new Error('Database error'));

      await expect(service.createCase(validCaseData)).rejects.toThrow(
        new CaseServiceError('Failed to create case', 500)
      );
    });
  });

  describe('getCase', () => {
    it('should get case by UUID', async () => {
      mockRepository.findById.mockResolvedValue(mockCase);

      const result = await service.getCase('case-123');

      expect(result).toEqual(mockCase);
      expect(mockRepository.findById).toHaveBeenCalledWith('case-123');
      expect(mockRepository.findByCaseNumber).not.toHaveBeenCalled();
    });

    it('should get case by case number', async () => {
      mockRepository.findByCaseNumber.mockResolvedValue(mockCase);

      const result = await service.getCase('CR-2025-001');

      expect(result).toEqual(mockCase);
      expect(mockRepository.findByCaseNumber).toHaveBeenCalledWith('CR-2025-001');
      expect(mockRepository.findById).not.toHaveBeenCalled();
    });

    it('should recognize case number pattern with prefix', async () => {
      mockRepository.findByCaseNumber.mockResolvedValue(mockCase);

      await service.getCase('AB-2024-999');

      expect(mockRepository.findByCaseNumber).toHaveBeenCalledWith('AB-2024-999');
    });

    it('should throw error when ID is empty', async () => {
      await expect(service.getCase('')).rejects.toThrow(
        new CaseServiceError('Case ID is required', 400)
      );
    });

    it('should throw error when ID is whitespace', async () => {
      await expect(service.getCase('   ')).rejects.toThrow(
        new CaseServiceError('Case ID is required', 400)
      );
    });

    it('should throw error when case not found by UUID', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.getCase('nonexistent-uuid')).rejects.toThrow(
        new CaseServiceError('Case not found', 404)
      );
    });

    it('should throw error when case not found by case number', async () => {
      mockRepository.findByCaseNumber.mockResolvedValue(null);

      await expect(service.getCase('CR-9999-999')).rejects.toThrow(
        new CaseServiceError('Case not found', 404)
      );
    });
  });

  describe('listCases', () => {
    const mockPaginatedCases = {
      cases: [mockCase],
      pagination: {
        page: 1,
        pageSize: 10,
        totalCount: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    };

    it('should list cases with valid pagination', async () => {
      mockRepository.findAll.mockResolvedValue(mockPaginatedCases);

      const result = await service.listCases({}, { page: 1, pageSize: 10 });

      expect(result).toEqual(mockPaginatedCases);
      expect(mockRepository.findAll).toHaveBeenCalledWith({}, { page: 1, pageSize: 10 });
    });

    it('should list cases with filters', async () => {
      const filters: CaseFilters = {
        status: CaseStatus.FILED,
        jurisdiction: 'Montana',
      };

      mockRepository.findAll.mockResolvedValue(mockPaginatedCases);

      const result = await service.listCases(filters, { page: 1, pageSize: 10 });

      expect(result).toEqual(mockPaginatedCases);
      expect(mockRepository.findAll).toHaveBeenCalledWith(filters, { page: 1, pageSize: 10 });
    });

    it('should throw error when page number is less than 1', async () => {
      await expect(service.listCases({}, { page: 0, pageSize: 10 })).rejects.toThrow(
        new CaseServiceError('Page number must be >= 1', 400)
      );
    });

    it('should throw error when page size is less than 1', async () => {
      await expect(service.listCases({}, { page: 1, pageSize: 0 })).rejects.toThrow(
        new CaseServiceError('Page size must be between 1 and 100', 400)
      );
    });

    it('should throw error when page size exceeds 100', async () => {
      await expect(service.listCases({}, { page: 1, pageSize: 101 })).rejects.toThrow(
        new CaseServiceError('Page size must be between 1 and 100', 400)
      );
    });

    it('should handle repository errors', async () => {
      mockRepository.findAll.mockRejectedValue(new Error('Database error'));

      await expect(service.listCases({}, { page: 1, pageSize: 10 })).rejects.toThrow(
        new CaseServiceError('Failed to list cases', 500)
      );
    });
  });

  describe('searchCases', () => {
    const mockPaginatedCases = {
      cases: [mockCase],
      pagination: {
        page: 1,
        pageSize: 10,
        totalCount: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    };

    it('should search cases with valid query', async () => {
      mockRepository.search.mockResolvedValue(mockPaginatedCases);

      const result = await service.searchCases('police misconduct', { page: 1, pageSize: 10 });

      expect(result).toEqual(mockPaginatedCases);
      expect(mockRepository.search).toHaveBeenCalledWith('police misconduct', { page: 1, pageSize: 10 });
    });

    it('should throw error when search query is empty', async () => {
      await expect(service.searchCases('', { page: 1, pageSize: 10 })).rejects.toThrow(
        new CaseServiceError('Search query is required', 400)
      );
    });

    it('should throw error when search query is whitespace', async () => {
      await expect(service.searchCases('   ', { page: 1, pageSize: 10 })).rejects.toThrow(
        new CaseServiceError('Search query is required', 400)
      );
    });

    it('should handle repository errors', async () => {
      mockRepository.search.mockRejectedValue(new Error('Database error'));

      await expect(service.searchCases('test', { page: 1, pageSize: 10 })).rejects.toThrow(
        new CaseServiceError('Failed to search cases', 500)
      );
    });
  });

  describe('updateCase', () => {
    const updates: UpdateCaseDTO = {
      status: CaseStatus.CLOSED,
      caseFacts: 'Updated case facts',
    };

    it('should update case successfully', async () => {
      mockRepository.findById.mockResolvedValue(mockCase);
      const updatedCase = { ...mockCase, ...updates };
      mockRepository.update.mockResolvedValue(updatedCase);

      const result = await service.updateCase('case-123', updates);

      expect(result).toEqual(updatedCase);
      expect(mockRepository.findById).toHaveBeenCalledWith('case-123');
      expect(mockRepository.update).toHaveBeenCalledWith('case-123', updates);
    });

    it('should throw error when ID is empty', async () => {
      await expect(service.updateCase('', updates)).rejects.toThrow(
        new CaseServiceError('Case ID is required', 400)
      );
    });

    it('should throw error when case not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.updateCase('nonexistent', updates)).rejects.toThrow(
        new CaseServiceError('Case not found', 404)
      );
    });

    it('should throw error when no updates provided', async () => {
      mockRepository.findById.mockResolvedValue(mockCase);

      await expect(service.updateCase('case-123', {})).rejects.toThrow(
        new CaseServiceError('No updates provided', 400)
      );
    });

    it('should handle repository errors', async () => {
      mockRepository.findById.mockResolvedValue(mockCase);
      mockRepository.update.mockRejectedValue(new Error('Database error'));

      await expect(service.updateCase('case-123', updates)).rejects.toThrow(
        new CaseServiceError('Failed to update case', 500)
      );
    });
  });

  describe('deleteCase', () => {
    it('should delete case successfully', async () => {
      mockRepository.findById.mockResolvedValue(mockCase);
      mockRepository.delete.mockResolvedValue(undefined);

      await service.deleteCase('case-123');

      expect(mockRepository.findById).toHaveBeenCalledWith('case-123');
      expect(mockRepository.delete).toHaveBeenCalledWith('case-123');
    });

    it('should throw error when ID is empty', async () => {
      await expect(service.deleteCase('')).rejects.toThrow(
        new CaseServiceError('Case ID is required', 400)
      );
    });

    it('should throw error when case not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.deleteCase('nonexistent')).rejects.toThrow(
        new CaseServiceError('Case not found', 404)
      );
    });

    it('should handle repository errors', async () => {
      mockRepository.findById.mockResolvedValue(mockCase);
      mockRepository.delete.mockRejectedValue(new Error('Database error'));

      await expect(service.deleteCase('case-123')).rejects.toThrow(
        new CaseServiceError('Failed to delete case', 500)
      );
    });
  });

  describe('archiveCase', () => {
    it('should archive case with Arweave transaction ID', async () => {
      const archivedCase = { ...mockCase, arweaveTxId: 'arweave-tx-123' };
      mockRepository.addArweaveTransaction.mockResolvedValue(archivedCase);

      const result = await service.archiveCase('case-123', 'arweave-tx-123');

      expect(result).toEqual(archivedCase);
      expect(mockRepository.addArweaveTransaction).toHaveBeenCalledWith(
        'case-123',
        'arweave-tx-123'
      );
    });

    it('should throw error when case ID is empty', async () => {
      await expect(service.archiveCase('', 'arweave-tx-123')).rejects.toThrow(
        new CaseServiceError('Case ID is required', 400)
      );
    });

    it('should throw error when transaction ID is empty', async () => {
      await expect(service.archiveCase('case-123', '')).rejects.toThrow(
        new CaseServiceError('Arweave transaction ID is required', 400)
      );
    });

    it('should throw error when transaction ID is whitespace', async () => {
      await expect(service.archiveCase('case-123', '   ')).rejects.toThrow(
        new CaseServiceError('Arweave transaction ID is required', 400)
      );
    });

    it('should handle repository errors', async () => {
      mockRepository.addArweaveTransaction.mockRejectedValue(new Error('Database error'));

      await expect(service.archiveCase('case-123', 'arweave-tx-123')).rejects.toThrow(
        new CaseServiceError('Failed to archive case', 500)
      );
    });
  });

  describe('CaseServiceError', () => {
    it('should create error with default status code', () => {
      const error = new CaseServiceError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe('CaseServiceError');
    });

    it('should create error with custom status code', () => {
      const error = new CaseServiceError('Not found', 404);

      expect(error.message).toBe('Not found');
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe('CaseServiceError');
    });
  });
});
