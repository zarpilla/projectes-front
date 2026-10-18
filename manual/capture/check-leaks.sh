#!/usr/bin/env bash
# Looks for real data from the source tenant database inside the anonymized copy.
#   MYSQL_PWD=... ./check-leaks.sh <source_db> <anonymized_v5_db> [mysql user]
# The source can be the v3 db the ETL read (resilience) or the v5 db that was cloned
# (projectes_v5_diligencia for the logistics copy): the queries use columns both have,
# and the logistics ones are skipped when the source has no such table.
# Prints every real value still present and exits 1 if there is any.
set -euo pipefail
SRC="${1:?source db}"; DST="${2:?anonymized db}"; USER_="${3:-admin}"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
q() { mysql -h127.0.0.1 -u"$USER_" -N -B "$SRC" -e "$1"; }
# runs the query only when the source has that table (v3 and v5 differ in the logistics part)
has() { [ "$(q "select count(*) from information_schema.tables where table_schema = database() and table_name = '$1'")" -gt 0 ]; }

{
  q "select name from projects"
  q "select name from contacts union select trade_name from contacts union select nif from contacts
     union select email from contacts union select contact_person from contacts union select phone from contacts"
  q "select username from \`users-permissions_user\` union select email from \`users-permissions_user\`
     union select fullname from \`users-permissions_user\`"
  q "select name from us union select nif from us union select email from us union select address from us"
  # the footers repeat the entity's data in free text (issues/056)
  q "select quote_footer from us union select invoice_footer from us union select order_footer from us"
  q "select iban from bank_accounts"
  # the strategic plan is free text too (issues/125)
  q "select name from strategies union select description from strategies union select code from strategies"
  # scopes and types are named after the entity's own projects and programmes; the
  # generic ones anonymize.sql keeps are in leak-allow.txt
  q "select name from project_scopes union select short_name from project_scopes
     union select name from project_types union select name from activity_types"
  # logistics (block F): delivery points, providers, order snapshots and free text
  q "select address from contacts union select contact_email from contacts union select contact_phone from contacts
     union select notes from contacts union select notes_delivery from contacts"
  if has orders; then
    q "select contact_name from orders union select contact_trade_name from orders union select contact_nif from orders
       union select contact_phone from orders union select contact_address from orders
       union select comments from orders union select contact_notes from orders union select provider_order_number from orders"
  fi
  if has incidences; then q "select description from incidences"; fi
  if has components_orders_incidence_responses; then q "select text from components_orders_incidence_responses"; fi
  if has components_orders_lines; then q "select name from components_orders_lines union select nif from components_orders_lines"; fi
  if has form_submissions; then
    q "select name from form_submissions union select email from form_submissions union select message from form_submissions"
  fi
  if has pickups; then q "select name from pickups union select message from pickups"; fi
  if has document_change_logs; then q "select username from document_change_logs"; fi
} | sed 's/^[[:space:]]*//; s/[[:space:]]*$//' | awk 'length($0) >= 6 && $0 != "NULL"' | sort -u > "$TMP/real.txt"

mysqldump -h127.0.0.1 -u"$USER_" --skip-extended-insert --no-create-info "$DST" > "$TMP/dump.sql"
# names also appear inside the generic config (states, types…) that is kept on purpose;
# ignore values that are a single common word
# and values without letters (placeholders like 0000000); public names go in leak-allow.txt
ALLOW="$(dirname "$0")/leak-allow.txt"; [ -f "$ALLOW" ] || ALLOW=/dev/null
# town names are configuration (the logistics routes' towns), not personal data
cat "$ALLOW" > "$TMP/allow.txt"
mysql -h127.0.0.1 -u"$USER_" -N -B "$DST" -e "select name from cities" >> "$TMP/allow.txt" 2>/dev/null || true
grep -vP '^[\p{L}·]+$' "$TMP/real.txt" | grep -P '\p{L}' | grep -vxFf "$TMP/allow.txt" > "$TMP/patterns.txt" || true
N="$(wc -l < "$TMP/patterns.txt")"
[ "$N" -gt 0 ] || { echo "no real values read from $SRC — check the source db"; exit 2; }
echo "checking $N real values against $DST"
if grep -oFf "$TMP/patterns.txt" "$TMP/dump.sql" | sort | uniq -c | sort -rn > "$TMP/hits.txt" && [ -s "$TMP/hits.txt" ]; then
  echo "LEAKS:"; cat "$TMP/hits.txt"; exit 1
fi
# an IBAN in free text may be spaced differently from the stored one: any
# Spanish IBAN in the dump other than the ES00… placeholder is a leak (issues/056)
if tr -d ' ' < "$TMP/dump.sql" | grep -oP 'ES\d{22}' | grep -v '^ES00' | sort -u > "$TMP/ibans.txt" && [ -s "$TMP/ibans.txt" ]; then
  echo "IBAN LEAKS:"; cat "$TMP/ibans.txt"; exit 1
fi
echo "no leaks found"
