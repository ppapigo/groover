#!/usr/bin/env bash
set -euo pipefail
# Update only application services. Never touch Caddy, DBs or Redis.
: "${APP_IMAGE_TAG:?Missing release SHA}"
: "${GHCR_USER:?Missing GHCR_USER}"
: "${GHCR_TOKEN:?Missing GHCR_TOKEN}"
: "${PROJECT:?Missing existing project directory}"
: "${RELEASE_DIR:?Missing checked-out release directory}"
test -s "$PROJECT/.env.production"
docker network inspect proxy-net >/dev/null
compose() { docker compose --project-directory "$RELEASE_DIR" --env-file "$PROJECT/.env.production" -f "$RELEASE_DIR/docker-compose.production.yml" -f "$RELEASE_DIR/deploy/compose.actions.yml" "$@"; }
services=(api web)
containers=(groover-prod-api-1 groover-prod-web-1)
declare -a previous=()
for container in "${containers[@]}"; do
  previous+=("$(docker inspect --type container --format '{{.Image}}' "$container")")
  test -n "${previous[-1]}"
  docker image inspect "${previous[-1]}" >/dev/null
done
echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin >/dev/null
trap 'docker logout ghcr.io >/dev/null 2>&1 || true' EXIT
compose config --quiet
compose pull "${services[@]}"
verify() {
  for container in "${containers[@]}"; do
    status="$(docker inspect --type container --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing-healthcheck{{end}}' "$container")" || return 1
    [[ "$status" == healthy ]] || { echo "Health check failed for $container: $status" >&2; return 1; }
  done
  curl --fail --silent --show-error --retry 5 --retry-delay 3 --max-time 15 --output /dev/null "https://grooverapp.com"
}
rollback() {
  echo "Deployment failed; restoring previous immutable image IDs" >&2
  rollback_file="$(mktemp "/tmp/groover-rollback.XXXXXXXX.yml")"
  chmod 600 "$rollback_file"
  printf 'services:\n' > "$rollback_file"
  for i in "${!services[@]}"; do
    printf '  %s:\n    image: %s\n' "${services[i]}" "${previous[i]}" >> "$rollback_file"
  done
  # Override only application image references; never restart dependencies.
  if ! compose -f "$rollback_file" up -d --no-deps --no-build --wait "${services[@]}"; then
    echo "ROLLBACK FAILED: investigate immediately" >&2
    rm -f "$rollback_file"
    return 1
  fi
  rm -f "$rollback_file"
  verify || { echo "Rollback health verification failed" >&2; return 1; }
  echo "Previous images restored. Database migrations are NOT reverted." >&2
}
if ! { compose up -d --no-deps --no-build --wait "${services[@]}" && verify; }; then
  rollback || exit 2
  exit 1
fi
echo "Deploy verified for groover; images: ${APP_IMAGE_TAG}"
