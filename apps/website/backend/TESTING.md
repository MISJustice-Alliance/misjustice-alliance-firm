# Testing Guide

## Overview

Comprehensive testing infrastructure for the MISJustice Alliance backend using:

- **Jest**: Test framework with TypeScript support
- **Supertest**: HTTP endpoint testing
- **PostgreSQL**: Dedicated test database for integration tests

## Table of Contents

1. [Quick Start](#quick-start)
2. [Test Structure](#test-structure)
3. [Running Tests](#running-tests)
4. [Writing Tests](#writing-tests)
5. [Test Database Management](#test-database-management)
6. [Coverage Requirements](#coverage-requirements)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start

### 1. Create Test Database

```bash
# Create PostgreSQL test database
createdb misjustice_test

# Or using psql
psql -U postgres -c "CREATE DATABASE misjustice_test;"
```

### 2. Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm test -- tests/unit/jwt.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="registration"
```

### 3. View Coverage Report

```bash
# Generate and open HTML coverage report
npm run test:coverage
open coverage/index.html
```

---

## Test Structure

```
tests/
├── setup.ts                    # Global test configuration
├── helpers/                    # Test utilities and helpers
│   ├── testDatabase.ts         # Database management functions
│   └── testFactories.ts        # Test data factories (users, tokens)
├── unit/                       # Unit tests (isolated functions)
│   └── jwt.test.ts             # Example: JWT utilities
└── integration/                # Integration tests (API endpoints + DB)
    └── auth.test.ts            # Example: Authentication API
```

### Test Types

#### Unit Tests (`tests/unit/`)
- Test individual functions in isolation
- No database or external dependencies
- Fast execution (<100ms per test)
- Example: JWT token generation/verification

#### Integration Tests (`tests/integration/`)
- Test complete request/response cycles
- Use real test database
- Test middleware, routes, services together
- Example: User registration API endpoint

---

## Running Tests

### Available Scripts

```json
{
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage",
  "test:unit": "jest tests/unit",
  "test:integration": "jest tests/integration",
  "test:debug": "node --inspect-brk node_modules/.bin/jest --runInBand"
}
```

### Common Testing Commands

```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/unit/jwt.test.ts

# Run tests matching a pattern
npm test -- --testNamePattern="login"

# Run tests with verbose output
npm test -- --verbose

# Run tests and update snapshots
npm test -- --updateSnapshot

# Debug tests in VS Code
npm run test:debug
```

### Watch Mode Tips

When running `npm run test:watch`, Jest provides an interactive menu:

- Press `a` to run all tests
- Press `f` to run only failed tests
- Press `p` to filter by filename pattern
- Press `t` to filter by test name pattern
- Press `q` to quit watch mode

---

## Writing Tests

### Unit Test Example

```typescript
// tests/unit/userService.test.ts
import { UserService } from '../../src/services/UserService';

describe('UserService', () => {
  describe('validateEmail()', () => {
    it('should accept valid email', () => {
      const result = UserService.validateEmail('user@example.com');
      expect(result).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = UserService.validateEmail('invalid-email');
      expect(result).toBe(false);
    });
  });
});
```

### Integration Test Example

```typescript
// tests/integration/users.test.ts
import request from 'supertest';
import express from 'express';
import {
  getTestPool,
  closeTestPool,
  truncateAllTables,
  runMigrations,
} from '../helpers/testDatabase';
import { createTestUser } from '../helpers/testFactories';

describe('User API', () => {
  let app;
  let pool;

  beforeAll(async () => {
    pool = getTestPool();
    await runMigrations();

    app = express();
    app.use(express.json());
    app.use('/api/users', createUserRoutes(pool));
  });

  beforeEach(async () => {
    await truncateAllTables();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  it('should get user by ID', async () => {
    const user = await createTestUser(pool);

    const response = await request(app)
      .get(`/api/users/${user.id}`)
      .expect(200);

    expect(response.body.data).toMatchObject({
      id: user.id,
      email: user.email,
    });
  });
});
```

### Using Test Factories

```typescript
import {
  createTestUser,
  createTestAdmin,
  createAuthenticatedContext,
  createTestTokens,
} from '../helpers/testFactories';

// Create basic user
const user = await createTestUser(pool);

// Create admin user
const admin = await createTestAdmin(pool);

// Create user with custom data
const customUser = await createTestUser(pool, {
  email: 'custom@example.com',
  role: UserRole.CONTRIBUTOR,
});

// Create authenticated context (user + tokens)
const { user, tokens, authHeader } = await createAuthenticatedContext(pool);

// Use in API request
const response = await request(app)
  .get('/api/protected')
  .set(authHeader) // Automatically includes "Authorization: Bearer <token>"
  .expect(200);
```

---

## Test Database Management

### Database Utilities

```typescript
import {
  getTestPool,
  closeTestPool,
  truncateAllTables,
  deleteAllUsers,
  runMigrations,
  query,
  withTransaction,
} from '../helpers/testDatabase';

// Get database connection pool
const pool = getTestPool();

// Run migrations (setup tables)
await runMigrations();

// Clean all tables (use in beforeEach)
await truncateAllTables();

// Delete specific data
await deleteAllUsers();

// Run raw query
const result = await query('SELECT * FROM users WHERE email = $1', ['test@example.com']);

// Execute within transaction (auto-rollback)
await withTransaction(async (client) => {
  await client.query('INSERT INTO users ...');
  // Automatically rolled back after function
});

// Close connection (use in afterAll)
await closeTestPool();
```

### Test Lifecycle Hooks

```typescript
describe('Feature tests', () => {
  let pool;

  // Run once before all tests in this describe block
  beforeAll(async () => {
    pool = getTestPool();
    await runMigrations();
  });

  // Run before each test
  beforeEach(async () => {
    await truncateAllTables(); // Clean slate for each test
  });

  // Run after each test
  afterEach(async () => {
    // Optional cleanup
  });

  // Run once after all tests in this describe block
  afterAll(async () => {
    await closeTestPool();
  });

  it('test case', async () => {
    // Test implementation
  });
});
```

---

## Coverage Requirements

### Coverage Thresholds

Configured in `jest.config.js`:

```javascript
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
  // Critical authentication code requires 90%
  './src/utils/jwt.ts': {
    branches: 90,
    functions: 90,
    lines: 90,
    statements: 90,
  },
  './src/services/AuthService.ts': {
    branches: 90,
    functions: 90,
    lines: 90,
    statements: 90,
  },
}
```

### Viewing Coverage

```bash
# Generate coverage report
npm run test:coverage

# Open HTML report in browser
open coverage/index.html

# View summary in terminal
npm run test:coverage -- --silent
```

### Coverage Files

```
coverage/
├── lcov-report/     # HTML coverage report
│   └── index.html
├── lcov.info        # LCOV format (for CI tools)
└── coverage-final.json
```

### Improving Coverage

1. **Identify uncovered lines**: Open `coverage/lcov-report/index.html`
2. **Add tests for uncovered code**: Focus on red/yellow highlighted lines
3. **Test edge cases**: Error handling, validation failures, empty inputs
4. **Re-run coverage**: `npm run test:coverage`

---

## Best Practices

### 1. Test Isolation

Each test should be independent:

```typescript
// ✅ Good: Clean database before each test
beforeEach(async () => {
  await truncateAllTables();
});

// ❌ Bad: Tests depend on execution order
it('test 1', async () => {
  await createTestUser(pool, { email: 'test@example.com' });
});

it('test 2', async () => {
  // Assumes test 1 already created the user
  const user = await query('SELECT * FROM users WHERE email = $1', ['test@example.com']);
});
```

### 2. Use Factories Instead of Hardcoding

```typescript
// ✅ Good: Use factory
const user = await createTestUser(pool);

// ❌ Bad: Hardcode test data
const user = await pool.query(`
  INSERT INTO users (email, password_hash, ...)
  VALUES ('test@example.com', '$2b$12$...', ...)
`);
```

### 3. Test Error Cases

```typescript
describe('User registration', () => {
  it('should register valid user', async () => {
    // Test success path
  });

  it('should reject duplicate email', async () => {
    // Test error path
  });

  it('should reject weak password', async () => {
    // Test validation error
  });

  it('should reject invalid email format', async () => {
    // Test input validation
  });
});
```

### 4. Use Descriptive Test Names

```typescript
// ✅ Good: Clear what is being tested
it('should return 401 when Authorization header is missing', () => {});

// ❌ Bad: Vague
it('should fail', () => {});
```

### 5. Group Related Tests

```typescript
describe('AuthService', () => {
  describe('register()', () => {
    it('should create user with valid data', () => {});
    it('should reject duplicate email', () => {});
  });

  describe('login()', () => {
    it('should authenticate with valid credentials', () => {});
    it('should reject invalid password', () => {});
  });
});
```

---

## Troubleshooting

### Tests Hanging / Not Completing

**Cause**: Database connections not closed

**Solution**:
```typescript
afterAll(async () => {
  await closeTestPool(); // ← Always close pool
});
```

### "Database does not exist" Error

**Cause**: Test database not created

**Solution**:
```bash
createdb misjustice_test
# or
psql -U postgres -c "CREATE DATABASE misjustice_test;"
```

### "Cannot find module" Error

**Cause**: TypeScript compilation issues

**Solution**:
```bash
npm run build
npm test
```

### "JWT_SECRET must be set" Error

**Cause**: Environment variable not configured

**Solution**: The test setup file (`tests/setup.ts`) automatically sets `JWT_SECRET`. If you still see this error, ensure `tests/setup.ts` is being loaded.

### Tests Pass Locally But Fail in CI

**Cause**: Environment differences (Node version, database, etc.)

**Solution**:
- Ensure CI uses same Node version as local (`package.json` engines)
- Ensure CI creates test database before running tests
- Check environment variables are set in CI

### Slow Tests

**Optimization Tips**:

1. **Use bcrypt with fewer rounds** in tests (configured in `tests/setup.ts`):
   ```typescript
   process.env.BCRYPT_ROUNDS = '4'; // Fast for tests
   ```

2. **Run tests in parallel** (Jest default):
   ```bash
   npm test -- --maxWorkers=4
   ```

3. **Run only changed tests** in watch mode:
   ```bash
   npm run test:watch
   # Press 'o' to run only tests related to changed files
   ```

### Debugging Tests

```bash
# Run tests with debugger
npm run test:debug

# In VS Code: Set breakpoint, then F5 to attach debugger

# Run single test with logs
DEBUG=* npm test -- tests/unit/jwt.test.ts --verbose
```

---

## Test Environment Variables

Configured in `tests/setup.ts`:

```typescript
// Test database (separate from development)
DATABASE_NAME=misjustice_test
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres

// JWT (fixed secret for deterministic tests)
JWT_SECRET=test_jwt_secret_32_characters_minimum_required_for_hs256

// bcrypt (fast hashing for tests)
BCRYPT_ROUNDS=4

// Logging (suppress in tests)
LOG_LEVEL=error
```

---

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices (JavaScript)](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

## Example Test Commands

```bash
# Daily Development Workflow
npm run test:watch              # Run tests in watch mode while coding

# Before Committing
npm run test:coverage           # Ensure coverage thresholds met

# CI Pipeline
npm test                        # Run all tests
npm run test:coverage           # Generate coverage report

# Debugging Specific Issue
npm test -- --testNamePattern="login with wrong password"
npm run test:debug              # Debug with breakpoints
```

---

**Next Steps**: See example tests in `tests/unit/jwt.test.ts` and `tests/integration/auth.test.ts` for complete implementation examples.
