/**
 * Case Service
 * Business logic layer for case management
 */

import { CaseRepository } from '../repositories/CaseRepository';
import {
  Case,
  CreateCaseDTO,
  UpdateCaseDTO,
  CaseFilters,
  Pagination,
  PaginatedCases,
} from '../models';

/**
 * Custom error class for case-related errors
 */
export class CaseServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'CaseServiceError';
  }
}

/**
 * Service class for case business logic
 */
export class CaseService {
  constructor(private caseRepository: CaseRepository) {}

  /**
   * Create a new case with validation
   */
  async createCase(data: CreateCaseDTO): Promise<Case> {
    // Validate required fields
    if (!data.caseNumber || data.caseNumber.trim().length === 0) {
      throw new CaseServiceError('Case number is required', 400);
    }

    if (!data.plaintiff || data.plaintiff.trim().length === 0) {
      throw new CaseServiceError('Plaintiff name is required', 400);
    }

    if (!data.defendant || data.defendant.trim().length === 0) {
      throw new CaseServiceError('Defendant name is required', 400);
    }

    if (!data.jurisdiction || data.jurisdiction.trim().length === 0) {
      throw new CaseServiceError('Jurisdiction is required', 400);
    }

    // Check for duplicate case number
    const existingCase = await this.caseRepository.findByCaseNumber(data.caseNumber);
    if (existingCase) {
      throw new CaseServiceError(
        `Case with number ${data.caseNumber} already exists`,
        409
      );
    }

    // Create case
    try {
      const newCase = await this.caseRepository.create(data);

      // TODO: Add audit log entry when audit service is implemented
      // await this.auditService.log({
      //   userId,
      //   action: 'CREATE_CASE',
      //   resourceType: 'case',
      //   resourceId: newCase.id,
      // });

      return newCase;
    } catch (error) {
      console.error('Error creating case:', error);
      throw new CaseServiceError('Failed to create case', 500);
    }
  }

  /**
   * Get case by ID or case number
   * Supports both UUID format (e.g., "62126fad-c7d1-455a-88aa-0ac0fc974176")
   * and case number format (e.g., "CR-2025-002")
   */
  async getCase(id: string): Promise<Case> {
    if (!id || id.trim().length === 0) {
      throw new CaseServiceError('Case ID is required', 400);
    }

    // Check if the ID looks like a case number (e.g., CR-2025-002)
    // Case numbers typically start with letters and contain dashes
    const isCaseNumber = /^[A-Z]+-\d{4}-\d{3}$/.test(id);

    let foundCase: Case | null;

    if (isCaseNumber) {
      // Look up by case number
      foundCase = await this.caseRepository.findByCaseNumber(id);
    } else {
      // Look up by UUID
      foundCase = await this.caseRepository.findById(id);
    }

    if (!foundCase) {
      throw new CaseServiceError('Case not found', 404);
    }

    // TODO: Add audit log entry for case access
    // await this.auditService.log({
    //   userId,
    //   action: 'VIEW_CASE',
    //   resourceType: 'case',
    //   resourceId: id,
    // });

    return foundCase;
  }

  /**
   * List cases with filters and pagination
   */
  async listCases(
    filters: CaseFilters = {},
    pagination: Pagination
  ): Promise<PaginatedCases> {
    // Validate pagination
    if (pagination.page < 1) {
      throw new CaseServiceError('Page number must be >= 1', 400);
    }

    if (pagination.pageSize < 1 || pagination.pageSize > 100) {
      throw new CaseServiceError('Page size must be between 1 and 100', 400);
    }

    try {
      return await this.caseRepository.findAll(filters, pagination);
    } catch (error) {
      console.error('Error listing cases:', error);
      throw new CaseServiceError('Failed to list cases', 500);
    }
  }

  /**
   * Search cases with full-text search
   */
  async searchCases(query: string, pagination: Pagination): Promise<PaginatedCases> {
    if (!query || query.trim().length === 0) {
      throw new CaseServiceError('Search query is required', 400);
    }

    try {
      return await this.caseRepository.search(query, pagination);
    } catch (error) {
      console.error('Error searching cases:', error);
      throw new CaseServiceError('Failed to search cases', 500);
    }
  }

  /**
   * Update case
   */
  async updateCase(
    id: string,
    updates: UpdateCaseDTO
  ): Promise<Case> {
    if (!id || id.trim().length === 0) {
      throw new CaseServiceError('Case ID is required', 400);
    }

    // Verify case exists
    const existingCase = await this.caseRepository.findById(id);
    if (!existingCase) {
      throw new CaseServiceError('Case not found', 404);
    }

    // Validate updates
    if (Object.keys(updates).length === 0) {
      throw new CaseServiceError('No updates provided', 400);
    }

    try {
      const updatedCase = await this.caseRepository.update(id, updates);

      // TODO: Add audit log entry
      // await this.auditService.log({
      //   userId,
      //   action: 'UPDATE_CASE',
      //   resourceType: 'case',
      //   resourceId: id,
      //   details: updates,
      // });

      return updatedCase;
    } catch (error) {
      console.error('Error updating case:', error);
      throw new CaseServiceError('Failed to update case', 500);
    }
  }

  /**
   * Delete case
   */
  async deleteCase(id: string): Promise<void> {
    if (!id || id.trim().length === 0) {
      throw new CaseServiceError('Case ID is required', 400);
    }

    // Verify case exists
    const existingCase = await this.caseRepository.findById(id);
    if (!existingCase) {
      throw new CaseServiceError('Case not found', 404);
    }

    try {
      await this.caseRepository.delete(id);

      // TODO: Add audit log entry
      // await this.auditService.log({
      //   userId,
      //   action: 'DELETE_CASE',
      //   resourceType: 'case',
      //   resourceId: id,
      // });
    } catch (error) {
      console.error('Error deleting case:', error);
      throw new CaseServiceError('Failed to delete case', 500);
    }
  }

  /**
   * Archive case to Arweave (placeholder for Phase 3)
   */
  async archiveCase(id: string, txId: string): Promise<Case> {
    if (!id || id.trim().length === 0) {
      throw new CaseServiceError('Case ID is required', 400);
    }

    if (!txId || txId.trim().length === 0) {
      throw new CaseServiceError('Arweave transaction ID is required', 400);
    }

    try {
      return await this.caseRepository.addArweaveTransaction(id, txId);
    } catch (error) {
      console.error('Error archiving case:', error);
      throw new CaseServiceError('Failed to archive case', 500);
    }
  }
}
