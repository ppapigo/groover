#!/bin/sh
set -eu

# Validate both production credentials before the official entrypoint starts PostgreSQL.
# Existing volumes are not reinitialized and their stored passwords are not changed here.
validate_password() {
    if ! printf '%s' "$1" | awk '
        { value = value $0; lines++ }
        END {
            lower = tolower(value)
            for (i = 1; i <= length(value); i++) seen[substr(value, i, 1)] = 1
            for (item in seen) distinct++
            if (lines != 1 || length(value) < 24 || distinct < 10 ||
                lower ~ /password|changeme|groover|development|change-this/) exit 1
        }'; then
        echo "Production database passwords must be securely generated, at least 24 characters, and not default values." >&2
        exit 1
    fi
}

validate_password "${POSTGRES_PASSWORD:-}"
validate_password "${GROOVER_APP_PASSWORD:-}"
if [ "$POSTGRES_PASSWORD" = "$GROOVER_APP_PASSWORD" ]; then
    echo "The database administrator and application passwords must be different." >&2
    exit 1
fi
exec /usr/local/bin/docker-entrypoint.sh "$@"
