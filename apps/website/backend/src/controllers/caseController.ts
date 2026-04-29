/**
 * Case Controller
 * HTTP request handlers for case endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { CaseService } from '../services/CaseService';
import { CaseRepository } from '../repositories/CaseRepository';
import { CreateCaseDTO, UpdateCaseDTO, CaseFilters, CaseStatus } from '../models';

// Initialize service
const caseRepository = new CaseRepository();
const caseService = new CaseService(caseRepository);

/**
 * List all cases with filters and pagination
 * GET /api/cases?status=intake&page=1&pageSize=20
 */
export async function listCases(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const filters: CaseFilters = {};
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;

    // Parse filters from query params
    if (req.query.status) {
      filters.status = req.query.status as CaseStatus;
    }

    if (req.query.jurisdiction) {
      filters.jurisdiction = req.query.jurisdiction as string;
    }

    if (req.query.filedDateFrom) {
      filters.filedDateFrom = new Date(req.query.filedDateFrom as string);
    }

    if (req.query.filedDateTo) {
      filters.filedDateTo = new Date(req.query.filedDateTo as string);
    }

    if (req.query.q) {
      filters.searchQuery = req.query.q as string;
    }

    const result = await caseService.listCases(filters, { page, pageSize });

    res.status(200).json({
      success: true,
      data: result.cases,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get single case by ID
 * GET /api/cases/:id
 */
export async function getCase(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const foundCase = await caseService.getCase(id);

    res.status(200).json({
      success: true,
      data: foundCase,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create new case
 * POST /api/cases
 */
export async function createCase(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const caseData: CreateCaseDTO = req.body;
    const newCase = await caseService.createCase(caseData);

    res.status(201).json({
      success: true,
      data: newCase,
      message: 'Case created successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update case
 * PUT /api/cases/:id
 */
export async function updateCase(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const updates: UpdateCaseDTO = req.body;
    const updatedCase = await caseService.updateCase(id, updates);

    res.status(200).json({
      success: true,
      data: updatedCase,
      message: 'Case updated successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete case
 * DELETE /api/cases/:id
 */
export async function deleteCase(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    await caseService.deleteCase(id);

    res.status(200).json({
      success: true,
      message: 'Case deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Search cases
 * GET /api/cases/search?q=police+misconduct&page=1&pageSize=20
 */
export async function searchCases(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = req.query.q as string;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;

    const result = await caseService.searchCases(query, { page, pageSize });

    res.status(200).json({
      success: true,
      data: result.cases,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}
