const createStartEndSchema = (pure, seq, set, dwd) => ({
  pure,
  seq,
  set,
  dwd,
});

const generateSampleTurn = (
  turnNo,
  userId,
  cardPicked,
  cardPickSource,
  cardDiscarded,
  points,
  wildCard = 'H-5-1'
) => ({
  turnNo,
  userId,
  turnStatus: 'COMPLETED',
  startState: 'S-2-1,S-3-1,S-4-1,H-10-1,H-11-1,H-12-1,D-2-1,D-2-2,D-3-1,C-5-1,C-6-1,C-7-1,S-5-1',
  sortedStartState: createStartEndSchema(
    [['S-2-1', 'S-3-1', 'S-4-1']],
    [['H-10-1', 'H-11-1', 'H-12-1']],
    [['D-2-1', 'D-2-2']],
    [['D-3-1', 'C-5-1', 'C-6-1', 'C-7-1', 'S-5-1']]
  ),
  cardPicked,
  cardPickSource,
  cardDiscarded,
  endState: 'S-2-1,S-3-1,S-4-1,H-10-1,H-11-1,H-12-1,D-2-1,D-2-2,D-3-1,C-5-1,C-6-1,C-7-1,S-5-1', // Simplified
  sortedEndState: createStartEndSchema(
    [['S-2-1', 'S-3-1', 'S-4-1']],
    [['H-10-1', 'H-11-1', 'H-12-1']],
    [['D-2-1', 'D-2-2']],
    [['D-3-1', 'C-5-1', 'C-6-1', 'C-7-1', 'S-5-1']]
  ),
  points,
  createdOn: new Date().toISOString(),
  isBot: false,
  wildCard,
  closedDeck: ['S-6-1', 'S-7-1', 'S-8-1'],
  openedDeckTop: cardDiscarded,
});

const generateSampleRound = (roundNo, roundId, winnerId) => {
  const turns = [];
  const players = [101, 102, 103];
  
  for (let turnIndex = 1; turnIndex <= 6; turnIndex++) {
    const userId = players[(turnIndex - 1) % players.length];
    turns.push(generateSampleTurn(
      turnIndex,
      userId,
      'S-10-1',
      'CLOSED',
      'D-10-1',
      80 - turnIndex * 5
    ));
  }

  return {
    roundNo,
    roundId,
    winnerId,
    createdOn: new Date().toISOString(),
    modifiedOn: new Date().toISOString(),
    extra_info: 'H-5-1', // Trump/Wild card
    turnsDetails: turns,
    userFinalStateTurnDetails: [] // Optional
  };
};

const sampleGameHistory = {
  _id: 'game_12345',
  cd: new Date().toISOString(),
  tbid: 'table_67890',
  rummyType: 'POINTS_RUMMY',
  lobbyId: 10,
  startingUsersCount: 3,
  gameDetails: [
    generateSampleRound(1, 'round_1', 101),
    generateSampleRound(2, 'round_2', 102),
  ]
};

console.log(JSON.stringify(sampleGameHistory, null, 2));
