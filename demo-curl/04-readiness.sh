#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

heading "FLOW 4: Academic readiness"

explain "We will begin with LOW readiness."
explain "We will then complete enough study progress, but readiness will remain LOW."
explain "Finally, joining an extracurricular will add a second readiness component"
explain "and change the result from LOW to MEDIUM."

# ------------------------------------------------------------
heading "1. Inspect the initial LOW readiness"

echo "GET /simulations/$SIMULATION_SOCIAL/exams/$EXAM_ID/readiness"

pause_demo

send_request \
  "$BASE_URL/simulations/$SIMULATION_SOCIAL/exams/$EXAM_ID/readiness" \
  -H "session: $SESSION_1"

explain "The result should initially be LOW."
explain "The student has insufficient study progress,"
explain "fewer than two close social connections,"
explain "and no joined extracurricular opportunity."

# ------------------------------------------------------------
heading "2. Study enough for the exam"

echo "POST /simulations/$SIMULATION_SOCIAL/action"
echo "Body: {\"action\":\"STUDYING\",\"duration\":2,\"examId\":\"$EXAM_ID\"}"

pause_demo

send_request \
  -X POST \
  "$BASE_URL/simulations/$SIMULATION_SOCIAL/action" \
  -H "Content-Type: application/json" \
  -H "session: $SESSION_1" \
  -d "{
    \"action\": \"STUDYING\",
    \"duration\": 2,
    \"examId\": \"$EXAM_ID\"
  }"

explain "The selected exam requires two study hours."
explain "The study-progress readiness component is now satisfied."

# ------------------------------------------------------------
heading "3. Show that readiness is still LOW"

echo "GET /simulations/$SIMULATION_SOCIAL/exams/$EXAM_ID/readiness"

pause_demo

send_request \
  "$BASE_URL/simulations/$SIMULATION_SOCIAL/exams/$EXAM_ID/readiness" \
  -H "session: $SESSION_1"

explain "Readiness should still be LOW."
explain "Only one of the three readiness components is currently satisfied:"
explain "study progress."
explain "MEDIUM requires two satisfied components."

# ------------------------------------------------------------
heading "4. Inspect available extracurricular opportunities"

echo "GET /simulations/$SIMULATION_SOCIAL/opportunities"

pause_demo

send_request \
  "$BASE_URL/simulations/$SIMULATION_SOCIAL/opportunities" \
  -H "session: $SESSION_1"

explain "These opportunities originate from the simulation's universe configuration."
explain "They should currently show isJoined: false."

# ------------------------------------------------------------
heading "5. Join an extracurricular opportunity"

echo "POST /simulations/$SIMULATION_SOCIAL/opportunities/$OPPORTUNITY_1/join"

pause_demo

send_request \
  -X POST \
  "$BASE_URL/simulations/$SIMULATION_SOCIAL/opportunities/$OPPORTUNITY_1/join" \
  -H "session: $SESSION_1"

explain "The student has now joined an extracurricular opportunity."
explain "This satisfies the second readiness component."

# ------------------------------------------------------------
heading "6. Confirm the opportunity is joined"

echo "GET /simulations/$SIMULATION_SOCIAL/opportunities"

pause_demo

send_request \
  "$BASE_URL/simulations/$SIMULATION_SOCIAL/opportunities" \
  -H "session: $SESSION_1"

explain "$OPPORTUNITY_1 should now show isJoined: true."

# ------------------------------------------------------------
heading "7. Show readiness changing to MEDIUM"

echo "GET /simulations/$SIMULATION_SOCIAL/exams/$EXAM_ID/readiness"

pause_demo

send_request \
  "$BASE_URL/simulations/$SIMULATION_SOCIAL/exams/$EXAM_ID/readiness" \
  -H "session: $SESSION_1"

explain "Readiness should now be MEDIUM."
explain "Two readiness components are satisfied:"
explain "  1. At least 75 percent of the required study hours."
explain "  2. At least one joined extracurricular opportunity."
explain "The student still has fewer than two close social connections,"
explain "so readiness is MEDIUM rather than HIGH."

heading "FLOW 4 READINESS SECTION COMPLETE"

echo
echo "Summary:"
echo "  - Initial readiness was LOW."
echo "  - Studying satisfied one component, but readiness remained LOW."
echo "  - Joining an extracurricular satisfied a second component."
echo "  - Readiness then changed from LOW to MEDIUM."
echo
echo "Readiness is advisory and does not determine the prescribed"
echo "exam PASS or FAIL calculation."
echo
echo "The submitted server does not expose the exam-attempt function"
echo "through an HTTP route, so the actual attempt cannot be sent through curl."
echo
