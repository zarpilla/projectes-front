#!/usr/bin/env bash
# Looks for real data from the source (v3) tenant database inside the anonymized copy.
#   MYSQL_PWD=... ./check-leaks.sh <source_v3_db> <anonymized_v5_db> [mysql user]
# Prints every real value still present and exits 1 if there is any.
set -euo pipefail
SRC="${1:?source db}"; DST="${2:?anonymized db}"; USER_="${3:-admin}"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
q() { mysql -h127.0.0.1 -u"$USER_" -N -B "$SRC" -e "$1"; }

{
  q "select name from projects"
  q "select name from contacts union select trade_name from contacts union select nif from contacts
     union select email from contacts union select contact_person from contacts union select phone from contacts"
  q "select username from \`users-permissions_user\` union select email from \`users-permissions_user\`
     union select fullname from \`users-permissions_user\`"
  q "select name from us union select nif from us union select email from us union select address from us"
  q "select iban from bank_accounts"
} | sed 's/^[[:space:]]*//; s/[[:space:]]*$//' | awk 'length($0) >= 6 && $0 != "NULL"' | sort -u > "$TMP/real.txt"

mysqldump -h127.0.0.1 -u"$USER_" --skip-extended-insert --no-create-info "$DST" > "$TMP/dump.sql"
# names also appear inside the generic config (states, types…) that is kept on purpose;
# ignore values that are a single common word
# and values without letters (placeholders like 0000000); public names go in leak-allow.txt
ALLOW="$(dirname "$0")/leak-allow.txt"; [ -f "$ALLOW" ] || ALLOW=/dev/null
grep -vP '^[\p{L}·]+$' "$TMP/real.txt" | grep -P '\p{L}' | grep -vxFf "$ALLOW" > "$TMP/patterns.txt" || true
N="$(wc -l < "$TMP/patterns.txt")"
[ "$N" -gt 0 ] || { echo "no real values read from $SRC — check the source db"; exit 2; }
echo "checking $N real values against $DST"
if grep -oFf "$TMP/patterns.txt" "$TMP/dump.sql" | sort | uniq -c | sort -rn > "$TMP/hits.txt" && [ -s "$TMP/hits.txt" ]; then
  echo "LEAKS:"; cat "$TMP/hits.txt"; exit 1
fi
echo "no leaks found"
