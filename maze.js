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
  return grid;
}
