#!/bin/bash
#
# MISJustice Alliance - Backup Script
# Creates a compressed backup of case files, evidence, PostgreSQL database,
# and Docker container images to registry.hashgrid.net
#
# Usage: ./backup.sh [--no-db] [--no-files] [--no-docker] [--docker-only]
#   --no-db       Skip database backup
#   --no-files    Skip file backup
#   --no-docker   Skip Docker image backup to registry
#   --docker-only Only backup Docker images (skip db and files)
#

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_ROOT/backups/site-backup"
CONTENT_ARCHIVE="$PROJECT_ROOT/content-archive"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="misjustice_backup_${TIMESTAMP}"
TEMP_DIR="/tmp/${BACKUP_NAME}"

# Database configuration (from environment variables or Bitwarden secrets)
DB_CONTAINER="misjustice-db"
# Support both DATABASE_* and POSTGRES_* environment variable conventions
DB_NAME="${DATABASE_NAME:-${POSTGRES_DB:-misjustice_dev}}"
DB_USER="${DATABASE_USER:-${POSTGRES_USER:-postgres}}"
DB_PASSWORD="${DATABASE_PASSWORD:-${POSTGRES_PASSWORD:-postgres}}"

# Docker registry configuration
DOCKER_REGISTRY="registry.hashgrid.net"
DOCKER_REPO_PREFIX="legal-advocacy-web"
DOCKER_IMAGES=("backend" "frontend")
MAX_REGISTRY_BUILDS=5

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
SKIP_DB=false
SKIP_FILES=false
SKIP_DOCKER=false
DOCKER_ONLY=false

for arg in "$@"; do
    case $arg in
        --no-db)
            SKIP_DB=true
            shift
            ;;
        --no-files)
            SKIP_FILES=true
            shift
            ;;
        --no-docker)
            SKIP_DOCKER=true
            shift
            ;;
        --docker-only)
            DOCKER_ONLY=true
            SKIP_DB=true
            SKIP_FILES=true
            shift
            ;;
        --help|-h)
            echo "MISJustice Alliance Backup Script"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --no-db       Skip database backup"
            echo "  --no-files    Skip file backup (content-archive)"
            echo "  --no-docker   Skip Docker image backup to registry"
            echo "  --docker-only Only backup Docker images (skip db and files)"
            echo "  --help, -h    Show this help message"
            echo ""
            echo "Backups are stored in: $BACKUP_DIR"
            echo "Docker images are pushed to: $DOCKER_REGISTRY/$DOCKER_REPO_PREFIX/"
            echo "Tag format: MM-DD-YYYY-XX (XX is incremental for same-day builds)"
            echo "Maximum builds retained: $MAX_REGISTRY_BUILDS"
            exit 0
            ;;
    esac
