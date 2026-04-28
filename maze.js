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

  function carve(startR, startC) {
    const stack = [grid[startR][startC]];
    grid[startR][startC].visited = true;

    while (stack.length > 0) {
      // Growing Tree: 75% pick newest (backtracker), 25% pick random (Prim-like)
      let index = stack.length - 1;
      if (Math.random() < 0.25) {
        index = Math.floor(Math.random() * stack.length);
      }
      const cell = stack[index];
      const { r, c } = cell;

      const unvisitedDirs = DIRS.filter(d => {
        const nr = r + d.dr, nc = c + d.dc;
        return nr >= 0 && nr < rows && nc >= 0 && nc < cols && !grid[nr][nc].visited;
      });

      if (unvisitedDirs.length > 0) {
        const { dr, dc, wall, opposite } = unvisitedDirs[Math.floor(Math.random() * unvisitedDirs.length)];
        const nr = r + dr, nc = c + dc;
        
        grid[r][c].walls[wall] = false;
        grid[nr][nc].walls[opposite] = false;
        grid[nr][nc].visited = true;
        stack.push(grid[nr][nc]);
      } else {
        stack.splice(index, 1);
      }
    }
  }

  carve(0, 0);

  return grid;
}
