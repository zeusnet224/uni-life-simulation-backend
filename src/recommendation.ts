import { getData } from './dataStore.js';
import { findStudentOrError, findOwnedSimulationOrError, isError } from './validators.js';
import { checkWinLoseConditions } from './action.js';
import { Simulation, SocialConnection, Result } from './types.js';
import { HANG_OUT, ATTEND_CLUB_EVENT, hangOutEnergyCost, totalStudyHours, WELLBEING_EFFECTS } from './wellbeing.js';

interface Candidate {
  action: string;
  target: Record<string, unknown> | null;
  duration: number;
  available: boolean;
  // Only used when available === false: the exact condition that blocks it.
  blockedReason: string;
  score: number; // higher = more strongly recommended for the current state
}

export interface AlternativeAction {
  action: string;
  target: Record<string, unknown> | null;
  duration: number;
  available: boolean;
  reason: string;
}

export interface Recommendation {
  action: string;
  target: Record<string, unknown> | null;
  duration: number;
  available: true;
  reason: string;
  alternatives: AlternativeAction[];
}

// --- state helpers ---------------------------------------------------------

function recentConsecutiveStudyHours(simulation: Simulation): number {
  const history = simulation.actionHistory;
  let hours = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].action === 'STUDYING') {
      hours += history[i].duration;
    } else {
      break;
    }
  }
  return hours;
}

function hoursSinceLastSleep(simulation: Simulation): number | null {
  const history = simulation.actionHistory;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].action === 'SLEEPING') {
      return simulation.timeElapsed - history[i].endTime;
    }
  }
  return null;
}

function hasEatenWithin4Hours(simulation: Simulation): boolean {
  const history = simulation.actionHistory;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].action === 'EATING') {
      return simulation.timeElapsed - history[i].endTime <= 4;
    }
  }
  return false;
}

function exerciseCooldownPassed(simulation: Simulation): boolean {
  const history = simulation.actionHistory;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].action === 'EXERCISING') {
      return simulation.timeElapsed >= history[i].endTime + 1;
    }
  }
  return true;
}

// The pending exam closest to being ready, for a targeted STUDYING suggestion.
function nearestReadyExam(simulation: Simulation) {
  const pending = simulation.universeData.exams.filter(
    e => e.examStatus !== 'ATTEMPTED' && e.studyHoursCompleted < e.requiredStudyHours
  );
  if (pending.length === 0) return null;
  return pending.reduce((best, exam) => {
    const bestRatio = best.studyHoursCompleted / Math.max(1, best.requiredStudyHours);
    const examRatio = exam.studyHoursCompleted / Math.max(1, exam.requiredStudyHours);
    return examRatio > bestRatio ? exam : best;
  });
}

function connectionsFor(simulationId: number): SocialConnection[] {
  return getData().socialConnections.filter(c => c.simulationId === simulationId);
}

// --- candidate construction ------------------------------------------------
// Each candidate computes ONLY its availability + score here. The human-facing
// wording (primary vs alternative) is generated afterwards so the primary
// always reads as a recommendation and alternatives read as comparisons.

