  import { getData } from './dataStore.js';
  import { checkWinLoseConditions, clampStat } from './action.js';

  const societyAction = {
    ATTENDING: { happinessPerHour: 10, energyPerHour: -5 }
  };

  // Allows the user to retrieve a list of societies that they haven't joined yet
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

    // Creates an array of societies that the student hasn't joined yet
    const availableSocieties = simulation.universeData.societies
      .filter(society => !simulation.joinedSocieties.includes(society.societyId))
      .map(society => ({
        societyId: society.societyId,
        name: society.name,
        description: society.description
      }));

    return { societies: availableSocieties };
  }

  // Allows the user to join a society that they haven't joined yet
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

  // Allows the user to attend a society event, which updates their happiness and energy
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

    // updates happiness and energy
    const effects = societyAction.ATTENDING;
    simulation.happiness = clampStat(simulation.happiness + effects.happinessPerHour * duration);
    simulation.energy = clampStat(simulation.energy + effects.energyPerHour * duration);
    simulation.timeElapsed += duration;
    simulation.currentActivity = 'ATTENDING_SOCIETY';

    // check if the happiness and energy changes have caused DROPPED_OUT status
    checkWinLoseConditions(simulation);

    return {
      happiness: simulation.happiness,
      energy: simulation.energy,
    };
  }

  export { societyList, societyJoin, societyAttend };