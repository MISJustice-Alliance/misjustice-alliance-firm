/**
 * Case Repository
 * Data access layer for legal case operations
 */

import { query } from '../config/database';
import {
  Case,
  CaseDbRow,
  CreateCaseDTO,
  UpdateCaseDTO,
  CaseFilters,
  Pagination,
  PaginatedCases,
  mapDbRowToCase,
  CaseStatus,
} from '../models';

/**
 * Repository class for case data access
 */
export class CaseRepository {
  /**
   * Create a new case
   */
  async create(data: CreateCaseDTO): Promise<Case> {
    const sql = `
      INSERT INTO legal_cases (
        case_number,
        plaintiff,
        plaintiff_anon,
        defendant,
        jurisdiction,
        filed_date,
        status,
        causes_of_action,
        case_facts
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const params = [
      data.caseNumber,
      data.plaintiff,
      data.plaintiffAnon || null,
      data.defendant,
      data.jurisdiction,
      data.filedDate || null,
      data.status || CaseStatus.INTAKE,
      data.causesOfAction || [],
      data.caseFacts || null,
    ];

    const result = await query<CaseDbRow>(sql, params);
    return mapDbRowToCase(result.rows[0]);
  }

  /**
   * Find case by ID
   */
  async findById(id: string): Promise<Case | null> {
    const sql = 'SELECT * FROM legal_cases WHERE id = $1';
    const result = await query<CaseDbRow>(sql, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return mapDbRowToCase(result.rows[0]);
  }

  /**
   * Find case by case number
   */
  async findByCaseNumber(caseNumber: string): Promise<Case | null> {
    const sql = 'SELECT * FROM legal_cases WHERE case_number = $1';
    const result = await query<CaseDbRow>(sql, [caseNumber]);

    if (result.rows.length === 0) {
      return null;
    }

    return mapDbRowToCase(result.rows[0]);
  }

  /**
   * Find all cases with filters and pagination
   */
  async findAll(filters: CaseFilters = {}, pagination: Pagination): Promise<PaginatedCases> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    // Build WHERE clause based on filters
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        conditions.push(`status = ANY($${paramIndex})`);
        params.push(filters.status);
      } else {
        conditions.push(`status = $${paramIndex}`);
        params.push(filters.status);
      }
      paramIndex++;
    }

    if (filters.jurisdiction) {
      conditions.push(`jurisdiction = $${paramIndex}`);
      params.push(filters.jurisdiction);
      paramIndex++;
    }

    if (filters.filedDateFrom) {
      conditions.push(`filed_date >= $${paramIndex}`);
      params.push(filters.filedDateFrom);
      paramIndex++;
    }

    if (filters.filedDateTo) {
      conditions.push(`filed_date <= $${paramIndex}`);
      params.push(filters.filedDateTo);
      paramIndex++;
    }

    if (filters.searchQuery) {
      conditions.push(`(
        to_tsvector('english', case_facts) @@ plainto_tsquery('english', $${paramIndex})
        OR case_number ILIKE $${paramIndex + 1}
        OR plaintiff ILIKE $${paramIndex + 1}
        OR defendant ILIKE $${paramIndex + 1}
      )`);
      params.push(filters.searchQuery, `%${filters.searchQuery}%`);
      paramIndex += 2;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countSql = `SELECT COUNT(*) as count FROM legal_cases ${whereClause}`;
    const countResult = await query<{ count: string }>(countSql, params);
    const totalCount = parseInt(countResult.rows[0].count, 10);

    // Calculate pagination
    const offset = (pagination.page - 1) * pagination.pageSize;
    const totalPages = Math.ceil(totalCount / pagination.pageSize);

    // Get paginated results
    const dataSql = `
      SELECT * FROM legal_cases
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const dataResult = await query<CaseDbRow>(dataSql, [
      ...params,
      pagination.pageSize,
      offset,
    ]);

    const cases = dataResult.rows.map(mapDbRowToCase);

    return {
      cases,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalCount,
        totalPages,
        hasNext: pagination.page < totalPages,
        hasPrev: pagination.page > 1,
      },
    };
  }

  /**
   * Update case by ID
   */
  async update(id: string, updates: UpdateCaseDTO): Promise<Case> {
    const fields: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    // Build SET clause dynamically based on provided updates
    if (updates.plaintiff !== undefined) {
      fields.push(`plaintiff = $${paramIndex}`);
      params.push(updates.plaintiff);
      paramIndex++;
    }

    if (updates.plaintiffAnon !== undefined) {
      fields.push(`plaintiff_anon = $${paramIndex}`);
      params.push(updates.plaintiffAnon);
      paramIndex++;
    }

    if (updates.defendant !== undefined) {
      fields.push(`defendant = $${paramIndex}`);
      params.push(updates.defendant);
      paramIndex++;
    }

    if (updates.jurisdiction !== undefined) {
      fields.push(`jurisdiction = $${paramIndex}`);
      params.push(updates.jurisdiction);
      paramIndex++;
    }

    if (updates.filedDate !== undefined) {
      fields.push(`filed_date = $${paramIndex}`);
      params.push(updates.filedDate);
      paramIndex++;
    }

    if (updates.status !== undefined) {
      fields.push(`status = $${paramIndex}`);
      params.push(updates.status);
      paramIndex++;
    }

    if (updates.causesOfAction !== undefined) {
      fields.push(`causes_of_action = $${paramIndex}`);
      params.push(updates.causesOfAction);
      paramIndex++;
    }

    if (updates.caseFacts !== undefined) {
      fields.push(`case_facts = $${paramIndex}`);
      params.push(updates.caseFacts);
      paramIndex++;
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    const sql = `
      UPDATE legal_cases
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    params.push(id);

    const result = await query<CaseDbRow>(sql, params);

    if (result.rows.length === 0) {
      throw new Error('Case not found');
    }

    return mapDbRowToCase(result.rows[0]);
  }

  /**
   * Delete case by ID
   */
  async delete(id: string): Promise<void> {
    const sql = 'DELETE FROM legal_cases WHERE id = $1';
    await query(sql, [id]);
  }

  /**
   * Add Arweave transaction ID to case
   */
  async addArweaveTransaction(caseId: string, txId: string): Promise<Case> {
    const sql = `
      UPDATE legal_cases
      SET arweave_tx_ids = array_append(arweave_tx_ids, $1)
      WHERE id = $2
      RETURNING *
    `;

    const result = await query<CaseDbRow>(sql, [txId, caseId]);

    if (result.rows.length === 0) {
      throw new Error('Case not found');
    }

    return mapDbRowToCase(result.rows[0]);
  }

  /**
   * Search cases with full-text search
   */
  async search(searchQuery: string, pagination: Pagination): Promise<PaginatedCases> {
    return this.findAll({ searchQuery }, pagination);
  }
}
