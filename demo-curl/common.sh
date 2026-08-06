#!/usr/bin/env bash

set -euo pipefail

# Find the project root regardless of where the script is launched.
DEMO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$DEMO_DIR/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/demo.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: demo.env was not found."
  echo "Run the demo setup script first, then try again."
  exit 1
fi

source "$ENV_FILE"

pause_demo() {
  echo
  read -r -p "Press Enter to send this request..."
  echo
}

heading() {
  echo
  echo "============================================================"
  echo "$1"
  echo "============================================================"
}

explain() {
  echo
  echo "$1"
}

send_request() {
  local response_file
  local status_code

  response_file="$(mktemp)"

  status_code=$(
    curl -sS \
      -o "$response_file" \
      -w "%{http_code}" \
      "$@"
  )

  echo "Response:"
  echo

  if ! python3 -m json.tool < "$response_file"; then
    cat "$response_file"
    echo
  fi

  echo
  echo "HTTP status: $status_code"

  rm -f "$response_file"
}
