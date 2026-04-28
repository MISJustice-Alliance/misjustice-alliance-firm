/**
 * CaseRepository Unit Tests
 *
 * Tests for case data access layer
 */

import { CaseRepository } from '../../src/repositories/CaseRepository';
import { CaseStatus, CreateCaseDTO, UpdateCaseDTO } from '../../src/models';
import { query } from '../../src/config/database';

// Mock the database query function
jest.mock('../../src/config/database');
const mockQuery = query as jest.MockedFunction<typeof query>;

describe('CaseRepository', () => {
  let repository: CaseRepository;

  beforeEach(() => {
    repository = new CaseRepository();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new case with all fields', async () => {
      const mockCaseData: CreateCaseDTO = {
        caseNumber: 'CR-2025-001',
        plaintiff: 'John Doe',
        plaintiffAnon: 'J.D.',
        defendant: 'Jane Smith',
        jurisdiction: 'Montana',
        filedDate: new Date('2025-01-15'),
        status: CaseStatus.FILED,
        causesOfAction: ['Civil Rights Violation', 'Due Process'],
        caseFacts: 'Test case facts',
      };

      const mockDbRow = {
        id: 'case-123',
        case_number: 'CR-2025-001',
        plaintiff: 'John Doe',
        plaintiff_anon: 'J.D.',
        defendant: 'Jane Smith',
        jurisdiction: 'Montana',
        filed_date: new Date('2025-01-15'),
        status: 'active',
        causes_of_action: ['Civil Rights Violation', 'Due Process'],
        case_facts: 'Test case facts',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValue({ rows: [mockDbRow], rowCount: 1, command: 'INSERT', oid: 0, fields: [] });

      const result = await repository.create(mockCaseData);

      expect(result).toBeDefined();
      expect(result.id).toBe('case-123');
      expect(result.caseNumber).toBe('CR-2025-001');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO legal_cases'),
        expect.arrayContaining([
          'CR-2025-001',
          'John Doe',
          'J.D.',
          'Jane Smith',
          'Montana',
        ])
      );
    });

    it('should create case with minimal required fields', async () => {
      const mockCaseData: CreateCaseDTO = {
        caseNumber: 'CR-2025-002',
        plaintiff: 'Test Plaintiff',
        defendant: 'Test Defendant',
        jurisdiction: 'Test Jurisdiction',
      };

      const mockDbRow = {
        id: 'case-456',
        case_number: 'CR-2025-002',
        plaintiff: 'Test Plaintiff',
        plaintiff_anon: null,
        defendant: 'Test Defendant',
        jurisdiction: 'Test Jurisdiction',
        filed_date: null,
        status: 'intake',
        causes_of_action: [],
        case_facts: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValue({ rows: [mockDbRow], rowCount: 1, command: 'INSERT', oid: 0, fields: [] });

      const result = await repository.create(mockCaseData);

      expect(result).toBeDefined();
      expect(result.id).toBe('case-456');
      expect(result.status).toBe('intake');
    });

    it('should handle database errors', async () => {
      const mockCaseData: CreateCaseDTO = {
        caseNumber: 'CR-2025-003',
        plaintiff: 'Test',
        defendant: 'Test',
        jurisdiction: 'Test',
      };

      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(repository.create(mockCaseData)).rejects.toThrow('Database connection failed');
    });
  });

  describe('findById', () => {
    it('should return case when found', async () => {
      const mockDbRow = {
        id: 'case-123',
        case_number: 'CR-2025-001',
        plaintiff: 'John Doe',
        plaintiff_anon: null,
        defendant: 'Jane Smith',
        jurisdiction: 'Montana',
        filed_date: new Date('2025-01-15'),
        status: 'active',
        causes_of_action: [],
        case_facts: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValue({ rows: [mockDbRow], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });

      const result = await repository.findById('case-123');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('case-123');
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM legal_cases WHERE id = $1',
        ['case-123']
      );
    });

    it('should return null when case not found', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] });

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByCaseNumber', () => {
    it('should return case when found by case number', async () => {
      const mockDbRow = {
        id: 'case-123',
        case_number: 'CR-2025-001',
        plaintiff: 'John Doe',
        plaintiff_anon: null,
        defendant: 'Jane Smith',
        jurisdiction: 'Montana',
        filed_date: new Date(),
        status: 'active',
        causes_of_action: [],
        case_facts: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValue({ rows: [mockDbRow], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });

      const result = await repository.findByCaseNumber('CR-2025-001');

      expect(result).not.toBeNull();
      expect(result!.caseNumber).toBe('CR-2025-001');
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM legal_cases WHERE case_number = $1',
        ['CR-2025-001']
      );
    });

    it('should return null when case number not found', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] });

      const result = await repository.findByCaseNumber('CR-9999-999');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return paginated cases', async () => {
      const mockRows = [
        {
          id: 'case-1',
          case_number: 'CR-2025-001',
          plaintiff: 'Plaintiff 1',
          plaintiff_anon: null,
          defendant: 'Defendant 1',
          jurisdiction: 'Montana',
          filed_date: new Date(),
          status: 'active',
          causes_of_action: [],
          case_facts: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'case-2',
          case_number: 'CR-2025-002',
          plaintiff: 'Plaintiff 2',
          plaintiff_anon: null,
          defendant: 'Defendant 2',
          jurisdiction: 'Washington',
          filed_date: new Date(),
          status: 'closed',
          causes_of_action: [],
          case_facts: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '2' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: mockRows, rowCount: 2, command: 'SELECT', oid: 0, fields: [] });

      const result = await repository.findAll({}, { page: 1, pageSize: 10 });

      expect(result.cases).toHaveLength(2);
      expect(result.pagination.totalCount).toBe(2);
      expect(result.pagination.page).toBe(1);
    });

    it('should filter cases by status', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] });

      await repository.findAll({ status: CaseStatus.FILED }, { page: 1, pageSize: 10 });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE status = $1'),
        expect.arrayContaining(['filed'])
      );
    });

    it('should filter cases by jurisdiction', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] });

      await repository.findAll({ jurisdiction: 'Montana' }, { page: 1, pageSize: 10 });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('jurisdiction = $'),
        expect.arrayContaining(['Montana'])
      );
    });
  });

  describe('update', () => {
    it('should update case fields', async () => {
      const updates: UpdateCaseDTO = {
        status: CaseStatus.CLOSED,
        caseFacts: 'Updated facts',
      };

      const mockUpdatedRow = {
        id: 'case-123',
        case_number: 'CR-2025-001',
        plaintiff: 'John Doe',
        plaintiff_anon: null,
        defendant: 'Jane Smith',
        jurisdiction: 'Montana',
        filed_date: new Date(),
        status: 'closed',
        causes_of_action: [],
        case_facts: 'Updated facts',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValue({ rows: [mockUpdatedRow], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] });

      const result = await repository.update('case-123', updates);

      expect(result.status).toBe('closed');
      expect(result.caseFacts).toBe('Updated facts');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE legal_cases'),
        expect.any(Array)
      );
    });

    it('should throw error when case not found', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0, command: 'UPDATE', oid: 0, fields: [] });

      await expect(repository.update('nonexistent', { status: CaseStatus.CLOSED }))
        .rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete case by id', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1, command: 'DELETE', oid: 0, fields: [] });

      await repository.delete('case-123');

      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM legal_cases WHERE id = $1',
        ['case-123']
      );
    });

    it('should complete without error when case not found', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0, command: 'DELETE', oid: 0, fields: [] });

      // Delete method returns void and doesn't throw for missing cases
      await expect(repository.delete('nonexistent')).resolves.toBeUndefined();
    });
  });

  describe('addArweaveTransaction', () => {
    it('should add Arweave transaction ID to case', async () => {
      const mockUpdatedRow = {
        id: 'case-123',
        case_number: 'CR-2025-001',
        plaintiff: 'John Doe',
        plaintiff_anon: null,
        defendant: 'Jane Smith',
        jurisdiction: 'Montana',
        filed_date: new Date(),
        status: 'active',
        causes_of_action: [],
        case_facts: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValue({ rows: [mockUpdatedRow], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] });

      const result = await repository.addArweaveTransaction('case-123', 'arweave-tx-id-123');

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE legal_cases'),
        expect.arrayContaining(['arweave-tx-id-123', 'case-123'])
      );
    });
  });

  describe('search', () => {
    it('should search cases by query', async () => {
      const mockRows = [{
        id: 'case-1',
        case_number: 'CR-2025-001',
        plaintiff: 'John Doe',
        plaintiff_anon: null,
        defendant: 'Jane Smith',
        jurisdiction: 'Montana',
        filed_date: new Date(),
        status: 'active',
        causes_of_action: [],
        case_facts: 'civil rights violation',
        created_at: new Date(),
        updated_at: new Date(),
      }];

      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: mockRows, rowCount: 1, command: 'SELECT', oid: 0, fields: [] });

      const result = await repository.search('civil rights', { page: 1, pageSize: 10 });

      expect(result.cases).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE'),
        expect.arrayContaining(['%civil rights%'])
      );
    });

    it('should return empty results for no matches', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] });

      const result = await repository.search('nonexistent search term', { page: 1, pageSize: 10 });

      expect(result.cases).toHaveLength(0);
      expect(result.pagination.totalCount).toBe(0);
    });
  });
});
