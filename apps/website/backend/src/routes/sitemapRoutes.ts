/**
 * Sitemap Routes
 * Routes for XML sitemap generation
 */

import express from 'express';
import { generateSitemap } from '../controllers/sitemapController';

const router = express.Router();

/**
 * GET /sitemap.xml
 * Generate and serve XML sitemap for search engines
 */
router.get('/sitemap.xml', generateSitemap);

export default router;
