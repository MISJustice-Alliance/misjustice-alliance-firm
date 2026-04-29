#!/bin/bash
#
# MISJustice Alliance - Restore Script
# Restores case files, evidence, and PostgreSQL database from backup
#
# Usage: ./restore.sh <backup_file.tar.gz> [--no-db] [--no-files] [--dry-run]
#   --no-db     Skip database restore
#   --no-files  Skip file restore
#   --dry-run   Show what would be restored without making changes
#

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CONTENT_ARCHIVE="$PROJECT_ROOT/content-archive"

# Database configuration (matches docker-compose.yml)
DB_CONTAINER="misjustice-db"
DB_NAME="misjustice_dev"
DB_USER="postgres"
DB_PASSWORD="postgres"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
BACKUP_FILE=""
SKIP_DB=false
SKIP_FILES=false
DRY_RUN=false

for arg in "$@"; do
    case $arg in
        --no-db)
            SKIP_DB=true
            ;;
        --no-files)
            SKIP_FILES=true
            ;;
        --dry-run)
            DRY_RUN=true
            ;;
        --help|-h)
            echo "MISJustice Alliance Restore Script"
            echo ""
            echo "Usage: $0 <backup_file.tar.gz> [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --no-db      Skip database restore"
            echo "  --no-files   Skip file restore (content-archive)"
            echo "  --dry-run    Show what would be restored without making changes"
            echo "  --help, -h   Show this help message"
            echo ""
            echo "Example:"
            echo "  $0 backups/site-backup/misjustice_backup_20260104_120000.tar.gz"
            exit 0
            ;;
        -*)
            echo -e "${RED}Unknown option: $arg${NC}"
            exit 1
            ;;
        *)
            if [ -z "$BACKUP_FILE" ]; then
                BACKUP_FILE="$arg"
            fi
            ;;
    esac
done

# Validate backup file argument
if [ -z "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: No backup file specified.${NC}"
    echo "Usage: $0 <backup_file.tar.gz> [OPTIONS]"
    echo "Run '$0 --help' for more information."
    exit 1
fi

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

# Get absolute path
BACKUP_FILE="$(cd "$(dirname "$BACKUP_FILE")" && pwd)/$(basename "$BACKUP_FILE")"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}       MISJustice Alliance - Restore Script${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Backup File:${NC} $BACKUP_FILE"
echo -e "${YELLOW}Dry Run:${NC} $DRY_RUN"
echo ""

# Create temp directory for extraction
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Extract backup
echo -e "${BLUE}Extracting backup archive...${NC}"
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

# Find the backup directory (it's named misjustice_backup_TIMESTAMP)
BACKUP_DIR=$(find "$TEMP_DIR" -maxdepth 1 -type d -name "misjustice_backup_*" | head -1)

if [ -z "$BACKUP_DIR" ]; then
    echo -e "${RED}Error: Invalid backup archive structure${NC}"
    exit 1
fi

echo -e "${GREEN}  ✓ Archive extracted${NC}"
echo ""

# Read backup metadata
if [ -f "$BACKUP_DIR/backup_metadata.json" ]; then
    echo -e "${BLUE}Backup Information:${NC}"
    cat "$BACKUP_DIR/backup_metadata.json" | grep -E '"backup_name"|"created_at"|"includes_database"|"includes_files"' | sed 's/[",]//g' | sed 's/^/  /'
    echo ""
fi

# Check what's in the backup
HAS_DB_BACKUP=false
HAS_FILES_BACKUP=false

if [ -f "$BACKUP_DIR/database_${DB_NAME}.sql" ]; then
    HAS_DB_BACKUP=true
fi

if [ -d "$BACKUP_DIR/content-archive" ]; then
    HAS_FILES_BACKUP=true
fi

# Function to check if Docker container is running
check_container() {
    if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
        echo -e "${RED}Error: Database container '${DB_CONTAINER}' is not running.${NC}"
        echo -e "${YELLOW}Start it with: docker compose up -d postgres${NC}"
        return 1
    fi
    return 0
}

# Restore database
restore_database() {
    echo -e "${BLUE}[1/2] Restoring PostgreSQL database...${NC}"

    if [ "$HAS_DB_BACKUP" = false ]; then
        echo -e "${YELLOW}  ⚠ No database backup found in archive${NC}"
        return 1
    fi

    if ! check_container; then
        echo -e "${YELLOW}  ⚠ Skipping database restore (container not running)${NC}"
        return 1
    fi

    DB_BACKUP_FILE="$BACKUP_DIR/database_${DB_NAME}.sql"
    DB_SIZE=$(du -h "$DB_BACKUP_FILE" | cut -f1)

    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}  [DRY RUN] Would restore database from: $DB_BACKUP_FILE (${DB_SIZE})${NC}"
        return 0
    fi

    echo -e "${YELLOW}  ⚠ WARNING: This will OVERWRITE the current database!${NC}"
    read -p "  Continue? (y/N): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}  ⚠ Database restore skipped by user${NC}"
        return 1
    fi

    # Drop and recreate database, then restore
    echo -e "${BLUE}  Dropping existing database...${NC}"
    docker exec "$DB_CONTAINER" psql -U "$DB_USER" -c "DROP DATABASE IF EXISTS ${DB_NAME};" postgres 2>/dev/null || true

    echo -e "${BLUE}  Creating fresh database...${NC}"
    docker exec "$DB_CONTAINER" psql -U "$DB_USER" -c "CREATE DATABASE ${DB_NAME};" postgres 2>/dev/null

    echo -e "${BLUE}  Restoring data...${NC}"
    cat "$DB_BACKUP_FILE" | docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" "$DB_NAME" > /dev/null 2>&1

    echo -e "${GREEN}  ✓ Database restored successfully (${DB_SIZE})${NC}"
    return 0
}

