#!/bin/bash
#
# MISJustice Alliance - Server Deployment Setup Script
#
# This script automates the process of setting up the MISJustice Alliance
# platform on a new server, including:
#   - Fetching secrets from Bitwarden Secrets Manager
#   - Building Docker containers
#   - Starting application services
#   - Restoring database and content from backup
#
# Prerequisites:
#   - Docker and Docker Compose installed
#   - bws (Bitwarden Secrets CLI) installed
#   - BWS_ACCESS_TOKEN and BWS_PROJECT_ID in ~/.zshrc or environment
#   - dokploy-network Docker network exists (for Traefik)
#
# Usage: ./scripts/deploy-setup.sh [--no-restore] [--backup-dir <path>]
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Default values
SKIP_RESTORE=false
BACKUP_DIR=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-restore)
            SKIP_RESTORE=true
            shift
            ;;
        --backup-dir)
            BACKUP_DIR="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [--no-restore] [--backup-dir <path>]"
            echo ""
            echo "Options:"
            echo "  --no-restore     Skip database and content restoration"
            echo "  --backup-dir     Specify backup directory (default: latest in backups/)"
            echo "  -h, --help       Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        log_error "$1 is not installed. Please install it first."
        exit 1
    fi
}

# Header
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║        MISJustice Alliance - Server Deployment Setup           ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Change to project root
cd "$PROJECT_ROOT"
log_info "Working directory: $PROJECT_ROOT"

# Step 1: Check prerequisites
log_info "Checking prerequisites..."
check_command docker
check_command bws

# Check Docker Compose (could be 'docker-compose' or 'docker compose')
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    log_error "Docker Compose is not installed."
    exit 1
fi
log_success "Prerequisites check passed"

# Step 2: Load Bitwarden credentials from environment or .zshrc
log_info "Loading Bitwarden credentials..."

# Try to load from .zshrc if not in environment
if [[ -z "$BWS_ACCESS_TOKEN" ]] && [[ -f "$HOME/.zshrc" ]]; then
    source <(grep -E '^export BWS_' "$HOME/.zshrc" 2>/dev/null || true)
fi

if [[ -z "$BWS_ACCESS_TOKEN" ]] || [[ -z "$BWS_PROJECT_ID" ]]; then
    log_error "BWS_ACCESS_TOKEN and BWS_PROJECT_ID must be set in environment or ~/.zshrc"
    exit 1
fi
log_success "Bitwarden credentials loaded"

# Step 3: Fetch secrets from Bitwarden and create .env file
log_info "Fetching secrets from Bitwarden Secrets Manager..."

# Get organization ID from access token authentication
SECRETS_JSON=$(bws secret list "$BWS_PROJECT_ID" 2>&1)

if [[ $? -ne 0 ]]; then
    log_error "Failed to fetch secrets from Bitwarden: $SECRETS_JSON"
    exit 1
fi

# Extract organization ID from the first secret
BW_ORGANIZATION_ID=$(echo "$SECRETS_JSON" | jq -r '.[0].organizationId' 2>/dev/null)

if [[ -z "$BW_ORGANIZATION_ID" ]] || [[ "$BW_ORGANIZATION_ID" == "null" ]]; then
    log_error "Failed to extract organization ID from Bitwarden secrets"
    exit 1
fi

log_info "Organization ID: $BW_ORGANIZATION_ID"

# Create .env file from Bitwarden secrets
log_info "Creating .env file..."

cat > "$PROJECT_ROOT/.env" << ENVHEADER
# =============================================================================
# MISJustice Alliance - Docker Compose Environment Variables
# Generated from Bitwarden Secrets Manager on $(date)
# =============================================================================

# Bitwarden Secrets Manager Configuration
BW_ACCESS_TOKEN=$BWS_ACCESS_TOKEN
BW_PROJECT_ID=$BWS_PROJECT_ID
BW_ORGANIZATION_ID=$BW_ORGANIZATION_ID

ENVHEADER

# Parse secrets and add to .env
echo "$SECRETS_JSON" | jq -r '.[] | "\(.key)=\(.value)"' | while read -r line; do
    # Skip VITE_ variables that are duplicates or frontend-only
    key="${line%%=*}"
    case "$key" in
        VITE_*|ARWEAVE_KEYFILE)
            # Skip these - they're either frontend-only or handled separately
            ;;
        *)
            echo "$line" >> "$PROJECT_ROOT/.env"
            ;;
    esac
done

log_success "Created .env file with $(grep -c '=' "$PROJECT_ROOT/.env") variables"

# Step 4: Check for dokploy-network
log_info "Checking for dokploy-network..."
if ! sudo docker network inspect dokploy-network &> /dev/null; then
    log_warn "dokploy-network not found. Creating it..."
    sudo docker network create --driver overlay dokploy-network 2>/dev/null || \
    sudo docker network create dokploy-network
    log_success "Created dokploy-network"
