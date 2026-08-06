#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

SECOND_EXAM_ID="E2-COMP1531"

heading "FLOW 1: Advisor and different recommendations"

explain "We will inspect the advisor plan and recommendation for a fresh simulation."
explain "Then we will meaningfully change the student's state and request them again."

# ------------------------------------------------------------
heading "1. Inspect the initial advisor plan"

echo "GET /simulations/$SIMULATION_ADVISOR/advisor/plan"

pause_demo

send_request \
  "$BASE_URL/simulations/$SIMULATION_ADVISOR/advisor/plan" \
  -H "session: $SESSION_1"

explain "The plan compares five possible actions."
explain "Each action shows whether it is allowed, its impact and a reason."
explain "The response also identifies current risks or blockers."

# ------------------------------------------------------------
heading "2. Request the initial recommendation"

echo "GET /simulations/$SIMULATION_ADVISOR/recommendation"

pause_demo

send_request \
  "$BASE_URL/simulations/$SIMULATION_ADVISOR/recommendation" \
  -H "session: $SESSION_1"

explain "In the fresh state, STUDYING should be the primary recommendation."
explain "The alternatives include availability and reasons."

# ------------------------------------------------------------
heading "3. Study for three hours"

echo "POST /simulations/$SIMULATION_ADVISOR/action"
echo "Body: {\"action\":\"STUDYING\",\"duration\":3,\"examId\":\"$EXAM_ID\"}"

pause_demo

send_request \
  -X POST \
  "$BASE_URL/simulations/$SIMULATION_ADVISOR/action" \
  -H "Content-Type: application/json" \
  -H "session: $SESSION_1" \
  -d "{\"action\":\"STUDYING\",\"duration\":3,\"examId\":\"$EXAM_ID\"}"

# ------------------------------------------------------------
heading "4. Take a one-hour break"

echo "POST /simulations/$SIMULATION_ADVISOR/action"
echo 'Body: {"action":"DOOM_SCROLLING","duration":1}'

pause_demo

send_request \
  -X POST \
  "$BASE_URL/simulations/$SIMULATION_ADVISOR/action" \
  -H "Content-Type: application/json" \
  -H "session: $SESSION_1" \
  -d '{"action":"DOOM_SCROLLING","duration":1}'

# ------------------------------------------------------------
heading "5. Study another exam for three hours"

echo "POST /simulations/$SIMULATION_ADVISOR/action"
echo "Body: {\"action\":\"STUDYING\",\"duration\":3,\"examId\":\"$SECOND_EXAM_ID\"}"

pause_demo

send_request \
  -X POST \
  "$BASE_URL/simulations/$SIMULATION_ADVISOR/action" \
  -H "Content-Type: application/json" \
  -H "session: $SESSION_1" \
  -d "{\"action\":\"STUDYING\",\"duration\":3,\"examId\":\"$SECOND_EXAM_ID\"}"

explain "The student now has low energy and low happiness."
explain "The most recent activity was three consecutive hours of studying."

# ------------------------------------------------------------
heading "6. Inspect the advisor plan in the changed state"

echo "GET /simulations/$SIMULATION_ADVISOR/advisor/plan"

pause_demo

send_request \
  "$BASE_URL/simulations/$SIMULATION_ADVISOR/advisor/plan" \
  -H "session: $SESSION_1"

explain "The plan should identify LOW_ENERGY and LOW_HAPPINESS risks."
explain "Studying should currently be blocked by the consecutive-study limit."

# ------------------------------------------------------------
heading "7. Request the new recommendation"

echo "GET /simulations/$SIMULATION_ADVISOR/recommendation"

pause_demo

send_request \
  "$BASE_URL/simulations/$SIMULATION_ADVISOR/recommendation" \
  -H "session: $SESSION_1"

explain "The primary recommendation should now be SLEEPING."
explain "This proves that different simulation states produce different recommendations."
explain "It also avoids recommending STUDYING while that action is invalid."

heading "FLOW 1 COMPLETE"

echo
echo "Summary:"
echo "  - The advisor compared at least three possible actions."
echo "  - It displayed availability, impact, reasons and blockers."
echo "  - The original recommendation was STUDYING."
echo "  - After the state changed, the recommendation became SLEEPING."
echo
