/**
 * Document Routes
 * RESTful API routes for document management and Arweave archival
 */

import { Router } from 'express';
import * as documentController from '../controllers/documentController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';
import { apiRateLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * Document Routes
 */

// Get single document by ID (public with optional auth for enhanced metadata)
router.get('/:id', apiRateLimiter, optionalAuth, documentController.getDocumentById);

// Download/serve document file (public - serves from Arweave or local filesystem)
router.get('/:id/download', apiRateLimiter, documentController.downloadDocument);

// Archive document to Arweave (ADMIN ONLY - expensive operation)
// Note: Arweave archival is expensive, already protected by admin auth
router.post('/:id/archive', apiRateLimiter, authenticate, requireAdmin(), documentController.archiveDocument);

// Verify archived document integrity (public for transparency)
router.get('/:id/verify', apiRateLimiter, documentController.verifyDocument);

// Analyze document to generate synopsis and tags (ADMIN ONLY - uses Claude API)
router.post('/:id/analyze', apiRateLimiter, authenticate, requireAdmin(), documentController.analyzeDocument);

/**
 * ArNS (Arweave Name System) Routes
 */

// Register ArNS undername for a document (ADMIN ONLY)
router.post('/:id/arns/register', apiRateLimiter, authenticate, requireAdmin(), documentController.registerArnsUndername);

// Batch register ArNS undernames (ADMIN ONLY)
router.post('/arns/batch-register', apiRateLimiter, authenticate, requireAdmin(), documentController.batchRegisterArnsUndernames);

// Get document by ArNS undername (public for human-readable URLs)
router.get('/arns/:undername', apiRateLimiter, documentController.getDocumentByArnsUndername);

// Renew ArNS undername registration (ADMIN ONLY)
router.post('/:id/arns/renew', apiRateLimiter, authenticate, requireAdmin(), documentController.renewArnsUndername);

export default router;