# Restore files
restore_files() {
    echo -e "${BLUE}[2/2] Restoring content archive...${NC}"

    if [ "$HAS_FILES_BACKUP" = false ]; then
        echo -e "${YELLOW}  ⚠ No files backup found in archive${NC}"
        return 1
    fi

    FILES_BACKUP_DIR="$BACKUP_DIR/content-archive"
    FILE_COUNT=$(find "$FILES_BACKUP_DIR" -type f | wc -l)
    DIR_SIZE=$(du -sh "$FILES_BACKUP_DIR" | cut -f1)

    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}  [DRY RUN] Would restore ${FILE_COUNT} files (${DIR_SIZE}) to: $CONTENT_ARCHIVE${NC}"
        return 0
    fi

    echo -e "${YELLOW}  ⚠ WARNING: This will OVERWRITE existing content-archive!${NC}"
    echo -e "${YELLOW}     Files: ${FILE_COUNT}${NC}"
    echo -e "${YELLOW}     Size: ${DIR_SIZE}${NC}"
    read -p "  Continue? (y/N): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}  ⚠ Files restore skipped by user${NC}"
        return 1
    fi

    # Backup current content-archive (just in case)
    if [ -d "$CONTENT_ARCHIVE" ]; then
        CURRENT_BACKUP="${CONTENT_ARCHIVE}_pre_restore_$(date +%Y%m%d_%H%M%S)"
        echo -e "${BLUE}  Backing up current content-archive to: $CURRENT_BACKUP${NC}"
        mv "$CONTENT_ARCHIVE" "$CURRENT_BACKUP"
    fi

    # Restore files
    cp -r "$FILES_BACKUP_DIR" "$CONTENT_ARCHIVE"

    echo -e "${GREEN}  ✓ Content archive restored successfully${NC}"
    echo -e "${GREEN}    - Files: ${FILE_COUNT}${NC}"
    echo -e "${GREEN}    - Size: ${DIR_SIZE}${NC}"

    return 0
}

# Main execution
main() {
    local db_result=0
    local files_result=0

    # Database restore
    if [ "$SKIP_DB" = false ]; then
        restore_database || db_result=$?
    else
        echo -e "${YELLOW}[1/2] Skipping database restore (--no-db)${NC}"
    fi

    echo ""

    # Files restore
    if [ "$SKIP_FILES" = false ]; then
        restore_files || files_result=$?
    else
        echo -e "${YELLOW}[2/2] Skipping files restore (--no-files)${NC}"
    fi

    # Summary
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}                  Dry Run Complete${NC}"
    else
        echo -e "${GREEN}                  Restore Complete!${NC}"
    fi
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo ""

    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}No changes were made. Run without --dry-run to perform actual restore.${NC}"
    else
        if [ "$SKIP_DB" = false ]; then
            if [ $db_result -eq 0 ]; then
                echo -e "${GREEN}Database:${NC} ✓ Restored"
            else
                echo -e "${YELLOW}Database:${NC} ⚠ Not restored"
            fi
        fi

        if [ "$SKIP_FILES" = false ]; then
            if [ $files_result -eq 0 ]; then
                echo -e "${GREEN}Files:${NC} ✓ Restored"
            else
                echo -e "${YELLOW}Files:${NC} ⚠ Not restored"
            fi
        fi
    fi
    echo ""
}

# Run main function
main
