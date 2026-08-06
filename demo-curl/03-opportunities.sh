#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

heading "FLOW 3: Opportunities and their trade-offs"

explain "This simulation uses opportunities loaded from universe4.json."
explain "We will list them, join one, apply its later effects,"
explain "enforce the maximum-three limit, and leave one."

# ------------------------------------------------------------
heading "1. Inspect available opportunities"

echo "GET /simulations/$SIMULATION_OPPORTUNITIES/opportunities"

pause_demo

send_request \
  "$BASE_URL/simulations/$SIMULATION_OPPORTUNITIES/opportunities" \
  -H "session: $SESSION_1"

explain "The four opportunities come from the simulation's universe data."
explain "Each should initially have isJoined: false."

# ------------------------------------------------------------
heading "2. Inspect state before joining"

echo "GET /simulations/$SIMULATION_OPPORTUNITIES"

pause_demo

send_request \
  "$BASE_URL/simulations/$SIMULATION_OPPORTUNITIES" \
  -H "session: $SESSION_1"

explain "Notice the current happiness, elapsed time and exam progress."
explain "We will compare this state after joining."

# ------------------------------------------------------------
heading "3. Join the first opportunity"

echo "POST /simulations/$SIMULATION_OPPORTUNITIES/opportunities/$OPPORTUNITY_1/join"

pause_demo

send_request \
  -X POST \
  "$BASE_URL/simulations/$SIMULATION_OPPORTUNITIES/opportunities/$OPPORTUNITY_1/join" \
  -H "session: $SESSION_1"

explain "Joining records membership for this student's simulation."
explain "It does not immediately apply any benefit or time cost."

# ------------------------------------------------------------
heading "4. Confirm joining alone did not apply effects"

echo "GET /simulations/$SIMULATION_OPPORTUNITIES"

pause_demo

send_request \
  "$BASE_URL/simulations/$SIMULATION_OPPORTUNITIES" \
  -H "session: $SESSION_1"

explain "Happiness, elapsed time and study progress should be unchanged."
explain "Only the opportunity membership was recorded."

# ------------------------------------------------------------
heading "5. Apply the opportunity's later effects"

echo "POST /simulations/$SIMULATION_OPPORTUNITIES/opportunities/$OPPORTUNITY_1/apply"
echo "Body: {\"examId\":\"$EXAM_ID\"}"

pause_demo

send_request \
  -X POST \
  "$BASE_URL/simulations/$SIMULATION_OPPORTUNITIES/opportunities/$OPPORTUNITY_1/apply" \
  -H "Content-Type: application/json" \
  -H "session: $SESSION_1" \
  -d "{\"examId\":\"$EXAM_ID\"}"

explain "This represents actually participating in the opportunity."
explain "The response shows the happiness and academic benefits,"
explain "as well as the elapsed-time cost."

# ------------------------------------------------------------
heading "6. Join the second opportunity"

echo "POST /simulations/$SIMULATION_OPPORTUNITIES/opportunities/$OPPORTUNITY_2/join"

pause_demo

send_request \
  -X POST \
  "$BASE_URL/simulations/$SIMULATION_OPPORTUNITIES/opportunities/$OPPORTUNITY_2/join" \
  -H "session: $SESSION_1"

# ------------------------------------------------------------
heading "7. Join the third opportunity"

echo "POST /simulations/$SIMULATION_OPPORTUNITIES/opportunities/$OPPORTUNITY_3/join"

pause_demo

send_request \
  -X POST \
  "$BASE_URL/simulations/$SIMULATION_OPPORTUNITIES/opportunities/$OPPORTUNITY_3/join" \
  -H "session: $SESSION_1"

explain "The student now has the maximum of three joined opportunities."

# ------------------------------------------------------------
heading "8. Attempt to join a fourth opportunity"

echo "POST /simulations/$SIMULATION_OPPORTUNITIES/opportunities/$OPPORTUNITY_4/join"

pause_demo

send_request \
  -X POST \
  "$BASE_URL/simulations/$SIMULATION_OPPORTUNITIES/opportunities/$OPPORTUNITY_4/join" \
  -H "session: $SESSION_1"

explain "This request should be rejected because the maximum is three."
explain "The expected HTTP status is 400."

# ------------------------------------------------------------
heading "9. Leave the first opportunity"

echo "DELETE /simulations/$SIMULATION_OPPORTUNITIES/opportunities/$OPPORTUNITY_1/leave"

pause_demo

send_request \
  -X DELETE \
  "$BASE_URL/simulations/$SIMULATION_OPPORTUNITIES/opportunities/$OPPORTUNITY_1/leave" \
  -H "session: $SESSION_1"

explain "The response should return isJoined: false."

# ------------------------------------------------------------
heading "10. Inspect the final opportunity memberships"

echo "GET /simulations/$SIMULATION_OPPORTUNITIES/opportunities"

pause_demo

send_request \
  "$BASE_URL/simulations/$SIMULATION_OPPORTUNITIES/opportunities" \
  -H "session: $SESSION_1"

heading "FLOW 3 COMPLETE"

echo
echo "Summary:"
echo "  - Opportunities came from the universe configuration."
echo "  - Joining alone did not apply benefits."
echo "  - Applying produced benefits and a time cost."
echo "  - A fourth joined opportunity was rejected."
echo "  - Leaving returned isJoined: false."
echo
