#!/bin/bash

################################################################################
# Setup Backup Cronjob
#
# This script sets up the daily backup cronjob on the frontend server
# Runs every day at 03:00 AM
#
# Usage: sudo ./scripts/setup-backup-cronjob.sh
################################################################################

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_PATH="${PROJECT_ROOT}/scripts/backup-site.sh"
CRON_SCHEDULE="0 3 * * *"
CRON_ENTRY="$CRON_SCHEDULE $SCRIPT_PATH"

echo "Setting up backup cronjob..."
echo "  Schedule: Daily at 03:00 AM"
echo "  Script: $SCRIPT_PATH"
echo ""

# Check if script exists
if [ ! -f "$SCRIPT_PATH" ]; then
    echo "Error: Backup script not found at $SCRIPT_PATH"
    exit 1
fi

# Check if script is executable
if [ ! -x "$SCRIPT_PATH" ]; then
    echo "Making script executable..."
    chmod +x "$SCRIPT_PATH"
fi

# Get current crontab (if exists)
CRONTAB_FILE="/tmp/crontab-backup.txt"
crontab -l > "$CRONTAB_FILE" 2>/dev/null || true

# Check if cron entry already exists
if grep -q "$SCRIPT_PATH" "$CRONTAB_FILE"; then
    echo "✓ Backup cronjob already exists"
    grep "$SCRIPT_PATH" "$CRONTAB_FILE"
else
    echo "✓ Adding backup cronjob..."
    echo "$CRON_ENTRY" >> "$CRONTAB_FILE"
    crontab "$CRONTAB_FILE"
    echo "✓ Cronjob installed successfully"
fi

# Verify installation
echo ""
echo "Current crontab entries for backup:"
crontab -l | grep -E "backup-site|misjustice" || echo "(no backup entries)"

# Cleanup
rm -f "$CRONTAB_FILE"

echo ""
echo "Setup complete! Backups will run daily at 03:00 AM"
echo "Log file: ${PROJECT_ROOT}/backups/site-backup/backup.log"
