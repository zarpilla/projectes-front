#!/usr/bin/env bash
# (Re)creates the throwaway database the e2e tests write to, as a copy of an
# anonymized tenant, and marks it with the sentinel contact the tests look for
# before writing anything (see e2e.spec.mjs).
#
#   MYSQL_PWD=... ./e2e-db.sh [source=projectes_v5_manual] [target=projectes_v5_e2e] [user=admin]
#
# Stop the e2e backend first, and start it again afterwards (DATABASE_NAME=<target>).
set -euo pipefail

SOURCE=${1:-projectes_v5_manual}
TARGET=${2:-projectes_v5_e2e}
DB_USER=${3:-admin}

# never drop anything that isn't an e2e copy
if [[ "$TARGET" != *_e2e ]]; then
  echo "refusing: the target database name must end in _e2e (got '$TARGET')" >&2
  exit 1
fi

mysql -u"$DB_USER" -e "DROP DATABASE IF EXISTS \`$TARGET\`; CREATE DATABASE \`$TARGET\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
mysqldump -u"$DB_USER" --single-transaction --routines "$SOURCE" | mysql -u"$DB_USER" "$TARGET"
mysql -u"$DB_USER" "$TARGET" -e "INSERT INTO contacts (document_id, name, created_at, updated_at) VALUES ('e2e-sentinel', 'E2E SENTINEL', NOW(), NOW())"

# uploads are not copied: without the logo file, every new emitted invoice fails
# (its PDF is drawn with the logo). The PDF is drawn without one when there is none.
mysql -u"$DB_USER" "$TARGET" -e "DELETE FROM files_related_mph WHERE related_type = 'api::me.me' AND field = 'logo'"

# the e2e login must not be hidden: hidden users are left out of the leader list,
# and the new-project form then fails to default "Coordina" to the logged-in user
E2E_USER=$(sed -n 's/^E2E_USER=//p' "$(dirname "$0")/.env.e2e" 2>/dev/null || true)
if [[ -n "$E2E_USER" ]]; then
  mysql -u"$DB_USER" "$TARGET" -e "UPDATE \`users-permissions_user\` SET hidden = 0, blocked = 0 WHERE email = '$E2E_USER'"
fi
echo "$TARGET is a fresh copy of $SOURCE"
