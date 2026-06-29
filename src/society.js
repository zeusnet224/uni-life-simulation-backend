  import { getData } from './dataStore.js';
  import { checkWinLoseConditions, clampStat } from './action.js';

  // Stat effects per hour for attending a society event
  // Attending increases happiness but costs energy
  const societyAction = {
    ATTENDING: { happinessPerHour: 10, energyPerHour: -5 }
  };

  // Returns a list of all societies available to join in this simulation.
  // Only shows societies the student has NOT already joined.
  // Returns { societies: [{ societyId, name, description }] }
  // Errors: INVALID_STUDENT_ID, INVALID_SIMULATION
  function societyList(studentId, simulationId) {
    const data = getData();

    const student = data.users.find(student => student.studentId === studentId);
    if (!student) {
      return { error: 'INVALID_STUDENT_ID', message: 'Student ID does not exist' };
    }

    const simulation = data.simulations.find(sim => sim.simulationId === simulationId);
    if (!simulation) {
      return { error: 'INVALID_SIMULATION', message: 'Simulation ID does not exist' };
    }

    const availableSocieties = simulation.universeData.societies
      .filter(society => !simulation.joinedSocieties.includes(society.societyId))
      .map(society => ({
        societyId: society.societyId,
        name: society.name,
        description: society.description
      }));

    return { societies: availableSocieties };
  }

  // Joins a society in the simulation — student can only join each society once.
  // Returns { societyId, name } on success.
  // Errors: INVALID_STUDENT_ID, INVALID_SIMULATION, INVALID_SOCIETY
  function societyJoin(studentId, simulationId, societyId) {
    const data = getData();

    const student = data.users.find(student => student.studentId === studentId);
    if (!student) {
      return { error: 'INVALID_STUDENT_ID', message: 'Student ID does not exist' };
    }

    const simulation = data.simulations.find(sim => sim.simulationId === simulationId);
    if (!simulation) {
      return { error: 'INVALID_SIMULATION', message: 'Simulation ID does not exist' };
    }

    const society = simulation.universeData.societies.find(soc => soc.societyId === societyId);
    if (!society) {
      return { error: 'INVALID_SOCIETY', message: 'Society ID does not exist' };
    }

    if (simulation.joinedSocieties.includes(societyId)) {
      return { error: 'INVALID_SOCIETY', message: 'Student has already joined this society' };
    }

    simulation.joinedSocieties.push(societyId);

    return {
      societyId: society.societyId,
      name: society.name,
    };
  }

  // Attends a society event for a given duration (1-4 hours).
  // Attending costs energy (-5/hr) and increases happiness (+10/hr).
  // Advances timeElapsed and sets currentActivity to ATTENDING_SOCIETY.
  // Checks win/lose conditions immediately after attending.
  // Returns { happiness, energy } on success.
  // Errors: INVALID_STUDENT_ID, INVALID_SIMULATION, INVALID_SOCIETY, INVALID_DURATION
  function societyAttend(studentId, simulationId, societyId, duration) {
    const data = getData();

    const student = data.users.find(student => student.studentId === studentId);
    if (!student) {
      return { error: 'INVALID_STUDENT_ID', message: 'Student ID does not exist' };
    }

    const simulation = data.simulations.find(sim => sim.simulationId === simulationId);
    if (!simulation) {
      return { error: 'INVALID_SIMULATION', message: 'Simulation ID does not exist' };
    }

    const society = simulation.universeData.societies.find(soc => soc.societyId === societyId);
    if (!society) {
      return { error: 'INVALID_SOCIETY', message: 'Society ID does not exist' };
    }

    if (!simulation.joinedSocieties.includes(societyId)) {
      return { error: 'INVALID_SOCIETY', message: 'Student has not joined this society' };
    }

    if (duration <= 0 || duration > 4) {
      return { error: 'INVALID_DURATION', message: 'Student cannot attend for this specified duration' };
    }

    const effects = societyAction.ATTENDING;
    simulation.happiness = clampStat(simulation.happiness + effects.happinessPerHour * duration);
    simulation.energy = clampStat(simulation.energy + effects.energyPerHour * duration);
    simulation.timeElapsed += duration;
    simulation.currentActivity = 'ATTENDING_SOCIETY';

    checkWinLoseConditions(simulation);

    return {
      happiness: simulation.happiness,
      energy: simulation.energy,
    };
  }

  export { societyList, societyJoin, societyAttend };