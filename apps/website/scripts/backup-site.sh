#!/bin/bash

################################################################################
# MISJustice Alliance - Comprehensive Site Backup Script
#
# Purpose: Create daily backups of database and case files, compress into
#          tar.gz archive, and manage retention with intelligent rotation
#
# Schedule: Runs daily via cronjob at 03:00 AM
# Retention: 7 daily + 2 weekly (Sundays) + 1 monthly (28th) = 10 backups
#
# Usage: ./scripts/backup-site.sh
#        or via cronjob: 0 3 * * * /opt/legal-advocacy-web/scripts/backup-site.sh
################################################################################

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_BASE_DIR="${PROJECT_ROOT}/backups/site-backup"
TEMP_BACKUP_DIR="/tmp/misjustice-backup-$$"
LOG_FILE="${BACKUP_BASE_DIR}/backup.log"
DB_NAME="misjustice_dev"
DB_USER="postgres"
DB_CONTAINER="misjustice-db"

# Ensure backup directory exists
mkdir -p "$BACKUP_BASE_DIR"

# Logging function
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Error handler
error_exit() {
    local message=$1
    log "ERROR" "$message"
    rm -rf "$TEMP_BACKUP_DIR"
    exit 1
}

# Start backup
log "INFO" "=== Starting MISJustice Alliance Site Backup ==="
log "INFO" "Backup destination: $BACKUP_BASE_DIR"

# Create temporary directory for backup contents
mkdir -p "$TEMP_BACKUP_DIR"/{database,content-archive}

# ============================================================================
# 1. ARWEAVE ARCHIVAL VERIFICATION
# ============================================================================

log "INFO" "Checking for unarchived documents..."

# Count documents without Arweave transaction IDs
UNARCHIVED_COUNT=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c \
  "SELECT COUNT(*) FROM case_documents WHERE arweave_tx_id IS NULL;" 2>/dev/null | xargs)

if [ -z "$UNARCHIVED_COUNT" ] || [ "$UNARCHIVED_COUNT" -eq 0 ]; then
    log "INFO" "All documents are archived. Proceeding with backup."
else
    log "WARN" "Found $UNARCHIVED_COUNT unarchived document(s). Attempting archival..."

    # Run archival script if documents exist
    if [ -f "$PROJECT_ROOT/backend/src/scripts/archiveDocumentsFixed.ts" ]; then
        cd "$PROJECT_ROOT" || error_exit "Failed to change to project root"

        # Run the archival script
        if npx ts-node "$PROJECT_ROOT/backend/src/scripts/archiveDocumentsFixed.ts" 2>>$LOG_FILE; then
            log "INFO" "Arweave archival completed successfully"
        else
            log "WARN" "Arweave archival had issues but proceeding with backup"
        fi
    else
        log "WARN" "Archival script not found at $PROJECT_ROOT/backend/src/scripts/archiveDocumentsFixed.ts"
    fi
fi

# ============================================================================
# 2. DATABASE BACKUP
# ============================================================================

log "INFO" "Backing up PostgreSQL database..."

if ! docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --format=custom \
    > "$TEMP_BACKUP_DIR/database/misjustice_dev.dump" 2>>$LOG_FILE; then
    error_exit "Failed to create PostgreSQL dump"
fi

if ! docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --format=plain \
    > "$TEMP_BACKUP_DIR/database/misjustice_dev.sql" 2>>$LOG_FILE; then
    error_exit "Failed to create SQL backup"
fi

DB_DUMP_SIZE=$(du -h "$TEMP_BACKUP_DIR/database/misjustice_dev.dump" | cut -f1)
log "INFO" "Database backup complete (${DB_DUMP_SIZE})"

# ============================================================================
# 3. CONTENT ARCHIVE BACKUP
# ============================================================================

log "INFO" "Backing up content-archive and case files..."

