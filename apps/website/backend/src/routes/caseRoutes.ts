/**
 * Case Routes
 * RESTful API routes for case management
 *
 * Authentication & Authorization:
 * - Public: GET /cases, GET /cases/:id, GET /cases/search
 * - Admin only: POST, PUT, DELETE operations
 */

import { Router } from 'express';
import * as caseController from '../controllers/caseController';
import * as documentController from '../controllers/documentController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';
import { apiRateLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * Case Routes
 */

// List all cases with filters (public, but shows more details when authenticated)
router.get('/', apiRateLimiter, optionalAuth, caseController.listCases);

// Search cases (public, but may have different results based on auth)
router.get('/search', apiRateLimiter, optionalAuth, caseController.searchCases);

// Get single case by ID (public)
router.get('/:id', apiRateLimiter, optionalAuth, caseController.getCase);

// Create new case (requires admin role)
router.post('/', apiRateLimiter, authenticate, requireAdmin(), caseController.createCase);

// Update case (requires admin role)
router.put('/:id', apiRateLimiter, authenticate, requireAdmin(), caseController.updateCase);

// Delete case (requires admin role)
router.delete('/:id', apiRateLimiter, authenticate, requireAdmin(), caseController.deleteCase);

/**
 * Case Document Routes
 */

// Get document statistics for a case (public)
router.get('/:caseId/documents/stats', apiRateLimiter, documentController.getDocumentStats);

// Archive all pending documents for a case (requires admin role)
// Note: Archive operation is expensive (Arweave upload), already has admin auth
router.post('/:caseId/documents/archive', apiRateLimiter, authenticate, requireAdmin(), documentController.archiveCaseDocuments);

// Analyze all pending documents for a case (requires admin role)
// Note: Analysis uses Claude API, rate-limited and admin-only
router.post('/:caseId/documents/analyze', apiRateLimiter, authenticate, requireAdmin(), documentController.analyzeCaseDocuments);

// Get all documents for a case (public)
router.get('/:caseId/documents', apiRateLimiter, documentController.getDocumentsByCaseId);

export default router;
