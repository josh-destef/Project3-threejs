// hud.js — Timer, minimap (160px), win screen

import { COLS, ROWS, CELL } from './main.js';

export function initHUD() {
  const hud = document.getElementById('hud');

  // Timer
  const timerEl = document.createElement('div');
  timerEl.id = 'timer';
  timerEl.textContent = '00:00';
  hud.appendChild(timerEl);

  // Minimap
  const minimapEl = document.createElement('canvas');
  minimapEl.id = 'minimap';
  minimapEl.width = 160;
  minimapEl.height = 160;
  hud.appendChild(minimapEl);
  const ctx = minimapEl.getContext('2d');

  // Win screen
  const winEl = document.createElement('div');
  winEl.id = 'win-screen';
  winEl.className = 'overlay';
  winEl.innerHTML = `<h1>You escaped!</h1><p id="win-time">Time: 00:00</p><button onclick="location.reload()">Play again</button>`;
  hud.appendChild(winEl);

  // Timer logic
  let startTime = null, elapsed = 0, interval = null;
  const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  function startTimer() {
    startTime = Date.now();
    interval = setInterval(() => { elapsed = Math.floor((Date.now()-startTime)/1000); timerEl.textContent = fmt(elapsed); }, 500);
  }
  function stopTimer() {
    clearInterval(interval);
    elapsed = Math.floor((Date.now()-startTime)/1000);
    timerEl.textContent = fmt(elapsed);
  }

  // Minimap
  function updateMinimap(grid, ballPos) {
    const S = 160, cw = S/COLS, ch = S/ROWS;
    ctx.clearRect(0,0,S,S);
    for (let r=0;r<ROWS;r++) {
      for (let c=0;c<COLS;c++) {
        const cell = grid[r][c], x=c*cw, y=r*ch;
        ctx.fillStyle='#2a1f0f'; ctx.fillRect(x,y,cw,ch);
        ctx.strokeStyle='#c8a46e'; ctx.lineWidth=1;
        if (cell.walls.top)    { ctx.beginPath(); ctx.moveTo(x,y);    ctx.lineTo(x+cw,y);    ctx.stroke(); }
        if (cell.walls.left)   { ctx.beginPath(); ctx.moveTo(x,y);    ctx.lineTo(x,y+ch);    ctx.stroke(); }
        if (cell.walls.right)  { ctx.beginPath(); ctx.moveTo(x+cw,y); ctx.lineTo(x+cw,y+ch); ctx.stroke(); }
        if (cell.walls.bottom) { ctx.beginPath(); ctx.moveTo(x,y+ch); ctx.lineTo(x+cw,y+ch); ctx.stroke(); }
      }
    }
    // Exit
    ctx.fillStyle='#00cc44';
    ctx.beginPath(); ctx.arc((COLS-1)*cw+cw/2,(ROWS-1)*ch+ch/2,Math.min(cw,ch)*0.35,0,Math.PI*2); ctx.fill();
    // Ball
    if (ballPos) {
      ctx.fillStyle='#ffffff';
      ctx.beginPath(); ctx.arc(ballPos.x/CELL*cw, ballPos.z/CELL*ch, Math.min(cw,ch)*0.4, 0, Math.PI*2); ctx.fill();
    }
  }

  function showWin() {
    winEl.style.display = 'flex';
    document.getElementById('win-time').textContent = `Time: ${timerEl.textContent}`;
  }

  return { startTimer, stopTimer, updateMinimap, showWin };
}
