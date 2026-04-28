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

  // --- NEW: Timer Logic with Pause Support ---
  let elapsed = 0, interval = null, isPaused = false;
  const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  function startTimer() {
    elapsed = 0;
    timerEl.textContent = '00:00';
    interval = setInterval(() => { 
      if (!isPaused) {
        elapsed++; 
        timerEl.textContent = fmt(elapsed); 
      }
    }, 1000); // Updated to 1s intervals for accuracy
  }

  // Listener for the Freeze event from world.js
  window.addEventListener('freezeTime', (e) => {
    isPaused = true;
    timerEl.style.color = '#00ffff'; // Cyan glow
    timerEl.style.textShadow = '0 0 10px #00ffff';
    
    setTimeout(() => {
      isPaused = false;
      timerEl.style.color = '#ffffff';
      timerEl.style.textShadow = 'none';
    }, e.detail.duration);
  });

  function stopTimer() {
    clearInterval(interval);
  }

  // --- Updated Minimap to show Power-Ups ---
  function updateMinimap(grid, ballPos, cols, rows) {
    const S = 160, cw = S/cols, ch = S/rows;
    ctx.clearRect(0,0,S,S);
    for (let r=0;r<rows;r++) {
      for (let c=0;c<cols;c++) {
        const cell = grid[r][c], x=c*cw, y=r*ch;
        ctx.fillStyle='#2a1f0f'; ctx.fillRect(x,y,cw,ch);
        ctx.strokeStyle='#c8a46e'; ctx.lineWidth=1;
        
        if (cell.walls.top)    { ctx.beginPath(); ctx.moveTo(x,y);    ctx.lineTo(x+cw,y);    ctx.stroke(); }
        if (cell.walls.left)   { ctx.beginPath(); ctx.moveTo(x,y);    ctx.lineTo(x,y+ch);    ctx.stroke(); }
        if (cell.walls.right)  { ctx.beginPath(); ctx.moveTo(x+cw,y); ctx.lineTo(x+cw,y+ch); ctx.stroke(); }
        if (cell.walls.bottom) { ctx.beginPath(); ctx.moveTo(x,y+ch); ctx.lineTo(x+cw,y+ch); ctx.stroke(); }

        // NEW: Draw Power-Ups on minimap
        if (cell.powerUp) {
           const colors = { 'FREEZE': '#00ffff', 'SPEED': '#ffaa00', 'TELEPORT': '#ff00ff' };
           ctx.fillStyle = colors[cell.powerUp];
           ctx.beginPath(); 
           ctx.arc(x + cw/2, y + ch/2, Math.min(cw,ch)*0.2, 0, Math.PI*2); 
           ctx.fill();
        }
      }
    }
    // Exit
    ctx.fillStyle='#00cc44';
    ctx.beginPath(); ctx.arc((cols-1)*cw+cw/2,(rows-1)*ch+ch/2,Math.min(cw,ch)*0.35,0,Math.PI*2); ctx.fill();
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

  function hideMenu() {
    const menu = document.getElementById('menu');
    if (menu) menu.style.display = 'none';
  }

  return { startTimer, stopTimer, updateMinimap, showWin, hideMenu };
}