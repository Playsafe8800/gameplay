function getRandomCardSequence(cards) {
    // Parse and group cards by suit with counts
    const suits = {};
    cards.forEach(card => {
      const [suit, num] = card.split('-');
      const number = parseInt(num);
      if (!suits[suit]) suits[suit] = new Map();
      suits[suit].set(number, (suits[suit].get(number) || 0) + 1);
    });
  
    // Find all sequences
    const allSequences = [];
    Object.keys(suits).forEach(suit => {
      if (suit === 'J') return; // Skip Jokers
      const numberMap = suits[suit];
      const numbers = [...numberMap.keys()].sort((a, b) => a - b); // Sorted unique numbers
  
      for (let i = 0; i <= numbers.length - 3; i++) {
        let sequence = [];
        let valid = true;
        let length = 0;
  
        // Check sequences of length 3 or 4
        for (let len = 0; len < 4 && i + len < numbers.length; len++) {
          const currentNum = numbers[i + len];
          const prevNum = len === 0 ? currentNum - 1 : numbers[i + len - 1];
  
          // Check if numbers are consecutive and available
          if (currentNum !== prevNum + 1 || !numberMap.get(currentNum)) {
            valid = false;
            break;
          }
          sequence.push(currentNum);
          length++;
  
          // Add sequence if length is 3 or 4
          if (length >= 3) {
            const cardSeq = sequence.map(num => {
              const deckNum = numberMap.get(num) > 1 && Math.random() < 0.5 ? 1 : 0;
              return `${suit}-${num}-${deckNum}`;
            });
            allSequences.push(cardSeq);
          }
        }
      }
    });
  
    return allSequences.length > 0 
      ? allSequences[Math.floor(Math.random() * allSequences.length)]
      : null;
  }
  
  // Example usage
  const cards = [
    'C-1-0', 'C-2-0', 'C-3-0', 'C-4-0', 'C-5-0', 'C-6-0', 'C-7-0', 'C-8-0', 'C-9-0', 'C-10-0', 'C-11-0', 'C-12-0', 'C-13-0',
    'D-1-0', 'D-2-0', 'D-3-0', 'D-4-0', 'D-5-0', 'D-6-0', 'D-7-0', 'D-8-0', 'D-9-0', 'D-10-0', 'D-11-0', 'D-12-0', 'D-13-0',
    'H-1-0', 'H-2-0', 'H-3-0', 'H-4-0', 'H-5-0', 'H-6-0', 'H-7-0', 'H-8-0', 'H-9-0', 'H-10-0', 'H-11-0', 'H-12-0', 'H-13-0',
    'S-1-0', 'S-2-0', 'S-3-0', 'S-4-0', 'S-5-0', 'S-6-0', 'S-7-0', 'S-8-0', 'S-9-0', 'S-10-0', 'S-11-0', 'S-12-0', 'S-13-0',
    'J-1-0'
  ];
  
  const randomSequence = getRandomCardSequence(cards);
  console.log(randomSequence ? `Random Sequence: [${randomSequence.join(', ')}]` : 'No sequences found.');