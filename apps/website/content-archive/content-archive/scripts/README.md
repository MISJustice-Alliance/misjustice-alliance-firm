# Document Archival Scripts

Scripts for archiving legal case documents to Arweave permaweb.

---

## Overview

These scripts facilitate **Phase 3** of the content migration: permanent archival of case documents to Arweave.

**Current Status:**
- ✅ 11 documents imported to PostgreSQL database
- ⏳ 11 documents awaiting Arweave archival (arweave_tx_id = NULL)

---

## Prerequisites

### 1. Arweave Wallet

You need an Arweave wallet with sufficient AR tokens to pay for storage.

**Option A: Wallet File**
```bash
# Create wallet.json in backend directory (DO NOT commit to git!)
export ARWEAVE_WALLET_PATH=/path/to/wallet.json
```

**Option B: Environment Variable**
```bash
# Store wallet as JSON string
export ARWEAVE_WALLET_KEY='{"kty":"RSA","n":"...","e":"AQAB",...}'
```

**Get AR Tokens:**
- Buy AR on exchanges (Coinbase, Kraken, etc.)
- Estimate cost: ~0.001 AR per MB (check https://arweave.net)
- Total archival size: ~1.9 MB → Cost: ~0.002 AR (~$0.10 USD)

### 2. Database Connection

Ensure PostgreSQL is running and accessible:

```bash
# Start database (if using Docker)
cd /path/to/legal-advocacy-web
docker compose up -d postgres

# Verify connection
PGPASSWORD=postgres psql -h localhost -U postgres -d misjustice_dev -c "SELECT COUNT(*) FROM documents WHERE arweave_tx_id IS NULL"
```

Expected output: `count = 11`

### 3. TypeScript Environment

Install dependencies:

```bash
cd /path/to/legal-advocacy-web/backend
npm install
npm install -g ts-node  # If not already installed
```

---

## Scripts

### `archive-documents.ts`

Main archival script - uploads all pending documents to Arweave.

**Usage:**
```bash
cd /path/to/legal-advocacy-web/content-archive/content-archive/scripts

# Set environment variables (if not in .env)
export DATABASE_HOST=localhost
export DATABASE_PORT=5432
export DATABASE_NAME=misjustice_dev
export DATABASE_USER=postgres
export DATABASE_PASSWORD=postgres
export ARWEAVE_WALLET_PATH=../../../backend/wallet.json

# Run archival
ts-node archive-documents.ts
```

**What it does:**
1. Connects to PostgreSQL database
2. Loads Arweave wallet and checks balance
3. Fetches all documents with `arweave_tx_id IS NULL`
4. Groups documents by case
5. For each document:
   - Reads file from `storage_path`
   - Uploads to Arweave via Turbo.io
   - Updates database with transaction ID
6. Displays summary of archived documents

**Expected Output:**
```
🚀 Starting Arweave document archival process...

✅ Database connection established

🔑 Loading Arweave wallet...
✅ Wallet loaded: abc123...xyz789

💰 Wallet balance: 0.5 AR

📄 Fetching documents pending archival...
   Found 11 documents to archive

📦 Documents grouped into 2 cases

📁 Case: NUNO-2015-001 - Elvis Nuno v. E'Lise Chard et al.
   Archiving 9 documents...

   📄 01_Case_Summary.pdf
      Path: /path/to/02-platform-ready/documents/nuno-case/01_Case_Summary.pdf
      ✅ Archived to Arweave: abc123def456...
      🔗 View: https://arweave.net/abc123def456...

   [... 8 more documents ...]

📁 Case: YWCA-RICO-2018-002 - YWCA Institutional Corruption
   Archiving 2 documents...

   [... 2 documents ...]

============================================================
📊 Archival Summary
============================================================
Total documents:  11
✅ Archived:      11
❌ Failed:        0
============================================================

🎉 Documents successfully archived to Arweave!
   All data is now permanently preserved on the permaweb.

✨ Database connection closed
```

---

## Verification

After archival, verify documents were uploaded:

```sql
-- Check archival status
SELECT
  c.case_number,
  COUNT(d.id) as total_docs,
  COUNT(d.arweave_tx_id) as archived_docs,
  COUNT(d.id) - COUNT(d.arweave_tx_id) as pending_docs
FROM cases c
LEFT JOIN documents d ON c.id = d.case_id
GROUP BY c.id, c.case_number;

-- Expected output:
--   NUNO-2015-001        | 9           | 9             | 0
--   YWCA-RICO-2018-002  | 2           | 2             | 0
```

**Manual verification:**

```bash
# Get transaction IDs
PGPASSWORD=postgres psql -h localhost -U postgres -d misjustice_dev -c \
  "SELECT filename, arweave_tx_id FROM documents WHERE arweave_tx_id IS NOT NULL LIMIT 5"

# Visit Arweave gateway
open https://arweave.net/[TRANSACTION_ID]
```

---

## Troubleshooting

### Error: "No Arweave wallet configured"

**Solution:** Set `ARWEAVE_WALLET_PATH` or `ARWEAVE_WALLET_KEY` environment variable.

```bash
export ARWEAVE_WALLET_PATH=/path/to/wallet.json
```

### Error: "Insufficient wallet balance"

**Solution:** Add AR tokens to wallet.

1. Get wallet address: Check script output or use Arweave CLI
2. Send AR to wallet address
3. Wait for transaction confirmation (~2 minutes)
4. Rerun script

### Error: "Failed to read file: [path]"

**Solution:** Verify file paths in database match actual files.

```bash
# Check if files exist
PGPASSWORD=postgres psql -h localhost -U postgres -d misjustice_dev -c \
  "SELECT id, filename, storage_path FROM documents WHERE arweave_tx_id IS NULL" | \
  while read id filename path; do
    if [ ! -f "$path" ]; then
      echo "Missing: $path"
    fi
  done
```

### Error: "Database connection failed"

**Solution:** Ensure PostgreSQL is running and credentials are correct.

```bash
# Test connection
PGPASSWORD=postgres psql -h localhost -U postgres -d misjustice_dev -c "SELECT 1"
```

---

## Cost Estimation

**Arweave storage pricing (as of 2026):**
- ~$5 per GB for permanent storage
- Current archive: ~1.9 MB = ~0.002 GB
- **Estimated cost: ~$0.01 USD**

**Actual cost depends on:**
- Current AR token price
- Network congestion
- Data size

Check current pricing: https://ar-fees.arweave.dev/

---

## Security Notes

⚠️ **NEVER commit wallet.json to git!**

Add to `.gitignore`:
```
backend/wallet.json
backend/.env
```

⚠️ **Wallet contains private keys** - anyone with access can spend AR tokens.

**Best practices:**
- Use a dedicated wallet for archival (not your main wallet)
- Fund with only the amount needed for archival
- Store wallet securely (encrypted backup)
- Rotate wallet periodically

---

## Next Steps (Phase 4)

After successful archival:

1. ✅ Verify all documents have `arweave_tx_id`
2. ✅ Test document retrieval from Arweave
3. ✅ Update frontend to display Arweave links
4. ✅ Implement periodic backups (monthly snapshot to Arweave)
5. ✅ Set up monitoring for archival integrity

**Integration testing:**
```bash
# Test API endpoint
curl http://localhost:3000/api/cases/[CASE_ID]/documents

# Verify Arweave links
curl http://localhost:3000/api/documents/[DOC_ID]/verify
```

---

## Support

For issues or questions:
- Review logs in script output
- Check PostgreSQL logs: `docker compose logs postgres`
- Verify Arweave transaction: https://viewblock.io/arweave/tx/[TX_ID]
- MISJustice Alliance documentation: `../MIGRATION_SUMMARY.md`