else
    log_success "dokploy-network exists"
fi

# Step 5: Build Docker containers
log_info "Building Docker containers (this may take a few minutes)..."
sudo $DOCKER_COMPOSE build --no-cache
log_success "Docker containers built"

# Step 6: Start services
log_info "Starting services..."
sudo $DOCKER_COMPOSE up -d
log_success "Services started"

# Wait for backend to be healthy
log_info "Waiting for backend to become healthy..."
RETRIES=30
while [[ $RETRIES -gt 0 ]]; do
    if curl -s http://127.0.0.1:3001/health > /dev/null 2>&1; then
        log_success "Backend is healthy"
        break
    fi
    RETRIES=$((RETRIES - 1))
    sleep 2
done

if [[ $RETRIES -eq 0 ]]; then
    log_error "Backend failed to become healthy. Check logs with: sudo docker compose logs backend"
    exit 1
fi

# Step 7: Restore backup (if not skipped)
if [[ "$SKIP_RESTORE" == "false" ]]; then
    log_info "Preparing to restore backup..."

    # Find latest backup directory if not specified
    if [[ -z "$BACKUP_DIR" ]]; then
        # Look for the most complete backup (one with content-archive.tar.gz)
        BACKUP_DIR=$(ls -d "$PROJECT_ROOT/backups"/*/ 2>/dev/null | while read dir; do
            if [[ -f "$dir/content-archive.tar.gz" ]] && [[ -f "$dir/database.sql" ]]; then
                echo "$dir"
            fi
        done | sort -r | head -1)

        if [[ -z "$BACKUP_DIR" ]]; then
            log_warn "No complete backup found. Skipping restore."
            SKIP_RESTORE=true
        else
            log_info "Using backup: $BACKUP_DIR"
        fi
    fi

    if [[ "$SKIP_RESTORE" == "false" ]] && [[ -d "$BACKUP_DIR" ]]; then
        # Restore database
        if [[ -f "$BACKUP_DIR/database.sql" ]]; then
            log_info "Restoring database..."

            # Clear existing data and remove restrictive constraints
            sudo $DOCKER_COMPOSE exec -T postgres psql -U postgres -d misjustice_dev << 'SQLCLEAR'
ALTER TABLE case_documents DROP CONSTRAINT IF EXISTS case_documents_case_id_fkey;
ALTER TABLE case_documents DROP CONSTRAINT IF EXISTS check_evidence_category;
TRUNCATE TABLE case_documents CASCADE;
TRUNCATE TABLE legal_cases CASCADE;
SQLCLEAR

            # Restore from backup
            cat "$BACKUP_DIR/database.sql" | sudo $DOCKER_COMPOSE exec -T postgres psql -U postgres -d misjustice_dev > /dev/null 2>&1

            # Verify restore
            CASE_COUNT=$(sudo $DOCKER_COMPOSE exec -T postgres psql -U postgres -d misjustice_dev -t -c "SELECT COUNT(*) FROM legal_cases;")
            DOC_COUNT=$(sudo $DOCKER_COMPOSE exec -T postgres psql -U postgres -d misjustice_dev -t -c "SELECT COUNT(*) FROM case_documents;")

            log_success "Database restored: $CASE_COUNT cases, $DOC_COUNT documents"
        fi

        # Restore content archive
        if [[ -f "$BACKUP_DIR/content-archive.tar.gz" ]]; then
            log_info "Extracting content archive..."
            tar -xzf "$BACKUP_DIR/content-archive.tar.gz" -C "$PROJECT_ROOT"
            FILE_COUNT=$(find "$PROJECT_ROOT/content-archive" -type f | wc -l)
            log_success "Content archive extracted: $FILE_COUNT files"
        fi
    fi
fi

# Step 8: Final verification
log_info "Running final verification..."

# Check all services
echo ""
echo "Service Status:"
sudo $DOCKER_COMPOSE ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

# Test API endpoints
echo ""
API_HEALTH=$(curl -s http://127.0.0.1:3001/health 2>/dev/null | jq -r '.success' 2>/dev/null || echo "failed")
if [[ "$API_HEALTH" == "true" ]]; then
    log_success "API health check: OK"
else
    log_warn "API health check: FAILED"
fi

# Test external access (if domain resolves)
if curl -s https://api.misjusticealliance.org/health > /dev/null 2>&1; then
    log_success "External API access: OK"
else
    log_warn "External API access: Not available (check DNS/Traefik)"
fi

# Summary
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    DEPLOYMENT COMPLETE                          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "  Frontend:  https://misjusticealliance.org"
echo "  API:       https://api.misjusticealliance.org"
echo "  Local API: http://127.0.0.1:3001"
echo ""
echo "  Commands:"
echo "    View logs:    sudo docker compose logs -f"
echo "    Stop:         sudo docker compose down"
echo "    Restart:      sudo docker compose restart"
echo ""
