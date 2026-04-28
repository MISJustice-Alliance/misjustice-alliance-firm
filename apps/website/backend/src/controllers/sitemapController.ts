/**
 * Sitemap Controller
 * Generates XML sitemap for search engine indexing
 */

import { Request, Response, NextFunction } from 'express';
import { CaseRepository } from '../repositories/CaseRepository';
import { Case } from '../models';

const caseRepository = new CaseRepository();
const BASE_URL = process.env.BASE_URL || 'https://misjusticealliance.org';

/**
 * Generate and serve XML sitemap
 * GET /sitemap.xml
 */
export async function generateSitemap(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Fetch all cases for sitemap (no pagination needed for sitemap)
    const result = await caseRepository.findAll(
      {},
      { page: 1, pageSize: 10000 } // Get all cases
    );

    const cases = result.cases;

    // Static pages with their properties
    const staticPages = [
      {
        url: `${BASE_URL}/`,
        changefreq: 'weekly',
        priority: 1.0,
        lastmod: '2026-01-22',
      },
      {
        url: `${BASE_URL}/cases`,
        changefreq: 'daily',
        priority: 0.9,
        lastmod: '2026-01-22',
      },
      {
        url: `${BASE_URL}/mission`,
        changefreq: 'monthly',
        priority: 0.8,
        lastmod: '2026-01-22',
      },
      {
        url: `${BASE_URL}/contact`,
        changefreq: 'monthly',
        priority: 0.8,
        lastmod: '2026-01-22',
      },
      {
        url: `${BASE_URL}/privacy`,
        changefreq: 'yearly',
        priority: 0.5,
        lastmod: '2026-01-22',
      },
      {
        url: `${BASE_URL}/llms.txt`,
        changefreq: 'weekly',
        priority: 0.6,
        lastmod: '2026-01-22',
      },
      {
        url: `${BASE_URL}/llms-full.txt`,
        changefreq: 'weekly',
        priority: 0.6,
        lastmod: '2026-01-22',
      },
      {
        url: `${BASE_URL}/.well-known/security.txt`,
        changefreq: 'yearly',
        priority: 0.3,
        lastmod: '2026-01-22',
      },
    ];

    // Generate XML sitemap
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages
  .map(
    (page) => `  <url>
    <loc>${page.url}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  )
  .join('\n')}
${cases
  .map(
    (caseItem: Case) => `  <url>
    <loc>${BASE_URL}/cases/${caseItem.id}</loc>
    <lastmod>${caseItem.updatedAt ? new Date(caseItem.updatedAt).toISOString().split('T')[0] : new Date(caseItem.createdAt).toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

    // Set XML content type and send response
    res.set('Content-Type', 'application/xml');
    res.status(200).send(xml);
  } catch (error) {
    next(error);
  }
}
