/**
 * Case API Integration Tests
 * Tests for RESTful API endpoints
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
import { CaseStatus } from '../../src/models';
import { testConnection, closePool } from '../../src/config/database';
import { destroyRateLimiter } from '../../src/middleware/rateLimiter';

// Check if PostgreSQL is available
let dbAvailable = false;

beforeAll(async () => {
  try {
    dbAvailable = await testConnection();
    if (!dbAvailable) {
      console.warn('\n⚠️  PostgreSQL not available. Database-dependent tests will be skipped.');
      console.warn('   To run all integration tests, start PostgreSQL or use Docker Compose:');
      console.warn('   → docker compose up\n');
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

describe('Case API Integration Tests', () => {
  let createdCaseId: string;

  describeIfDb('POST /api/cases', () => {
    testIfDb('should create a new case with valid data', async () => {
      const newCase = {
        caseNumber: `TEST-${Date.now()}`,
        plaintiff: 'John Doe',
        plaintiffAnon: 'J.D.',
        defendant: 'City Police Department',
        jurisdiction: 'U.S. District Court - Northern District of California',
        status: CaseStatus.INTAKE,
        causesOfAction: ['42 U.S.C. § 1983'],
        caseFacts: 'Test case for integration testing',
      };

      const response = await request(app)
        .post('/api/cases')
        .send(newCase)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.caseNumber).toBe(newCase.caseNumber);
      expect(response.body.data.plaintiff).toBe(newCase.plaintiff);

      createdCaseId = response.body.data.id;
    });

    testIfDb('should return 400 when required fields are missing', async () => {
      const invalidCase = {
        caseNumber: 'TEST-INVALID',
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/cases')
        .send(invalidCase)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    testIfDb('should return 409 when case number already exists', async () => {
      const duplicateCase = {
        caseNumber: `TEST-${Date.now()}`,
        plaintiff: 'John Doe',
        defendant: 'City Police Department',
        jurisdiction: 'U.S. District Court',
      };

      // Create first case
      await request(app).post('/api/cases').send(duplicateCase).expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/cases')
        .send(duplicateCase)
        .expect(409);

      expect(response.body.success).toBe(false);
    });
  });

  describeIfDb('GET /api/cases', () => {
    testIfDb('should list all cases with pagination', async () => {
      const response = await request(app)
        .get('/api/cases?page=1&pageSize=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('pageSize');
      expect(response.body.pagination).toHaveProperty('totalCount');
    });

    testIfDb('should filter cases by status', async () => {
      const response = await request(app)
        .get(`/api/cases?status=${CaseStatus.INTAKE}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);

      // Verify all returned cases have the correct status
      if (response.body.data.length > 0) {
        response.body.data.forEach((caseItem: { status: string }) => {
          expect(caseItem.status).toBe(CaseStatus.INTAKE);
        });
      }
    });

    testIfDb('should filter cases by jurisdiction', async () => {
      const jurisdiction = 'U.S. District Court';
      const response = await request(app)
        .get(`/api/cases?jurisdiction=${encodeURIComponent(jurisdiction)}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describeIfDb('GET /api/cases/:id', () => {
    testIfDb('should get case by ID', async () => {
      if (!createdCaseId) {
        // Create a case first if not available
        const newCase = {
          caseNumber: `TEST-${Date.now()}`,
          plaintiff: 'Test Plaintiff',
          defendant: 'Test Defendant',
          jurisdiction: 'Test Jurisdiction',
        };

        const createResponse = await request(app).post('/api/cases').send(newCase);
        createdCaseId = createResponse.body.data.id;
      }

      const response = await request(app)
        .get(`/api/cases/${createdCaseId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.id).toBe(createdCaseId);
    });

    testIfDb('should return 404 for nonexistent case', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app).get(`/api/cases/${fakeId}`).expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describeIfDb('PUT /api/cases/:id', () => {
    testIfDb('should update case', async () => {
      if (!createdCaseId) {
        const newCase = {
          caseNumber: `TEST-${Date.now()}`,
          plaintiff: 'Test Plaintiff',
          defendant: 'Test Defendant',
          jurisdiction: 'Test Jurisdiction',
        };

        const createResponse = await request(app).post('/api/cases').send(newCase);
        createdCaseId = createResponse.body.data.id;
      }

      const updates = {
        status: CaseStatus.FILED,
        caseFacts: 'Updated case facts',
      };

      const response = await request(app)
        .put(`/api/cases/${createdCaseId}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(CaseStatus.FILED);
    });

    testIfDb('should return 404 when updating nonexistent case', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .put(`/api/cases/${fakeId}`)
        .send({ status: CaseStatus.FILED })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describeIfDb('GET /api/cases/search', () => {
    testIfDb('should search cases by query', async () => {
      const response = await request(app)
        .get('/api/cases/search?q=police&page=1&pageSize=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toHaveProperty('page');
    });

    testIfDb('should return 400 when search query is missing', async () => {
      const response = await request(app).get('/api/cases/search').expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describeIfDb('DELETE /api/cases/:id', () => {
    testIfDb('should delete case', async () => {
      // Create a case to delete
      const newCase = {
        caseNumber: `TEST-DELETE-${Date.now()}`,
        plaintiff: 'Test Plaintiff',
        defendant: 'Test Defendant',
        jurisdiction: 'Test Jurisdiction',
      };

      const createResponse = await request(app).post('/api/cases').send(newCase);
      const caseToDeleteId = createResponse.body.data.id;

      const response = await request(app)
        .delete(`/api/cases/${caseToDeleteId}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify case is deleted
      await request(app).get(`/api/cases/${caseToDeleteId}`).expect(404);
    });

    testIfDb('should return 404 when deleting nonexistent case', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app).delete(`/api/cases/${fakeId}`).expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});