function buildCandidates(simulation: Simulation): Candidate[] {
  const { energy, happiness } = simulation;

  const connections = connectionsFor(simulation.simulationId);
  const bestConnection = connections.reduce<SocialConnection | null>(
    (best, c) => (best === null || c.closeness > best.closeness ? c : best),
    null
  );

  const joinedOpps = simulation.universeData.opportunities.filter(o =>
    simulation.joinedOpportunities.includes(o.opportunityId)
  );
  const firstJoinedOpp = joinedOpps[0] ?? null;

  const recentStudy = recentConsecutiveStudyHours(simulation);
  const studyAllowed = recentStudy < 3;
  const sinceSleep = hoursSinceLastSleep(simulation);
  const exam = nearestReadyExam(simulation);
  const studiedHours = totalStudyHours(simulation);

  const candidates: Candidate[] = [];

  // SLEEPING — always valid, the safe recovery move.
  candidates.push({
    action: 'SLEEPING',
    target: null,
    duration: 1,
    available: true,
    blockedReason: '',
    score: energy <= 20 ? 100 : energy <= 50 ? 60 : (sinceSleep === null || sinceSleep >= 8 ? 25 : 8),
  });

  // EATING — always valid; also unlocks exercising.
  candidates.push({
    action: 'EATING',
    target: null,
    duration: 1,
    available: true,
    blockedReason: '',
    score: energy <= 40 ? 55 : 22,
  });

  // DOOM_SCROLLING — always valid, low-effort fallback.
  candidates.push({
    action: 'DOOM_SCROLLING',
    target: null,
    duration: 1,
    available: true,
    blockedReason: '',
    score: 15,
  });

  // STUDYING — valid only if an exam still needs hours and the 3-hour cap allows.
  {
    let available = false;
    let blockedReason = '';
    let target: Record<string, unknown> | null = null;
    let score = 0;

    if (exam === null) {
      blockedReason = 'every exam is already study-ready or attempted, so there is nothing left to study.';
    } else if (!studyAllowed) {
      blockedReason = `you have studied ${recentStudy} hours in a row and the cap is 3 — do something else for at least 1 hour first.`;
    } else {
      available = true;
      const pct = Math.round((exam.studyHoursCompleted / exam.requiredStudyHours) * 100);
      target = { examId: exam.examId, name: exam.name, readyPct: pct };
      score = energy > 25 ? 70 + Math.round((exam.studyHoursCompleted / exam.requiredStudyHours) * 15) : 30;
    }

    candidates.push({ action: 'STUDYING', target, duration: 1, available, blockedReason, score });
  }

  // EXERCISING — valid only if eaten recently and off cooldown.
  {
    const eaten = hasEatenWithin4Hours(simulation);
    const cooled = exerciseCooldownPassed(simulation);
    const available = eaten && cooled;

    let blockedReason = '';
    if (!eaten) blockedReason = 'you must EAT within the last 4 hours before exercising.';
    else if (!cooled) blockedReason = 'exercising is on a 1-hour cooldown after your last session.';

    let score = available ? (happiness <= 20 ? 45 : 20) : 0;
    if (available && energy < 15) score = Math.min(score, 10);

    candidates.push({ action: 'EXERCISING', target: null, duration: 1, available, blockedReason, score });
  }

  // HANG_OUT — valid only with an existing connection and enough energy.
  {
    const duration = 1;
    const cost = hangOutEnergyCost(duration);
    let available = false;
    let blockedReason = '';
    let target: Record<string, unknown> | null = null;
    let score = 0;

    if (bestConnection === null) {
      blockedReason = 'you have no social connections yet — create one before you can hang out.';
    } else if (energy < cost) {
      blockedReason = `hanging out costs ${cost} energy but you only have ${energy}.`;
    } else {
      available = true;
      target = { connectionId: bestConnection.connectionId, name: bestConnection.name, closeness: bestConnection.closeness };
      score = happiness <= 20 ? 90 : happiness <= 50 ? 50 : 40;
    }

    candidates.push({ action: HANG_OUT, target, duration, available, blockedReason, score });
  }

  // ATTEND_CLUB_EVENT — valid only if a club is joined, energy is high enough,
  // AND enough study hours have been banked (mirrors the wellbeing endpoint).
  {
    const cfg = WELLBEING_EFFECTS.ATTEND_CLUB_EVENT;
    let available = false;
    let blockedReason = '';
    let target: Record<string, unknown> | null = null;
    let score = 0;

    if (firstJoinedOpp === null) {
      blockedReason = 'you have not joined any club/opportunity yet — join one to attend an event.';
    } else if (energy < cfg.minEnergyToAttend) {
      blockedReason = `attending needs at least ${cfg.minEnergyToAttend} energy but you have ${energy}.`;
    } else if (studiedHours < cfg.minStudyHoursToAttend) {
      blockedReason = `you must bank at least ${cfg.minStudyHoursToAttend} study hours first — you have ${studiedHours}.`;
    } else {
      available = true;
      target = { opportunityId: firstJoinedOpp.opportunityId, name: firstJoinedOpp.name };
      score = happiness <= 20 ? 88 : happiness <= 50 ? 52 : 42;
    }

    candidates.push({ action: ATTEND_CLUB_EVENT, target, duration: 1, available, blockedReason, score });
  }

  return candidates;
}

// reason generation

