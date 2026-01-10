import { throwInputFormator, throwOutPutFormator } from '../../src/userService/helper';

describe('All Utils Files', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });
  afterAll(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  it('testing', () => {
    const currentCards = ["D-8-0","D-9-0","D-10-1","H-1-0","H-2-0","S-6-1","H-4-0","D-2-0","C-2-1","S-2-0","S-3-1","C-4-0","D-5-0","C-4-1"]
    const wildCard="D-6-1"
    const opendDeck=['C-2-1']
    const rejCards=[]
    const picCards=[]
    const yo = throwInputFormator(currentCards, wildCard, opendDeck, rejCards, picCards);
    console.log(yo, "---")

    const res = throwOutPutFormator(
      { card_to_throw: 43, arrangement:[[[46,47,48],"pure sequence"],[[13,14,5,16],"unused"],[[40,27,1],"unused"], [[2],"unused cards"], [[29,29],"unused cards"]] },
      yo.hand
    );
    console.log(res, "---")
  });
});
