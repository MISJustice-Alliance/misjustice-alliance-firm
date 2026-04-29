# Database Migrations

## Overview

This directory contains PostgreSQL database migrations for the MISJustice Alliance legal advocacy platform.

## Prerequisites

- PostgreSQL 14+ installed and running
- Database created: `misjustice_dev` (development) or `misjustice_prod` (production)
- PostgreSQL user with CREATE TABLE permissions

## Setup Database

### Option 1: Local PostgreSQL

```bash
# Install PostgreSQL (macOS)
brew install postgresql@14
brew services start postgresql@14

# Create database
createdb misjustice_dev

# Create user (optional)
createuser -P misjustice_user
# Enter password when prompted

# Grant privileges
psql misjustice_dev -c "GRANT ALL PRIVILEGES ON DATABASE misjustice_dev TO misjustice_user;"
```

### Option 2: Docker PostgreSQL

```bash
# Start PostgreSQL container
docker run --name misjustice-postgres \
  -e POSTGRES_DB=misjustice_dev \
  -e POSTGRES_USER=misjustice_user \
  -e POSTGRES_PASSWORD=your_secure_password \
  -p 5432:5432 \
  -d postgres:14

# Verify container running
docker ps | grep misjustice-postgres
```

## Running Migrations

### Manual Migration (Development)

```bash
# Run migration file
psql -U misjustice_user -d misjustice_dev -f backend/migrations/001_create_legal_cases.sql

# Expected output:
# CREATE EXTENSION
# CREATE TABLE
# CREATE TABLE
# CREATE TABLE
# CREATE INDEX (x11)
# CREATE TRIGGER
# NOTICE: Migration 001_create_legal_cases.sql completed successfully
```

### Verify Migration

```bash
# Connect to database
psql -U misjustice_user -d misjustice_dev

# Check tables created
\dt

# Expected output:
#  Schema |      Name       | Type  |     Owner
# --------+-----------------+-------+----------------
#  public | case_archives   | table | misjustice_user
#  public | case_documents  | table | misjustice_user
#  public | legal_cases     | table | misjustice_user

# Check indexes
\di

# Describe legal_cases table
\d legal_cases

# Exit
\q
```

## Configuration

Create `.env` file in project root:

```env
# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=misjustice_dev
DATABASE_USER=misjustice_user
DATABASE_PASSWORD=your_secure_password

# Connection Pool
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
```

## Migration Files

| File | Version | Description | Status |
|------|---------|-------------|--------|
| `001_create_legal_cases.sql` | 1.0.0 | Create legal cases schema | ✅ Ready |

## Rollback

To rollback migration 001:

```sql
DROP TRIGGER IF EXISTS update_legal_cases_updated_at ON legal_cases;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP TABLE IF EXISTS case_archives CASCADE;
DROP TABLE IF NOT EXISTS case_documents CASCADE;
DROP TABLE IF EXISTS legal_cases CASCADE;
```

## Testing

### Insert Test Data

```sql
-- Insert sample case
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
) VALUES (
  'TEST-001-2026',
  'John Doe',
  'J.D.',
  'City Police Department',
  'U.S. District Court - Northern District of California',
  '2026-01-01',
  'intake',
  ARRAY['42 U.S.C. § 1983', 'Fourth Amendment - Excessive Force'],
  'Test case for system validation'
);

-- Verify insertion
SELECT case_number, plaintiff_anon, status, causes_of_action
FROM legal_cases
WHERE case_number = 'TEST-001-2026';
```

### Test Full-Text Search

```sql
-- Search case facts
SELECT case_number, plaintiff_anon
FROM legal_cases
WHERE to_tsvector('english', case_facts) @@ to_tsquery('english', 'excessive & force');
```

## Next Steps

1. Set up Node.js/TypeScript backend (package.json, tsconfig.json)
2. Install database client library (`pg` or TypeORM)
3. Create database service layer (backend/src/services/databaseService.ts)
4. Implement repository pattern for case operations
5. Add migration tooling (e.g., `node-pg-migrate`, Flyway)

---

**Version**: 1.0.0
**Last Updated**: 2026-01-01
**Maintained By**: Phase 1 Implementation Team
