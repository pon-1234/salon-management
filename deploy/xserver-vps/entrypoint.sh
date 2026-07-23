#!/usr/bin/env sh
# /**
#  * @design_doc   docs/VPS_DEPLOYMENT.md
#  * @related_to   Dockerfile - Packages this entrypoint; Prisma migrations - Prepare the salon database
#  * @known_issues docs/VPS_DEPLOYMENT.md
#  */
set -eu

./node_modules/.bin/prisma migrate deploy
exec "$@"
