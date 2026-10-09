#!/usr/bin/env bash
# Deploy a frontend image to every site on the VPS.
#
#   ./deploy.sh v5-vue3-<40-hex sha> [site ...]     e.g. ./deploy.sh v5-vue3-a70bdd5... demo
#
# Each site runs its own container from <compose dir>/docker-compose.yml (nginx
# serving the built app under /stats/). Per site: pin the compose file to the new
# tag, recreate the container, and wait until http://127.0.0.1:<EXTERNAL_PORT>/stats/
# serves the app. The canary goes first, then the rest one by one. If a site doesn't
# come back, it and every site already switched in this run go back to the tag they
# had, and the script exits non-zero.
#
# GitHub Actions calls it over SSH with a key restricted to this script
# (authorized_keys: command="/var/www/esstrapis-front/deploy.sh",restrict ...);
# the arguments then arrive in SSH_ORIGINAL_COMMAND.
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")"

IMAGE=webcoop/esstrapis-front
CANARY=demo
HEALTH_TIMEOUT=${HEALTH_TIMEOUT:-90}
LOG=deploy.log

if [ -n "${SSH_ORIGINAL_COMMAND:-}" ]; then read -r -a ARGS <<<"$SSH_ORIGINAL_COMMAND"; else ARGS=("$@"); fi
TAG="${ARGS[0]:-}"
[[ "$TAG" =~ ^v5-vue3-[0-9a-f]{40}$ ]] || { echo "Usage: deploy.sh v5-vue3-<40-hex sha> [site ...]"; exit 2; }

# sites.conf: <name> <compose dir>
declare -A DIR
ALL=()
while read -r name dir _; do
  [[ -z "$name" || "$name" == \#* ]] && continue
  DIR[$name]=$dir; ALL+=("$name")
done < sites.conf
ONLY=("${ARGS[@]:1}")
for s in "${ONLY[@]}"; do [ -n "${DIR[$s]:-}" ] || { echo "Unknown site: $s"; exit 2; }; done

exec 9>.deploy.lock
flock -n 9 || { echo "Another deploy is running"; exit 3; }
# Finish (or roll back) even if the SSH session that started us goes away.
trap '' HUP PIPE
exec > >(tee -a --output-error=warn-nopipe "$LOG") 2>&1

if [ ${#ONLY[@]} -gt 0 ]; then ORDER=("${ONLY[@]}")
else
  ORDER=()
  [ -n "${DIR[$CANARY]:-}" ] && ORDER+=("$CANARY")
  for s in "${ALL[@]}"; do [ "$s" = "$CANARY" ] || ORDER+=("$s"); done
fi
echo "=== $(date -Is) deploy $TAG to ${ORDER[*]}"

compose_tag() { sed -n "s#^\s*image:\s*$IMAGE:\(\S*\)\s*\$#\1#p" "$1/docker-compose.yml" | head -1; }
set_tag() { sed -i "s#^\(\s*image:\s*$IMAGE:\)\S*\s*\$#\1$2#" "$1/docker-compose.yml"; }
site_port() { sed -n 's/^EXTERNAL_PORT=//p' "$1/.env" 2>/dev/null | tr -d "\"' " | head -1; }

# Every site's compose dir is called `docker`, so they all share the compose project
# "docker": never pass --remove-orphans (or `down`), it would remove the other sites'
# containers. Only the service in the site's own file is recreated.
recreate() {  # dir
  (cd "$1" && docker compose up -d --force-recreate 2>&1 | grep -vE "^\s*$|obsolete" || true)
}

healthy() {  # site
  local port waited=0 body=""
  port=$(site_port "${DIR[$1]}"); port=${port:-8080}
  while [ $waited -lt $HEALTH_TIMEOUT ]; do
    sleep 2; waited=$((waited + 2))
    body=$(curl -s -m 5 "http://127.0.0.1:$port/stats/" || true)
    if [[ "$body" == *"assets/index"* ]]; then echo "    $1 serving after ${waited}s (port $port)"; return 0; fi
  done
  echo "!!  $1 not serving /stats/ after ${HEALTH_TIMEOUT}s (port $port)"; return 1
}

declare -A FROM
SWITCHED=()

rollback() {
  local s
  echo "!!  rolling back ${SWITCHED[*]} to their previous tags"
  for s in "${SWITCHED[@]}"; do
    set_tag "${DIR[$s]}" "${FROM[$s]}"
    recreate "${DIR[$s]}"
    healthy "$s" || echo "!!  $s: previous tag ${FROM[$s]} doesn't serve either"
  done
  echo "=== $(date -Is) deploy $TAG FAILED, rolled back ${SWITCHED[*]}"
  exit 1
}

echo "--- pulling $IMAGE:$TAG"
docker pull -q "$IMAGE:$TAG" >/dev/null

for s in "${ORDER[@]}"; do
  dir=${DIR[$s]}
  [ -f "$dir/docker-compose.yml" ] || { echo "!!  $s: no $dir/docker-compose.yml"; rollback; }
  FROM[$s]=$(compose_tag "$dir")
  [ -n "${FROM[$s]}" ] || { echo "!!  $s: no $IMAGE image in $dir/docker-compose.yml"; rollback; }
  echo "--- $s: ${FROM[$s]} -> $TAG"
  set_tag "$dir" "$TAG"
  SWITCHED+=("$s")
  recreate "$dir"
  healthy "$s" || rollback
done

# Every site must still be up (a deploy step must never take another site down).
DOWN=()
for s in "${ALL[@]}"; do
  (cd "${DIR[$s]}" && docker compose up -d 2>&1 | grep -vE "^\s*$|obsolete|Running" || true)
  HEALTH_TIMEOUT=30 healthy "$s" >/dev/null || DOWN+=("$s")
done
[ ${#DOWN[@]} -eq 0 ] || { echo "!!  not serving after the deploy: ${DOWN[*]}"; exit 1; }

# Keep the images some site still uses and the one just deployed; drop the rest.
IN_USE=" $IMAGE:$TAG "
for s in "${ALL[@]}"; do IN_USE+="$IMAGE:$(compose_tag "${DIR[$s]}") "; done
docker images "$IMAGE" --format '{{.Repository}}:{{.Tag}}' | while read -r img; do
  case "$IN_USE" in *" $img "*) ;; *) docker rmi "$img" >/dev/null 2>&1 || true ;; esac
done

echo "=== $(date -Is) deploy $TAG OK (${#ORDER[@]} sites)"
