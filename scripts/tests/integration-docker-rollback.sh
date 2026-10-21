#!/usr/bin/env bash
set -euo pipefail
kind="$CI_PROJECT_KIND"
case "$kind" in
  board) project=board; services="app chat-app frontend"; front=frontend; backend=board-back-end; front_container=board-fe-react; source_script=scripts/deploy.sh; compose_file=docker-compose.yml ;;
  groover) project=groover-prod; services="api web"; front=web; backend=groover-prod-api-1; front_container=groover-prod-web-1; source_script=scripts/deploy-guard.sh; compose_file=docker-compose.production.yml ;;
  achat) project=achat-prod; services="backend frontend"; front=frontend; backend=achat-prod-backend-1; front_container=achat-prod-frontend-1; source_script=scripts/deploy-guard.sh; compose_file=compose.prod.yml ;;
  *) echo "Unknown project" >&2; exit 1 ;;
esac
REAL_DOCKER="$(command -v docker)"
REAL_CURL="$(command -v curl)"
export REAL_DOCKER REAL_CURL
root="$(mktemp -d)"
mkdir -p "$root/bin" "$root/home/$kind/.deploy" "$root/release/deploy"
cat > "$root/bin/docker" <<'WRAP'
#!/usr/bin/env bash
set -euo pipefail
case "$1" in
  login) cat >/dev/null; exit 0 ;;
  logout) exit 0 ;;
  compose)
    for word in "$@"; do
      if [[ "$word" == pull ]]; then exit 0; fi
    done ;;
esac
exec "$REAL_DOCKER" "$@"
WRAP
cat > "$root/bin/curl" <<'WRAP'
#!/usr/bin/env bash
set -euo pipefail
args=()
for a in "$@"; do
  if [[ "$a" == https://* ]]; then a=http://127.0.0.1:19091/health; fi
  args+=("$a")
done
exec "$REAL_CURL" "${args[@]}"
WRAP
chmod +x "$root/bin/docker" "$root/bin/curl"
cat > "$root/serve.py" <<'PY'
import os
from http.server import BaseHTTPRequestHandler, HTTPServer
class H(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(503 if os.getenv("RELEASE") == "broken" else 200)
        self.end_headers()
        self.wfile.write(os.getenv("RELEASE", "").encode())
HTTPServer(("0.0.0.0", 8080), H).serve_forever()
PY
cat > "$root/Dockerfile" <<'DOCKERFILE'
FROM python:3.12-alpine
ARG RELEASE
ENV RELEASE=$RELEASE
COPY serve.py /serve.py
HEALTHCHECK --interval=2s --timeout=2s --start-period=2s --retries=2 CMD python -c 'import urllib.request; urllib.request.urlopen("http://127.0.0.1:8080/health", timeout=1)'
CMD ["python", "/serve.py"]
DOCKERFILE
for release in old new broken; do
  "$REAL_DOCKER" build -q --build-arg "RELEASE=$release" -t "ci-$kind-fixture:$release" "$root" >/dev/null
done
for s in $services; do
  for tag in old new bad; do
    source_tag="$tag"
    if [[ "$tag" == bad ]]; then
      if [[ "$s" == "$front" ]]; then source_tag=broken; else source_tag=new; fi
    fi
    "$REAL_DOCKER" tag "ci-$kind-fixture:$source_tag" "ci-$kind-$s:$tag"
  done
done
project_root="$root/release"
env_file="$root/home/$kind/.env.production"
if [[ "$kind" == board ]]; then
  project_root="$root/home/board"
  env_file="$project_root/.env"
  manifest="$project_root/.deploy/docker-compose.yml"
else
  if [[ "$kind" == achat ]]; then env_file="$root/home/achat/.env.prod"; fi
  manifest="$project_root/$compose_file"
fi
printf 'CI_TEST=1\n' > "$env_file"
{
  echo "name: $project"
  echo "services:"
  for s in $services; do
    echo "  $s:"
    echo "    image: ci-$kind-$s:old"
    if [[ "$kind" == board ]]; then
      case "$s" in
        app) echo "    container_name: board-back-end" ;;
        chat-app) echo "    container_name: chat-app" ;;
        frontend) echo "    container_name: board-fe-react" ;;
      esac
    fi
    if [[ "$s" == "$front" ]]; then
      echo "    ports:"
      echo "      - '127.0.0.1:19091:8080'"
    fi
  done
} > "$manifest"
if [[ "$kind" != board ]]; then
  printf 'services:\n' > "$project_root/deploy/compose.actions.yml"
fi
compose_actual() {
  if [[ "$kind" == board ]]; then
    "$REAL_DOCKER" compose -p board --project-directory "$project_root" -f "$manifest" "$@"
  else
    "$REAL_DOCKER" compose --project-directory "$project_root" --env-file "$env_file" -f "$manifest" -f "$project_root/deploy/compose.actions.yml" "$@"
  fi
}
cleanup() {
  compose_actual down -v --remove-orphans >/dev/null 2>&1 || true
  "$REAL_DOCKER" rm -f caddy >/dev/null 2>&1 || true
  "$REAL_DOCKER" network rm board-net proxy-net >/dev/null 2>&1 || true
  rm -rf "$root"
}
trap cleanup EXIT
"$REAL_DOCKER" network create board-net >/dev/null
"$REAL_DOCKER" network create proxy-net >/dev/null
"$REAL_DOCKER" run -d --name caddy alpine:3.20 sleep 3600 >/dev/null
compose_actual up -d --no-build --wait $services >/dev/null
before_caddy="$("$REAL_DOCKER" inspect --format '{{.Id}}' caddy)"
export HOME="$root/home" PROJECT="$root/home/$kind" RELEASE_DIR="$root/release"
export GHCR_USER=ci GHCR_TOKEN=ci-testing-only BOARD_IMAGE_TAG=new APP_IMAGE_TAG=new
export PATH="$root/bin:$PATH"
sed -i 's/:old/:new/g' "$manifest"
bash "$source_script"
expected="$("$REAL_DOCKER" image inspect --format '{{.Id}}' "ci-$kind-fixture:new")"
for container in "$backend" "$front_container"; do
  test "$("$REAL_DOCKER" inspect --format '{{.Image}}' "$container")" == "$expected"
done
echo "PASS: $kind healthy deployment with real Docker"
sed -i 's/:new/:bad/g' "$manifest"
export BOARD_IMAGE_TAG=bad APP_IMAGE_TAG=bad
exit_code=0
bash "$source_script" > "$root/fail.log" 2>&1 || exit_code=$?
if [[ "$exit_code" != 1 ]]; then
  cat "$root/fail.log"
  echo "Expected rollback and nonzero exit, got $exit_code" >&2
  exit 1
fi
for container in "$backend" "$front_container"; do
  test "$("$REAL_DOCKER" inspect --format '{{.Image}}' "$container")" == "$expected"
  test "$("$REAL_DOCKER" inspect --format '{{.State.Health.Status}}' "$container")" == healthy
done
test "$("$REAL_DOCKER" inspect --format '{{.Id}}' caddy)" == "$before_caddy"
echo "PASS: $kind real Docker rollback after unhealthy frontend"