if [ -d "$PROJECT_ROOT/content-archive" ]; then
    if ! cp -r "$PROJECT_ROOT/content-archive"/* "$TEMP_BACKUP_DIR/content-archive/" 2>>$LOG_FILE; then
        log "WARN" "Some files in content-archive may not have copied successfully"
    fi
fi

CONTENT_SIZE=$(du -sh "$TEMP_BACKUP_DIR/content-archive" | cut -f1)
log "INFO" "Content archive backup complete (${CONTENT_SIZE})"

# ============================================================================
# 4. CREATE COMPRESSED ARCHIVE
# ============================================================================

BACKUP_DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_ARCHIVE="${BACKUP_BASE_DIR}/misjusticealliance-site-backup-${BACKUP_DATE}.tar.gz"

log "INFO" "Creating compressed archive: misjusticealliance-site-backup-${BACKUP_DATE}.tar.gz"

if ! tar -czf "$BACKUP_ARCHIVE" -C "$TEMP_BACKUP_DIR" . 2>>$LOG_FILE; then
    error_exit "Failed to create compressed archive"
fi

ARCHIVE_SIZE=$(du -h "$BACKUP_ARCHIVE" | cut -f1)
log "INFO" "Archive created successfully (${ARCHIVE_SIZE})"

# ============================================================================
# 5. BACKUP RETENTION POLICY
# ============================================================================

log "INFO" "Applying backup retention policy..."

# Get current date information
CURRENT_DATE=$(date +%Y-%m-%d)
CURRENT_DAY_OF_WEEK=$(date +%A)
CURRENT_DAY_OF_MONTH=$(date +%d)
PREVIOUS_MONTH_28TH=$(date -d "28 days ago" +%Y-%m-28 2>/dev/null || echo "")

# Archives to keep
declare -a ARCHIVES_TO_KEEP

# 5.1. Daily archives: Keep last 7 days
log "INFO" "Identifying daily archives to keep (last 7 days)..."
for i in {0..6}; do
    DATE_TO_KEEP=$(date -d "$i days ago" +%Y%m%d 2>/dev/null || echo "")
    if [ -n "$DATE_TO_KEEP" ]; then
        ARCHIVES_TO_KEEP+=("$DATE_TO_KEEP")
    fi
done

# 5.2. Weekly archives: Keep Sundays (last 2)
log "INFO" "Identifying weekly archives to keep (Sundays)..."
for i in {0..13}; do
    CHECK_DATE=$(date -d "$i days ago" +%Y-%m-%d 2>/dev/null || echo "")
    if [ -n "$CHECK_DATE" ]; then
        CHECK_DAY=$(date -d "$CHECK_DATE" +%A)
        if [ "$CHECK_DAY" = "Sunday" ]; then
            SUNDAY_DATE=$(date -d "$CHECK_DATE" +%Y%m%d)
            if [[ ! " ${ARCHIVES_TO_KEEP[@]} " =~ " ${SUNDAY_DATE} " ]]; then
                ARCHIVES_TO_KEEP+=("$SUNDAY_DATE")
            fi
            # Keep only last 2 Sundays
            if [ ${#ARCHIVES_TO_KEEP[@]} -gt 9 ]; then
                break
            fi
        fi
    fi
done

# 5.3. Monthly archives: Keep backup from 28th of previous month
if [ -n "$PREVIOUS_MONTH_28TH" ]; then
    MONTHLY_DATE=$(date -d "$PREVIOUS_MONTH_28TH" +%Y%m%d 2>/dev/null || echo "")
    if [ -n "$MONTHLY_DATE" ]; then
        ARCHIVES_TO_KEEP+=("$MONTHLY_DATE")
    fi
fi

log "INFO" "Archives to keep: ${ARCHIVES_TO_KEEP[@]}"

# Remove old archives not in keep list
log "INFO" "Cleaning up old archives..."
DELETED_COUNT=0

for archive in "$BACKUP_BASE_DIR"/misjusticealliance-site-backup-*.tar.gz; do
    if [ -f "$archive" ]; then
        ARCHIVE_BASENAME=$(basename "$archive" .tar.gz)
        ARCHIVE_DATE=$(echo "$ARCHIVE_BASENAME" | sed 's/misjusticealliance-site-backup-//' | cut -d- -f1)

        # Check if this date should be kept
        SHOULD_KEEP=false
        for keep_date in "${ARCHIVES_TO_KEEP[@]}"; do
            if [ "$ARCHIVE_DATE" = "$keep_date" ]; then
                SHOULD_KEEP=true
                break
            fi
        done

        if [ "$SHOULD_KEEP" = false ]; then
            log "INFO" "Deleting old archive: $(basename "$archive")"
            rm -f "$archive"
            ((DELETED_COUNT++))
        fi
    fi
done

log "INFO" "Deleted $DELETED_COUNT old archive(s)"

# ============================================================================
# 6. CLEANUP AND SUMMARY
# ============================================================================

rm -rf "$TEMP_BACKUP_DIR"

# Count remaining backups
BACKUP_COUNT=$(ls "$BACKUP_BASE_DIR"/misjusticealliance-site-backup-*.tar.gz 2>/dev/null | wc -l)

log "INFO" "=== Backup Complete ==="
log "INFO" "Archive: misjusticealliance-site-backup-${BACKUP_DATE}.tar.gz"
log "INFO" "Size: ${ARCHIVE_SIZE}"
log "INFO" "Total backups retained: $BACKUP_COUNT"
log "INFO" "Backup location: $BACKUP_BASE_DIR"

exit 0
