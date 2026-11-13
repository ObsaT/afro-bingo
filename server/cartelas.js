// Deterministic Cartela generator for 100 Cartelas
// Standard 75-ball bingo:
// B: 1-15 (5 numbers)
// I: 16-30 (5 numbers)
// N: 31-45 (4 numbers + FREE/star in middle)
// G: 46-60 (5 numbers)
// O: 61-75 (5 numbers)

function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function getRandomSubarray(arr, size, rng) {
  const shuffled = arr.slice(0);
  let i = arr.length;
  let temp, index;
  while (i--) {
    index = Math.floor(rng() * (i + 1));
    temp = shuffled[index];
    shuffled[index] = shuffled[i];
    shuffled[i] = temp;
  }
  return shuffled.slice(0, size);
}

function generateCartela(cartelaId) {
  const rng = seededRandom(cartelaId * 7919 + 104729);

  const range = (start, end) => Array.from({ length: end - start + 1 }, (_, i) => start + i);

  const colB = getRandomSubarray(range(1, 15), 5, rng).sort((a, b) => a - b);
  const colI = getRandomSubarray(range(16, 30), 5, rng).sort((a, b) => a - b);
  const colN = getRandomSubarray(range(31, 45), 4, rng).sort((a, b) => a - b);
  const colG = getRandomSubarray(range(46, 60), 5, rng).sort((a, b) => a - b);
  const colO = getRandomSubarray(range(61, 75), 5, rng).sort((a, b) => a - b);

  // Construct 5x5 grid (row-major: 5 rows x 5 cols)
  // row 0: B0, I0, N0, G0, O0
  // row 1: B1, I1, N1, G1, O1
  // row 2: B2, I2, FREE, G2, O2
  // row 3: B3, I3, N2, G3, O3
  // row 4: B4, I4, N3, G4, O4
  const grid = [
    [colB[0], colI[0], colN[0], colG[0], colO[0]],
    [colB[1], colI[1], colN[1], colG[1], colO[1]],
    [colB[2], colI[2], 0, colG[2], colO[2]], // 0 represents FREE / STAR
    [colB[3], colI[3], colN[2], colG[3], colO[3]],
    [colB[4], colI[4], colN[3], colG[4], colO[4]],
  ];

  return {
    id: cartelaId,
    grid,
    columns: {
      B: colB,
      I: colI,
      N: [colN[0], colN[1], 0, colN[2], colN[3]],
      G: colG,
      O: colO,
    },
  };
}

// Pre-generate up to 300 Cartelas
const CARTELAS = {};
for (let i = 1; i <= 300; i++) {
  CARTELAS[i] = generateCartela(i);
}

function getCartela(id) {
  if (!CARTELAS[id]) {
    CARTELAS[id] = generateCartela(id);
  }
  return CARTELAS[id];
}

// Function to check if a cartela has a winning pattern
// Patterns supported:
// 1. Any horizontal row (5)
// 2. Any vertical column (5)
// 3. Main diagonal or anti-diagonal (2)
// 4. Four corners (1)
function checkBingo(cartela, calledSet) {
  const isMarked = (num) => num === 0 || calledSet.has(num);
  const grid = cartela.grid;

  // Check 5 horizontal rows
  for (let r = 0; r < 5; r++) {
    if (grid[r].every((val) => isMarked(val))) {
      return {
        won: true,
        pattern: `Row ${r + 1}`,
        winningCells: grid[r].map((val, c) => ({ row: r, col: c, value: val })),
      };
    }
  }

  // Check 5 vertical columns
  for (let c = 0; c < 5; c++) {
    let colFull = true;
    const cells = [];
    for (let r = 0; r < 5; r++) {
      if (!isMarked(grid[r][c])) {
        colFull = false;
        break;
      }
      cells.push({ row: r, col: c, value: grid[r][c] });
    }
    if (colFull) {
      const letters = ['B', 'I', 'N', 'G', 'O'];
      return {
        won: true,
        pattern: `Column ${letters[c]}`,
        winningCells: cells,
      };
    }
  }

  // Check Main diagonal (\)
  let diag1 = true;
  const diag1Cells = [];
  for (let i = 0; i < 5; i++) {
    if (!isMarked(grid[i][i])) {
      diag1 = false;
      break;
    }
    diag1Cells.push({ row: i, col: i, value: grid[i][i] });
  }
  if (diag1) {
    return {
      won: true,
      pattern: 'Diagonal (Top-Left to Bottom-Right)',
      winningCells: diag1Cells,
    };
  }

  // Check Anti-diagonal (/)
  let diag2 = true;
  const diag2Cells = [];
  for (let i = 0; i < 5; i++) {
    if (!isMarked(grid[i][4 - i])) {
      diag2 = false;
      break;
    }
    diag2Cells.push({ row: i, col: 4 - i, value: grid[i][4 - i] });
  }
  if (diag2) {
    return {
      won: true,
      pattern: 'Diagonal (Top-Right to Bottom-Left)',
      winningCells: diag2Cells,
    };
  }

  // Check Four Corners
  const corners = [
    { row: 0, col: 0, value: grid[0][0] },
    { row: 0, col: 4, value: grid[0][4] },
    { row: 4, col: 0, value: grid[4][0] },
    { row: 4, col: 4, value: grid[4][4] },
  ];
  if (corners.every((c) => isMarked(c.value))) {
    return {
      won: true,
      pattern: 'Four Corners',
      winningCells: corners,
    };
  }

  return { won: false, pattern: null, winningCells: [] };
}

function getBallLetter(num) {
  if (num <= 15) return 'B';
  if (num <= 30) return 'I';
  if (num <= 45) return 'N';
  if (num <= 60) return 'G';
  return 'O';
}

module.exports = {
  CARTELAS,
  generateCartela,
  getCartela,
  checkBingo,
  getBallLetter,
};
