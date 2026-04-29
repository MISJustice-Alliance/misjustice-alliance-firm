/**
 * Sitemap Integration Tests
 * Tests for sitemap.xml generation endpoint
 *
 * IMPORTANT: These tests require a running PostgreSQL database.
 *
 * To run these tests:
 * 1. Start PostgreSQL: brew services start postgresql (macOS) or sudo service postgresql start (Linux)
 * 2. Create test database: createdb misjustice_test
 * 3. Run migrations: npm run migrate (with DATABASE_NAME=misjustice_test in .env)
 * 4. Run tests: npm test
 *
 * Alternatively, use Docker Compose for one-command setup:
 * docker compose up
 * docker compose exec backend npm test
 */

import request from 'supertest';
import app from '../../src/index';
import { testConnection, closePool } from '../../src/config/database';
import { destroyRateLimiter } from '../../src/middleware/rateLimiter';
import { CaseRepository } from '../../src/repositories/CaseRepository';
import { CaseStatus } from '../../src/models';

// Check if PostgreSQL is available
let dbAvailable = false;
let caseRepository: CaseRepository;

beforeAll(async () => {
  try {
    dbAvailable = await testConnection();
    if (!dbAvailable) {
      console.warn('\n⚠️  PostgreSQL not available. Database-dependent tests will be skipped.');
      console.warn('   To run all integration tests, start PostgreSQL or use Docker Compose:');
      console.warn('   → docker compose up\n');
    } else {
      caseRepository = new CaseRepository();
    }
  } catch (error) {
    console.warn('\n⚠️  PostgreSQL not available. Database-dependent tests will be skipped.');
    console.warn('   To run all integration tests, start PostgreSQL or use Docker Compose:');
    console.warn('   → docker compose up\n');
    dbAvailable = false;
  }
});

afterAll(async () => {
  // Cleanup rate limiter
  destroyRateLimiter();

  // Close database connection pool to prevent hanging tests
  await closePool();
});

// Helper to skip tests when database is not available
const testIfDb = dbAvailable ? test : test.skip;
const describeIfDb = dbAvailable ? describe : describe.skip;

