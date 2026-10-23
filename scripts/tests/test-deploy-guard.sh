#!/usr/bin/env bash
set -euo pipefail
repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
script="$repo_root/scripts/deploy-guard.sh"
for scenario in success fail_frontend web_redirect wrong_web api_redirect wrong_api api_failure; do
  export MOCK_SCENARIO="$scenario"
  tmp="$(mktemp -d)"
  export MOCK_LOG="$tmp/docker.log" MOCK_FAIL_MARKER="$tmp/failed-once"
  export MOCK_FAIL_FRONTEND=0
  mkdir -p "$tmp/bin" "$tmp/home/board/.deploy" "$tmp/home/achat" "$tmp/home/groover" "$tmp/release"
  printf 'example=1\n' > "$tmp/home/board/.env"
  printf 'services: {}\n' > "$tmp/home/board/.deploy/docker-compose.yml"
  printf 'example=1\n' > "$tmp/home/achat/.env.prod"
  printf 'example=1\n' > "$tmp/home/groover/.env.production"
  cat > "$tmp/bin/docker" <<'MOCK_DOCKER'
#!/usr/bin/env bash
set -euo pipefail
echo "docker $*" >> "$MOCK_LOG"
case "$1" in
  inspect)
    if [[ "$*" == *".Image"* ]]; then
      printf 'sha256:%064d\n' 1
    else
      echo healthy
    fi
    ;;
  compose)
    up=0; frontend=0; rollback=0
    for arg in "$@"; do
      [[ "$arg" == up ]] && up=1
      [[ "$arg" == frontend || "$arg" == web ]] && frontend=1
      [[ "$arg" == *-rollback.*.yml ]] && rollback=1
    done
    if [[ "$up" == 1 && "$frontend" == 1 && "$rollback" == 0 && "${MOCK_FAIL_FRONTEND:-0}" == 1 && ! -f "$MOCK_FAIL_MARKER" ]]; then
      touch "$MOCK_FAIL_MARKER"
      exit 78
    fi
    ;;
  login) cat >/dev/null ;;
  image | network | logout) ;;
  *) echo "Unknown Docker mock invocation: $*" >&2; exit 2 ;;
esac
MOCK_DOCKER
  cat > "$tmp/bin/curl" <<'MOCK_CURL'
#!/usr/bin/env bash
set -euo pipefail
echo "curl $*" >> "$MOCK_LOG"
url="${!#}"
case "$url" in
  https://groover.grooverapp.com/) body='<title>Groover — 후기를 고르는 더 나은 방법</title>'; code=200 ;;
  https://groover.grooverapp.com/v1/health) body='{"status":"UP"}'; code=200 ;;
  *) echo "Unexpected URL: $url" >&2; exit 2 ;;
esac
# Fail once; the rollback must recheck the restored public service.
if [[ ! -f "$MOCK_FAIL_MARKER" ]]; then
  case "$MOCK_SCENARIO:$url" in
    web_redirect:*/) code=302; touch "$MOCK_FAIL_MARKER" ;;
    wrong_web:*/) body='<title>Other service</title>'; touch "$MOCK_FAIL_MARKER" ;;
    api_redirect:*/health) code=302; touch "$MOCK_FAIL_MARKER" ;;
    wrong_api:*/health) body='<html>SPA fallback</html>'; touch "$MOCK_FAIL_MARKER" ;;
    api_failure:*/health) touch "$MOCK_FAIL_MARKER"; exit 22 ;;
  esac
fi
printf '%s\n%s' "$body" "$code"
MOCK_CURL
  chmod +x "$tmp/bin/docker" "$tmp/bin/curl"
  : > "$MOCK_LOG"
  [[ "$scenario" == fail_frontend ]] && export MOCK_FAIL_FRONTEND=1
  status=0
  HOME="$tmp/home" PROJECT="$tmp/home/groover" RELEASE_DIR="$tmp/release" GHCR_USER=test GHCR_TOKEN=dummy APP_IMAGE_TAG="$(printf '%040d' 2)" BOARD_IMAGE_TAG="$(printf '%040d' 2)" PATH="$tmp/bin:$PATH" bash "$script" > "$tmp/output" 2>&1 || status=$?
  if [[ "$scenario" == success ]]; then
    [[ "$status" == 0 ]] || { cat "$tmp/output"; echo "Expected success; got $status" >&2; exit 1; }
    if grep -q 'rollback.*up' "$MOCK_LOG"; then echo "Unexpected rollback on success" >&2; exit 1; fi
  else
    [[ "$status" == 1 ]] || { cat "$tmp/output"; echo "Expected guarded failure (exit 1); got $status" >&2; exit 1; }
    grep -q 'docker image tag' "$MOCK_LOG" || { echo "Old image not pinned" >&2; exit 1; }
    grep -q -- '-rollback.' "$MOCK_LOG" || { echo "Rollback compose override not applied" >&2; exit 1; }
    grep -q 'Previous images restored' "$tmp/output" || { cat "$tmp/output"; exit 1; }
  fi
  if grep '^docker compose' "$MOCK_LOG" | grep ' up ' | grep -E ' caddy( |$)| mysql( |$)| redis( |$)| db( |$)'; then
    echo "Unsafe dependency restart detected" >&2; exit 1
  fi
  echo "PASS: groover $scenario"
  rm -rf "$tmp"
done
