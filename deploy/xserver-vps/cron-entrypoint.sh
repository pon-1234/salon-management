#!/usr/bin/env sh
# /**
#  * @design_doc   docs/VPS_DEPLOYMENT.md
#  * @related_to   salon-cron container - Holds explicitly approved scheduled jobs
#  * @known_issues Point expiration remains disabled pending FIFO allocation and reconciliation
#  */
set -eu

printenv | grep -E '^[A-Za-z_][A-Za-z0-9_]*=' > /etc/environment
cat > /etc/cron.d/salon-management <<'EOF'
# No scheduled data mutation or notification jobs are approved for production.
# See docs/VPS_DEPLOYMENT.md before adding an entry.
EOF
chmod 600 /etc/cron.d/salon-management
exec cron -f