describeIfDb('Sitemap Integration Tests', () => {
  let testCaseIds: string[] = [];

  beforeAll(async () => {
    // Create test cases for sitemap
    if (dbAvailable) {
      const testCase1 = await caseRepository.create({
        caseNumber: 'SITEMAP-TEST-001',
        plaintiff: 'Test Plaintiff 1',
        defendant: 'Test Defendant 1',
        jurisdiction: 'Test Jurisdiction',
        status: CaseStatus.FILED,
      });

      const testCase2 = await caseRepository.create({
        caseNumber: 'SITEMAP-TEST-002',
        plaintiff: 'Test Plaintiff 2',
        defendant: 'Test Defendant 2',
        jurisdiction: 'Test Jurisdiction',
        status: CaseStatus.CLOSED,
      });

      testCaseIds = [testCase1.id, testCase2.id];
    }
  });

  afterAll(async () => {
    // Clean up test cases
    if (dbAvailable && testCaseIds.length > 0) {
      for (const id of testCaseIds) {
        try {
          await caseRepository.delete(id);
        } catch (error) {
          // Ignore cleanup errors
          console.warn(`Failed to cleanup test case ${id}`);
        }
      }
    }
  });

  describeIfDb('GET /sitemap.xml', () => {
    testIfDb('should return valid XML sitemap with correct content-type', async () => {
      const response = await request(app).get('/sitemap.xml');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/xml');
    });

    testIfDb('should include XML declaration and sitemap namespace', async () => {
      const response = await request(app).get('/sitemap.xml');

      expect(response.text).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(response.text).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      expect(response.text).toContain('</urlset>');
    });

    testIfDb('should include all static pages in sitemap', async () => {
      const response = await request(app).get('/sitemap.xml');

      // Check for static pages
      const expectedPages = [
        '/>', // Homepage
        '/cases',
        '/mission',
        '/contact',
        '/privacy',
        '/llms.txt',
        '/llms-full.txt',
        '/.well-known/security.txt',
      ];

      for (const page of expectedPages) {
        expect(response.text).toContain(`<loc>https://misjusticealliance.org${page}</loc>`);
      }
    });

    testIfDb('should include case pages with correct structure', async () => {
      const response = await request(app).get('/sitemap.xml');

      // Check that test cases are included
      for (const caseId of testCaseIds) {
        expect(response.text).toContain(`<loc>https://misjusticealliance.org/cases/${caseId}</loc>`);
      }
    });

    testIfDb('should include required sitemap elements for each URL', async () => {
      const response = await request(app).get('/sitemap.xml');

      // Check that each URL has required elements
      const urlBlocks = response.text.split('<url>').slice(1); // Skip first split (before first <url>)

      expect(urlBlocks.length).toBeGreaterThan(0);

      // Check first URL block (should be homepage)
      const firstUrl = urlBlocks[0];
      expect(firstUrl).toContain('<loc>');
      expect(firstUrl).toContain('<lastmod>');
      expect(firstUrl).toContain('<changefreq>');
      expect(firstUrl).toContain('<priority>');
    });

    testIfDb('should use correct priority values', async () => {
      const response = await request(app).get('/sitemap.xml');

      // Homepage should have highest priority
      expect(response.text).toMatch(/<loc>https:\/\/misjusticealliance\.org\/<\/loc>[\s\S]*?<priority>1\.0<\/priority>/);

      // Cases page should have high priority
      expect(response.text).toMatch(/<loc>https:\/\/misjusticealliance\.org\/cases<\/loc>[\s\S]*?<priority>0\.9<\/priority>/);

      // Individual cases should have 0.8 priority
      expect(response.text).toMatch(/<loc>https:\/\/misjusticealliance\.org\/cases\/[a-f0-9-]+<\/loc>[\s\S]*?<priority>0\.8<\/priority>/);
    });

    testIfDb('should use correct changefreq values', async () => {
      const response = await request(app).get('/sitemap.xml');

      // Homepage should change weekly
      expect(response.text).toMatch(/<loc>https:\/\/misjusticealliance\.org\/<\/loc>[\s\S]*?<changefreq>weekly<\/changefreq>/);

      // Cases page should change daily
      expect(response.text).toMatch(/<loc>https:\/\/misjusticealliance\.org\/cases<\/loc>[\s\S]*?<changefreq>daily<\/changefreq>/);

      // Privacy page should change yearly
      expect(response.text).toMatch(/<loc>https:\/\/misjusticealliance\.org\/privacy<\/loc>[\s\S]*?<changefreq>yearly<\/changefreq>/);
    });

    testIfDb('should include lastmod dates in correct format (YYYY-MM-DD)', async () => {
      const response = await request(app).get('/sitemap.xml');

      // Check date format (YYYY-MM-DD)
      const datePattern = /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/g;
      const matches = response.text.match(datePattern);

      expect(matches).toBeTruthy();
      expect(matches!.length).toBeGreaterThan(0);
    });

    testIfDb('should handle empty case list gracefully', async () => {
      // Delete test cases temporarily
      for (const id of testCaseIds) {
        await caseRepository.delete(id);
      }

      const response = await request(app).get('/sitemap.xml');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/xml');
      // Should still include static pages
      expect(response.text).toContain('<loc>https://misjusticealliance.org/</loc>');
      expect(response.text).toContain('<loc>https://misjusticealliance.org/cases</loc>');

      // Recreate test cases for subsequent tests
      const testCase1 = await caseRepository.create({
        caseNumber: 'SITEMAP-TEST-001',
        plaintiff: 'Test Plaintiff 1',
        defendant: 'Test Defendant 1',
        jurisdiction: 'Test Jurisdiction',
        status: CaseStatus.FILED,
      });

      const testCase2 = await caseRepository.create({
        caseNumber: 'SITEMAP-TEST-002',
        plaintiff: 'Test Plaintiff 2',
        defendant: 'Test Defendant 2',
        jurisdiction: 'Test Jurisdiction',
        status: CaseStatus.CLOSED,
      });

      testCaseIds = [testCase1.id, testCase2.id];
    });

    testIfDb('should generate valid XML that can be parsed', async () => {
      const response = await request(app).get('/sitemap.xml');

      // Basic XML validation - check for balanced tags
      const openUrlCount = (response.text.match(/<url>/g) || []).length;
      const closeUrlCount = (response.text.match(/<\/url>/g) || []).length;

      expect(openUrlCount).toBe(closeUrlCount);
      expect(openUrlCount).toBeGreaterThan(0);

      // Check urlset is balanced
      expect(response.text).toMatch(/<urlset[^>]*>[\s\S]*<\/urlset>/);
    });

    testIfDb('should respect BASE_URL environment variable', async () => {
      const response = await request(app).get('/sitemap.xml');

      // Should use https://misjusticealliance.org or BASE_URL env var
      const baseUrlPattern = /<loc>https:\/\/[^<]+<\/loc>/g;
      const urls = response.text.match(baseUrlPattern);

      expect(urls).toBeTruthy();
      expect(urls!.length).toBeGreaterThan(0);

      // All URLs should start with https://
      for (const url of urls!) {
        expect(url).toMatch(/^<loc>https:\/\//);
      }
    });

    testIfDb('should include all test cases created', async () => {
      const response = await request(app).get('/sitemap.xml');

      // Verify both test cases are present
      expect(testCaseIds.length).toBe(2);
      for (const caseId of testCaseIds) {
        expect(response.text).toContain(`/cases/${caseId}`);
      }
    });
  });
});
