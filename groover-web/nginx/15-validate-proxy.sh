#!/bin/sh
set -eu
# Reject ranges, multiple peers and directive injection. The shared Caddy peer is IPv4.
if ! printf '%s\n' "${CADDY_PROXY_IP:-}" | awk -F. '
    NF != 4 { exit 1 }
    { for (i=1; i<=4; i++) if ($i !~ /^[0-9]+$/ || $i > 255) exit 1 }
    END { if (NR != 1) exit 1 }
'; then
    echo "CADDY_PROXY_IP must be the exact IPv4 address of the trusted Caddy container." >&2
    exit 1
fi
mkdir -p /tmp/nginx
