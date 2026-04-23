// maze.js — recursive backtracker maze generation

export function generateMaze(cols, rows) {
  // Build grid of cells, all walls solid, none visited
  const grid = [];
  for (let r = 0; r < rows; r++) {
    grid[r] = [];
    for (let c = 0; c < cols; c++) {
      grid[r][c] = {
        visited: false,
        walls: { top: true, right: true, bottom: true, left: true },
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

  // Neighbour direction helpers
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
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !grid[nr][nc].visited) {
        // Remove the wall between current cell and neighbour
        grid[r][c].walls[wall] = false;
        grid[nr][nc].walls[opposite] = false;
        carve(nr, nc);
      }
    }
  }

  carve(0, 0);
  return grid;
}
