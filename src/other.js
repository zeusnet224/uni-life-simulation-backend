function societyList(studentId) {
    return {
      societies: [
        { societyId: CSESOC, name: 'Computer Science Society', description: 'A faculty society' },
        { societyId: I4C, name: 'Investing 4 Charity Society', description: 'A philanthropic society' },
      ],
    };
  }

  function societyJoin(studentId, societyId) {
    return {
      societyId: CSESOC,
      name: 'Computer Science Society',
      social: 10,
    };
  }

  function societyAttend(studentId, societyId) {
    return {
      happiness: 70,
      energy: 50,
      social: 10
    };
  }