// Why the chosen primary is the top priority, stated against the real numbers.
function primaryReason(primary: Candidate, sim: Simulation): string {
  const e = sim.energy;
  const h = sim.happiness;
  const t = primary.target as Record<string, unknown> | null;

  switch (primary.action) {
    case 'SLEEPING':
      if (e <= 20) return `Energy is critically low (${e} ≤ 20). Resting restores the most energy and prevents a drop-out, so it outranks studying or socialising right now.`;
      if (e <= 50) return `Energy (${e}) is on the low side; sleeping restores it fastest, so it is the most useful next move.`;
      return `Nothing is urgent (energy ${e}, happiness ${h}); a short sleep keeps your energy topped up and is the best of the available options.`;
    case 'EATING':
      if (e <= 40) return `Energy is low (${e}); eating is the safest way to recover some, and it unlocks exercising next.`;
      return `Nothing is urgent (energy ${e}); eating gives a small energy top-up and unlocks exercising — the best available option right now.`;
    case 'STUDYING': {
      const base = `Exam '${t?.name}' is ${t?.readyPct}% ready — the closest to done — so studying it advances graduation fastest.`;
      if (h <= 20) return `Happiness is low (${h}) but no wellbeing activity is available right now, so studying is the best available move. ${base}`;
      if (e <= 50) return `Energy (${e}) is modest, but with an exam close to ready, academic progress is the best use of time. ${base}`;
      return `Energy (${e}) and happiness (${h}) are both healthy, so academic progress is the priority. ${base}`;
    }
    case 'EXERCISING':
      return h <= 20
        ? `Happiness is low (${h}) and you have eaten recently, so exercising is the strongest mood boost currently available.`
        : `Your stats are stable (energy ${e}, happiness ${h}); exercising gives a strong happiness boost and you have eaten recently, so it is a solid next move.`;
    case HANG_OUT:
      if (h <= 20) return `Happiness is low (${h}) while energy (${e}) is fine, so lifting your mood is the priority — and ${t?.name} (closeness ${t?.closeness}/5) gives the largest happiness gain of any option.`;
      if (h <= 50) return `Happiness (${h}) could be higher; time with ${t?.name} (closeness ${t?.closeness}/5) gives the biggest lift available and only costs a little energy.`;
      return `Your mood is fine (${h}), and time with ${t?.name} (closeness ${t?.closeness}/5) is a low-risk way to keep happiness high — the best available option.`;
    case ATTEND_CLUB_EVENT:
      return h <= 20
        ? `Happiness is low (${h}); a ${t?.name} event restores both happiness and energy with no downside, making it the safest recovery.`
        : `Your stats are stable (energy ${e}, happiness ${h}), so a ${t?.name} event is a strong use of time — it lifts happiness and tops up energy.`;
    default:
      return `Nothing is urgent (energy ${e}, happiness ${h}), so a low-cost break is the most sensible next action.`;
  }
}

// Why an AVAILABLE alternative is worth knowing about but not the top pick.
function availableAltReason(c: Candidate, sim: Simulation): string {
  const e = sim.energy;
  const t = c.target as Record<string, unknown> | null;
  switch (c.action) {
    case 'SLEEPING':
      return `Available — would restore energy (now ${e}), but that is not the current priority.`;
    case 'EATING':
      return `Available — a small energy/happiness top-up that also unlocks exercising, but a minor gain right now.`;
    case 'DOOM_SCROLLING':
      return `Available — a small pick-me-up, but low impact next to the recommended action.`;
    case 'STUDYING':
      return `Available — exam '${t?.name}' is ${t?.readyPct}% ready and worth studying, but another action takes priority right now.`;
    case 'EXERCISING':
      return `Available — a strong happiness boost since you have eaten recently, but another action ranks higher right now.`;
    case HANG_OUT:
      return `Available — time with ${t?.name} (closeness ${t?.closeness}/5) would boost happiness, but another action ranks higher right now.`;
    case ATTEND_CLUB_EVENT:
      return `Available — a ${t?.name} event would lift happiness and energy, but another action ranks higher right now.`;
    default:
      return `Available, but not the priority right now.`;
  }
}

// main entry point

// Recommends the next best action for a valid, still-active simulation.
// Errors: INVALID_STUDENT_ID, INVALID_SIMULATION, SIMULATION_ENDED
export function simulationGetRecommendation(
  studentId: string,
  simulationId: number
): Result<{ recommendation: Recommendation }> {
  const student = findStudentOrError(studentId);
  if (isError(student)) return student;

  const simulation = findOwnedSimulationOrError(studentId, simulationId);
  if (isError(simulation)) return simulation;

  // An ended simulation has no valid next action, so there is nothing to recommend.
  checkWinLoseConditions(simulation);
  if (simulation.simulationStatus !== 'ACTIVE') {
    return { error: 'SIMULATION_ENDED', message: 'This simulation has ended, so there is no next action to recommend' };
  }

  const candidates = buildCandidates(simulation);

  // Primary = the highest-scoring AVAILABLE candidate (guaranteed to exist,
  // since SLEEPING / EATING / DOOM_SCROLLING are always available).
  const primary = candidates
    .filter(c => c.available)
    .sort((a, b) => b.score - a.score)[0];

  // Alternatives = every OTHER action, best-scoring first, so the ordering
  // itself signals priority. Unavailable ones say exactly what blocks them.
  const alternatives: AlternativeAction[] = candidates
    .filter(c => c !== primary)
    .sort((a, b) => b.score - a.score)
    .map(c => ({
      action: c.action,
      target: c.target,
      duration: c.duration,
      available: c.available,
      reason: c.available
        ? availableAltReason(c, simulation)
        : `Unavailable: ${c.blockedReason}`,
    }));

  return {
    recommendation: {
      action: primary.action,
      target: primary.target,
      duration: primary.duration,
      available: true,
      reason: primaryReason(primary, simulation),
      alternatives,
    },
  };
}