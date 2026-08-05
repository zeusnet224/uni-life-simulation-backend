#!/usr/bin/env bash

set -euo pipefail

BASE_URL="http://127.0.0.1:3200"
UNIVERSE_FILE="universes/universe4.json"
REQUEST_FILE="demo-simulation.json"
ENV_FILE="demo.env"

# Extracts one property from a JSON response.
json_field() {
  local field="$1"

  python3 -c '
import json
import sys

field = sys.argv[1]

try:
    data = json.load(sys.stdin)
except json.JSONDecodeError:
    print("The server returned invalid JSON.", file=sys.stderr)
    sys.exit(1)

if field not in data:
    print("Expected field was missing:", field, file=sys.stderr)
    print(json.dumps(data, indent=2), file=sys.stderr)
    sys.exit(1)

print(data[field])
' "$field"
}

echo "Checking that the server is running..."

SERVER_RESPONSE=$(curl -sS "$BASE_URL/")

printf '%s\n' "$SERVER_RESPONSE" | python3 -m json.tool

echo
echo "Clearing old demo data..."

curl -sS \
  -X DELETE \
  "$BASE_URL/clear" \
  | python3 -m json.tool

echo
echo "Checking universe4.json and preparing the simulation body..."

python3 - <<'PY'
import json
from pathlib import Path

universe_path = Path("universes/universe4.json")
request_path = Path("demo-simulation.json")

with universe_path.open(encoding="utf-8") as file:
    universe_data = json.load(file)

opportunities = universe_data.get("opportunities", [])

if len(opportunities) < 4:
    raise SystemExit(
        "universe4.json must contain at least four opportunities."
    )

with request_path.open("w", encoding="utf-8") as file:
    json.dump(
        {"universeData": universe_data},
        file,
        indent=2
    )

print(
    f"Prepared {request_path} with "
    f"{len(universe_data.get('courses', []))} courses, "
    f"{len(universe_data.get('exams', []))} exams, and "
    f"{len(opportunities)} opportunities."
)
PY

echo
echo "Registering demo user 1..."

USER_1_RESPONSE=$(curl -sS \
  -X POST \
  "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "z1234567",
    "password": "Password123",
    "nameFirst": "Demo",
    "nameLast": "Student"
  }')

SESSION_1=$(printf '%s' "$USER_1_RESPONSE" | json_field session)

echo "User 1 registered."

echo
echo "Registering demo user 2..."

USER_2_RESPONSE=$(curl -sS \
  -X POST \
  "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "z7654321",
    "password": "Password123",
    "nameFirst": "Second",
    "nameLast": "Student"
  }')

SESSION_2=$(printf '%s' "$USER_2_RESPONSE" | json_field session)

echo "User 2 registered."

# Creates one simulation and prints its ID.
create_simulation() {
  local session="$1"
  local response

  response=$(curl -sS \
    -X POST \
    "$BASE_URL/simulations" \
    -H "Content-Type: application/json" \
    -H "session: $session" \
    --data-binary "@$REQUEST_FILE")

  printf '%s' "$response" | json_field simulationId
}

echo
echo "Creating three simulations for user 1..."

SIMULATION_ADVISOR=$(create_simulation "$SESSION_1")
SIMULATION_SOCIAL=$(create_simulation "$SESSION_1")
SIMULATION_OPPORTUNITIES=$(create_simulation "$SESSION_1")

EXAM_ID="E1-COMP1531"

OPPORTUNITY_1="peer-mentoring"
OPPORTUNITY_2="student-volunteering"
OPPORTUNITY_3="coding-workshop"
OPPORTUNITY_4="student-leadership"

# Save the generated IDs and session tokens for later commands.
{
  printf 'export BASE_URL=%q\n' "$BASE_URL"
  printf 'export SESSION_1=%q\n' "$SESSION_1"
  printf 'export SESSION_2=%q\n' "$SESSION_2"
  printf 'export SIMULATION_ADVISOR=%q\n' "$SIMULATION_ADVISOR"
  printf 'export SIMULATION_SOCIAL=%q\n' "$SIMULATION_SOCIAL"
  printf 'export SIMULATION_OPPORTUNITIES=%q\n' "$SIMULATION_OPPORTUNITIES"
  printf 'export EXAM_ID=%q\n' "$EXAM_ID"
  printf 'export OPPORTUNITY_1=%q\n' "$OPPORTUNITY_1"
  printf 'export OPPORTUNITY_2=%q\n' "$OPPORTUNITY_2"
  printf 'export OPPORTUNITY_3=%q\n' "$OPPORTUNITY_3"
  printf 'export OPPORTUNITY_4=%q\n' "$OPPORTUNITY_4"
} > "$ENV_FILE"

echo
echo "Demo data created successfully."
echo
echo "Simulation assignments:"
echo "  Advisor/readiness simulation: $SIMULATION_ADVISOR"
echo "  Social/wellbeing simulation:   $SIMULATION_SOCIAL"
echo "  Opportunities simulation:      $SIMULATION_OPPORTUNITIES"
echo
echo "Saved session tokens and IDs in $ENV_FILE."
echo
echo "Checking the four configured opportunities..."

curl -sS \
  "$BASE_URL/simulations/$SIMULATION_OPPORTUNITIES/opportunities" \
  -H "session: $SESSION_1" \
  | python3 -m json.tool

echo
echo "Setup complete."
echo "Run the following command in this terminal:"
echo
echo "  source demo.env"