done

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}       MISJustice Alliance - Backup Script${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Timestamp:${NC} $TIMESTAMP"
echo -e "${YELLOW}Backup Name:${NC} $BACKUP_NAME"
echo ""

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"
mkdir -p "$TEMP_DIR"

# Function to check if Docker container is running
check_container() {
    if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
        echo -e "${RED}Error: Database container '${DB_CONTAINER}' is not running.${NC}"
        echo -e "${YELLOW}Start it with: docker compose up -d postgres${NC}"
        return 1
    fi
    return 0
}

# Backup database
backup_database() {
    echo -e "${BLUE}[1/4] Backing up PostgreSQL database...${NC}"

    if ! check_container; then
        echo -e "${YELLOW}Skipping database backup.${NC}"
        return 1
    fi

    DB_BACKUP_FILE="$TEMP_DIR/database_${DB_NAME}.sql"

    # Use pg_dump inside the container
    if docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" > "$DB_BACKUP_FILE" 2>/dev/null; then
        DB_SIZE=$(du -h "$DB_BACKUP_FILE" | cut -f1)
        echo -e "${GREEN}  ✓ Database backup complete (${DB_SIZE})${NC}"

        # Create metadata file
        echo "Database: $DB_NAME" > "$TEMP_DIR/database_info.txt"
        echo "Backup Date: $(date)" >> "$TEMP_DIR/database_info.txt"
        echo "Container: $DB_CONTAINER" >> "$TEMP_DIR/database_info.txt"

        return 0
    else
        echo -e "${RED}  ✗ Database backup failed${NC}"
        return 1
    fi
}

# Backup content archive (case files and evidence)
backup_files() {
    echo -e "${BLUE}[2/4] Backing up content archive...${NC}"

    if [ ! -d "$CONTENT_ARCHIVE" ]; then
        echo -e "${RED}  ✗ Content archive not found: $CONTENT_ARCHIVE${NC}"
        return 1
    fi

    FILES_BACKUP_DIR="$TEMP_DIR/content-archive"

    # Copy content archive
    cp -r "$CONTENT_ARCHIVE" "$FILES_BACKUP_DIR"

    # Count files and calculate size
    FILE_COUNT=$(find "$FILES_BACKUP_DIR" -type f | wc -l)
    DIR_SIZE=$(du -sh "$FILES_BACKUP_DIR" | cut -f1)

    echo -e "${GREEN}  ✓ Content archive backup complete${NC}"
    echo -e "${GREEN}    - Files: ${FILE_COUNT}${NC}"
    echo -e "${GREEN}    - Size: ${DIR_SIZE}${NC}"

    # Create file manifest
    echo "Content Archive Backup" > "$TEMP_DIR/files_manifest.txt"
    echo "Backup Date: $(date)" >> "$TEMP_DIR/files_manifest.txt"
    echo "Total Files: $FILE_COUNT" >> "$TEMP_DIR/files_manifest.txt"
    echo "" >> "$TEMP_DIR/files_manifest.txt"
    echo "Directory Structure:" >> "$TEMP_DIR/files_manifest.txt"
    find "$FILES_BACKUP_DIR" -type d | sed "s|$FILES_BACKUP_DIR|.|" >> "$TEMP_DIR/files_manifest.txt"

    return 0
}

# Create compressed archive
create_archive() {
    echo -e "${BLUE}[3/4] Creating compressed archive...${NC}"

    ARCHIVE_PATH="$BACKUP_DIR/${BACKUP_NAME}.tar.gz"

    # Create backup metadata
    cat > "$TEMP_DIR/backup_metadata.json" << EOF
{
    "backup_name": "$BACKUP_NAME",
    "timestamp": "$TIMESTAMP",
    "created_at": "$(date -Iseconds)",
    "hostname": "$(hostname)",
    "includes_database": $([[ "$SKIP_DB" == "false" ]] && echo "true" || echo "false"),
    "includes_files": $([[ "$SKIP_FILES" == "false" ]] && echo "true" || echo "false"),
    "database_name": "$DB_NAME",
    "content_archive_path": "$CONTENT_ARCHIVE"
}
EOF

    # Create tar.gz archive
    cd /tmp
    tar -czf "$ARCHIVE_PATH" "$BACKUP_NAME"

    ARCHIVE_SIZE=$(du -h "$ARCHIVE_PATH" | cut -f1)

    echo -e "${GREEN}  ✓ Archive created: ${ARCHIVE_PATH}${NC}"
    echo -e "${GREEN}    - Size: ${ARCHIVE_SIZE}${NC}"

    return 0
}

# Cleanup temporary files
cleanup() {
    echo ""
    echo -e "${BLUE}Cleaning up temporary files...${NC}"
    rm -rf "$TEMP_DIR"
    echo -e "${GREEN}  ✓ Cleanup complete${NC}"
}

# Generate Docker tag in format MM-DD-YYYY-XX
generate_docker_tag() {
    local date_prefix=$(date +"%m-%d-%Y")
    local image_name=$1
    local repo_path="${DOCKER_REGISTRY}/${DOCKER_REPO_PREFIX}/${image_name}"

    # Get existing tags for today from registry
    local existing_tags=""
    existing_tags=$(docker image ls --format "{{.Tag}}" "${repo_path}" 2>/dev/null | grep "^${date_prefix}-" | sort -r || true)

    # Also check remote registry for existing tags
    local remote_tags=""
    remote_tags=$(curl -s "https://${DOCKER_REGISTRY}/v2/${DOCKER_REPO_PREFIX}/${image_name}/tags/list" 2>/dev/null | \
                  grep -oP '"tags":\[.*?\]' | grep -oP "${date_prefix}-\d{2}" | sort -r || true)

    # Combine and find highest number
    local all_tags=$(echo -e "${existing_tags}\n${remote_tags}" | grep "^${date_prefix}-" | sort -r | head -1)

    if [ -z "$all_tags" ]; then
        # First build of the day
        echo "${date_prefix}-01"
    else
        # Increment the counter
        local last_num=$(echo "$all_tags" | grep -oP '\d{2}$')
        local next_num=$(printf "%02d" $((10#$last_num + 1)))
        echo "${date_prefix}-${next_num}"
    fi
}

# Get all tags for an image from registry
get_registry_tags() {
    local image_name=$1
    curl -s "https://${DOCKER_REGISTRY}/v2/${DOCKER_REPO_PREFIX}/${image_name}/tags/list" 2>/dev/null | \
        grep -oP '"tags":\[\K[^\]]+' | tr ',' '\n' | tr -d '"' | grep -E "^[0-9]{2}-[0-9]{2}-[0-9]{4}-[0-9]{2}$" | sort -r || true
}

# Prune old tags from registry (keep only MAX_REGISTRY_BUILDS)
prune_old_registry_tags() {
    local image_name=$1
    local repo_path="${DOCKER_REGISTRY}/${DOCKER_REPO_PREFIX}/${image_name}"

    echo -e "${BLUE}  Checking for old builds to prune...${NC}"

    # Get all date-stamped tags sorted by date (newest first)
    local all_tags=$(get_registry_tags "$image_name")
    local tag_count=$(echo "$all_tags" | grep -c . || echo 0)

    if [ "$tag_count" -le "$MAX_REGISTRY_BUILDS" ]; then
        echo -e "${GREEN}    ✓ No pruning needed (${tag_count}/${MAX_REGISTRY_BUILDS} builds)${NC}"
        return 0
    fi

    # Get tags to delete (all except the newest MAX_REGISTRY_BUILDS)
    local tags_to_delete=$(echo "$all_tags" | tail -n +$((MAX_REGISTRY_BUILDS + 1)))
    local delete_count=$(echo "$tags_to_delete" | grep -c . || echo 0)

    echo -e "${YELLOW}    Pruning ${delete_count} old build(s)...${NC}"

    for tag in $tags_to_delete; do
        echo -e "${YELLOW}      Deleting ${image_name}:${tag}...${NC}"

        # Get the manifest digest for this tag
        local digest=$(curl -s -I -H "Accept: application/vnd.docker.distribution.manifest.v2+json" \
            "https://${DOCKER_REGISTRY}/v2/${DOCKER_REPO_PREFIX}/${image_name}/manifests/${tag}" 2>/dev/null | \
            grep -i "docker-content-digest" | awk '{print $2}' | tr -d '\r' || true)

        if [ -n "$digest" ]; then
            # Delete by digest
            local delete_result=$(curl -s -X DELETE \
                "https://${DOCKER_REGISTRY}/v2/${DOCKER_REPO_PREFIX}/${image_name}/manifests/${digest}" 2>/dev/null || true)
            echo -e "${GREEN}        ✓ Deleted${NC}"
        else
            echo -e "${YELLOW}        ⚠ Could not get digest, skipping${NC}"
        fi
    done

    return 0
}

# Backup Docker images to registry
backup_docker_images() {
    local step_num=$1
    echo -e "${BLUE}[${step_num}/4] Backing up Docker images to registry...${NC}"

    # Check if local images exist
    local images_found=true
    for image in "${DOCKER_IMAGES[@]}"; do
        local local_image="${DOCKER_REPO_PREFIX}-${image}:latest"
        if ! docker image inspect "$local_image" &>/dev/null; then
            echo -e "${RED}  ✗ Local image not found: ${local_image}${NC}"
            images_found=false
        fi
    done

    if [ "$images_found" = false ]; then
        echo -e "${YELLOW}  Building missing images...${NC}"
        cd "$PROJECT_ROOT"
        docker compose build
    fi

    # Generate tag for this backup
    local new_tag=$(generate_docker_tag "${DOCKER_IMAGES[0]}")
    echo -e "${YELLOW}  Tag: ${new_tag}${NC}"

    local push_success=true

    for image in "${DOCKER_IMAGES[@]}"; do
        local local_image="${DOCKER_REPO_PREFIX}-${image}:latest"
        local remote_image="${DOCKER_REGISTRY}/${DOCKER_REPO_PREFIX}/${image}"

        echo -e "${BLUE}  Processing ${image}...${NC}"

        # Tag for registry with date stamp
        docker tag "$local_image" "${remote_image}:${new_tag}"

        # Also update 'latest' tag
        docker tag "$local_image" "${remote_image}:latest"

        # Push to registry
        echo -e "${YELLOW}    Pushing ${image}:${new_tag}...${NC}"
        if docker push "${remote_image}:${new_tag}" 2>&1; then
            echo -e "${GREEN}    ✓ Pushed ${image}:${new_tag}${NC}"

            # Push latest tag
            echo -e "${YELLOW}    Pushing ${image}:latest...${NC}"
            if docker push "${remote_image}:latest" 2>&1; then
                echo -e "${GREEN}    ✓ Pushed ${image}:latest${NC}"
            else
                echo -e "${YELLOW}    ⚠ Failed to push ${image}:latest (non-critical)${NC}"
            fi

            # Prune old builds
            prune_old_registry_tags "$image"
        else
            echo -e "${RED}    ✗ Failed to push ${image}:${new_tag}${NC}"
            echo -e "${YELLOW}    Note: Large images may fail due to registry layer limits.${NC}"
            echo -e "${YELLOW}    The image is available locally as: ${local_image}${NC}"
            push_success=false
        fi

        echo ""
    done

    if [ "$push_success" = true ]; then
        echo -e "${GREEN}  ✓ Docker images backed up successfully${NC}"
        echo -e "${GREEN}    Registry: ${DOCKER_REGISTRY}/${DOCKER_REPO_PREFIX}/${NC}"
        echo -e "${GREEN}    Tag: ${new_tag}${NC}"
        return 0
    else
        echo -e "${YELLOW}  ⚠ Some images failed to push (see above)${NC}"
        return 1
    fi
}

# Main execution
main() {
    local db_success=true
    local files_success=true
    local docker_success=true
    local total_steps=4

    # Determine step display based on what's being skipped
    local current_step=0

    # Database backup
    current_step=$((current_step + 1))
    if [ "$SKIP_DB" = false ]; then
        backup_database || db_success=false
    else
        echo -e "${YELLOW}[${current_step}/${total_steps}] Skipping database backup (--no-db)${NC}"
    fi

    echo ""

    # Files backup
    current_step=$((current_step + 1))
    if [ "$SKIP_FILES" = false ]; then
        backup_files || files_success=false
    else
        echo -e "${YELLOW}[${current_step}/${total_steps}] Skipping files backup (--no-files)${NC}"
    fi

    echo ""

    # Create archive (only if we have db or files to backup)
    current_step=$((current_step + 1))
    if [ "$DOCKER_ONLY" = false ]; then
        if [ "$db_success" = false ] && [ "$files_success" = false ]; then
            echo -e "${YELLOW}[${current_step}/${total_steps}] Skipping archive (no data to archive)${NC}"
        else
            create_archive
        fi
    else
        echo -e "${YELLOW}[${current_step}/${total_steps}] Skipping archive (--docker-only)${NC}"
    fi

    echo ""

    # Docker backup
    current_step=$((current_step + 1))
    if [ "$SKIP_DOCKER" = false ]; then
        backup_docker_images "$current_step" || docker_success=false
    else
        echo -e "${YELLOW}[${current_step}/${total_steps}] Skipping Docker backup (--no-docker)${NC}"
    fi

    # Cleanup (only if we created temp files)
    if [ "$DOCKER_ONLY" = false ] && ([ "$db_success" = true ] || [ "$files_success" = true ]); then
        cleanup
    fi

    # Summary
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}                    Backup Complete!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo ""

    if [ "$DOCKER_ONLY" = false ]; then
        echo -e "${YELLOW}Backup Location:${NC} $BACKUP_DIR/${BACKUP_NAME}.tar.gz"
        echo -e "${YELLOW}Database:${NC} $([[ "$SKIP_DB" == "false" && "$db_success" == "true" ]] && echo "✓ Included" || echo "✗ Not included")"
        echo -e "${YELLOW}Files:${NC} $([[ "$SKIP_FILES" == "false" && "$files_success" == "true" ]] && echo "✓ Included" || echo "✗ Not included")"
    fi

    echo -e "${YELLOW}Docker Images:${NC} $([[ "$SKIP_DOCKER" == "false" && "$docker_success" == "true" ]] && echo "✓ Pushed to registry" || echo "✗ Not pushed")"
    echo ""

    if [ "$DOCKER_ONLY" = false ]; then
        echo -e "${BLUE}To restore this backup, run:${NC}"
        echo -e "  ./scripts/restore.sh $BACKUP_DIR/${BACKUP_NAME}.tar.gz"
        echo ""
    fi

    if [ "$SKIP_DOCKER" = false ]; then
        echo -e "${BLUE}Docker images available at:${NC}"
        echo -e "  ${DOCKER_REGISTRY}/${DOCKER_REPO_PREFIX}/backend:latest"
        echo -e "  ${DOCKER_REGISTRY}/${DOCKER_REPO_PREFIX}/frontend:latest"
        echo ""
    fi
}

# Run main function
main
