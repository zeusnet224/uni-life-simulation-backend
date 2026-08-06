#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

heading "FLOW 2: Social support and a blocked wellbeing activity"

explain "We will first attempt to hang out without a valid social connection."
explain "The request should fail without changing the simulation."
explain "We will then create a connection and retry successfully."

# ------------------------------------------------------------
heading "1. Confirm there are no social connections"

echo "GET /simulations/$SIMULATION_SOCIAL/connections"

pause_demo

send_request \
  "$BASE_URL/simulations/$SIMULATION_SOCIAL/connections" \
  -H "session: $SESSION_1"

explain "The connections array should initially be empty."

# ------------------------------------------------------------
heading "2. Inspect state before the blocked activity"

echo "GET /simulations/$SIMULATION_SOCIAL"

pause_demo

send_request \
  "$BASE_URL/simulations/$SIMULATION_SOCIAL" \
  -H "session: $SESSION_1"

explain "Notice the current energy, happiness, time elapsed and activity."

# ------------------------------------------------------------
heading "3. Attempt HANG_OUT without a valid connection"

echo "POST /simulations/$SIMULATION_SOCIAL/wellbeing"
echo 'Body: {"activity":"HANG_OUT","targetId":"missing-connection","duration":2}'

pause_demo

send_request \
  -X POST \
  "$BASE_URL/simulations/$SIMULATION_SOCIAL/wellbeing" \
  -H "Content-Type: application/json" \
  -H "session: $SESSION_1" \
  -d '{
    "activity": "HANG_OUT",
    "targetId": "missing-connection",
    "duration": 2
  }'

explain "This should return INVALID_TARGET with HTTP status 400."
explain "The connection prerequisite is missing."

# ------------------------------------------------------------
heading "4. Confirm the failed request did not mutate state"

echo "GET /simulations/$SIMULATION_SOCIAL"

pause_demo

send_request \
  "$BASE_URL/simulations/$SIMULATION_SOCIAL" \
  -H "session: $SESSION_1"

explain "Energy, happiness, time elapsed and current activity should be unchanged."

# ------------------------------------------------------------
heading "5. Create a close social connection"

echo "POST /simulations/$SIMULATION_SOCIAL/connections"
echo 'Body: {"name":"Jamie Park","closeness":5}'

pause_demo

response_file="$(mktemp)"

status_code=$(
  curl -sS \
    -o "$response_file" \
    -w "%{http_code}" \
    -X POST \
    "$BASE_URL/simulations/$SIMULATION_SOCIAL/connections" \
    -H "Content-Type: application/json" \
    -H "session: $SESSION_1" \
    -d '{
      "name": "Jamie Park",
      "closeness": 5
    }'
)

echo "Response:"
echo

if ! python3 -m json.tool < "$response_file"; then
  cat "$response_file"
  echo
fi

echo
echo "HTTP status: $status_code"

if [[ "$status_code" != "200" ]]; then
  echo
  echo "The connection could not be created."
  rm -f "$response_file"
  exit 1
fi

CONNECTION_ID=$(
  python3 -c '
import json
import sys

response = json.load(sys.stdin)
print(response["connectionId"])
' < "$response_file"
)

rm -f "$response_file"

echo
echo "Saved connection ID: $CONNECTION_ID"

explain "The generated connection ID will be used automatically in the later request."

# ------------------------------------------------------------
heading "6. List the structured connection"

echo "GET /simulations/$SIMULATION_SOCIAL/connections"

pause_demo

send_request \
  "$BASE_URL/simulations/$SIMULATION_SOCIAL/connections" \
  -H "session: $SESSION_1"

explain "The connection contains an ID, name, closeness and creation time."
explain "The creation time is based on the simulation's elapsed time."

# ------------------------------------------------------------
heading "7. Attempt to create a duplicate connection"

echo "POST /simulations/$SIMULATION_SOCIAL/connections"
echo 'Body: {"name":"Jamie Park","closeness":3}'

pause_demo

send_request \
  -X POST \
  "$BASE_URL/simulations/$SIMULATION_SOCIAL/connections" \
  -H "Content-Type: application/json" \
  -H "session: $SESSION_1" \
  -d '{
    "name": "Jamie Park",
    "closeness": 3
  }'

explain "This should return DUPLICATE_CONNECTION with HTTP status 400."

# ------------------------------------------------------------
heading "8. Retry HANG_OUT using the new connection"

echo "POST /simulations/$SIMULATION_SOCIAL/wellbeing"
echo "Target connection: $CONNECTION_ID"
echo 'Duration: 2 hours'

pause_demo

send_request \
  -X POST \
  "$BASE_URL/simulations/$SIMULATION_SOCIAL/wellbeing" \
  -H "Content-Type: application/json" \
  -H "session: $SESSION_1" \
  -d "{
    \"activity\": \"HANG_OUT\",
    \"targetId\": \"$CONNECTION_ID\",
    \"duration\": 2
  }"

explain "The activity now succeeds because the social prerequisite exists."
explain "The response shows the happiness gain, energy cost and elapsed-time cost."

# ------------------------------------------------------------
heading "9. Inspect the later effect in simulation state"

echo "GET /simulations/$SIMULATION_SOCIAL"

pause_demo

send_request \
  "$BASE_URL/simulations/$SIMULATION_SOCIAL" \
  -H "session: $SESSION_1"

explain "The later API response now shows the changed wellbeing state."

heading "FLOW 2 COMPLETE"

echo
echo "Summary:"
echo "  - HANG_OUT was initially blocked by a missing connection."
echo "  - The failed request did not mutate the simulation."
echo "  - A structured social connection was created."
echo "  - A duplicate connection was rejected."
echo "  - HANG_OUT then succeeded and produced a visible later effect."
echo
