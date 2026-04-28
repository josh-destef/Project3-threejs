// maze.js — Recursive Backtracker maze generation

export function generateMaze(cols, rows) {
  // Build grid of cells, all walls solid, none visited
  const grid = [];
  for (let r = 0; r < rows; r++) {
    grid[r] = [];
    for (let c = 0; c < cols; c++) {
      grid[r][c] = {
        r, c,
        visited: false,
        walls: { top: true, right: true, bottom: true, left: true },
        powerUp: null, // New: track if a cell has an item
      };
    }
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  const DIRS = [
    { dr: -1, dc: 0, wall: 'top',    opposite: 'bottom' },
    { dr:  0, dc: 1, wall: 'right',  opposite: 'left'   },
    { dr:  1, dc: 0, wall: 'bottom', opposite: 'top'    },
    { dr:  0, dc:-1, wall: 'left',   opposite: 'right'  },
  ];

  function carve(r, c) {
    grid[r][c].visited = true;
    const dirs = shuffle([...DIRS]);
    for (const { dr, dc, wall, opposite } of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !grid[nr][nc].visited) {
        grid[r][c].walls[wall] = false;
        grid[nr][nc].walls[opposite] = false;
        carve(nr, nc);
      }
    }
  }

  carve(0, 0);

  // --- NEW: Power-Up Distribution ---
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Avoid spawning at the start (0,0) or the very end
      if (r === 0 && c === 0) continue;

      const rand = Math.random();
      
      // Approximately 10% of cells will contain a power-up
      if (rand < 0.10) {
        const typeRand = Math.random();
        
        if (typeRand < 0.05) {
          grid[r][c].powerUp = 'TELEPORT'; // 5% of 10% (Rarest)
        } else if (typeRand < 0.50) {
          grid[r][c].powerUp = 'SPEED';    // 45% of 10%
        } else {
          grid[r][c].powerUp = 'FREEZE';   // 50% of 10%
        }
      }
    }
  }

  return grid;
}