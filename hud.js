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
  function updateMinimap(grid, ballPos, cols, rows, exitX, exitZ, orbitTheta = 0) {
    const S = 160, cw = S/cols, ch = S/rows;
    ctx.clearRect(0,0,S,S);
    
    ctx.save();
    ctx.translate(S/2, S/2);
    ctx.rotate(orbitTheta);
    ctx.scale(0.75, 0.75); // Prevent corners from clipping when rotated
    ctx.translate(-S/2, -S/2);

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
    ctx.beginPath(); 
    ctx.arc((exitX/CELL)*cw, (exitZ/CELL)*ch, Math.min(cw,ch)*0.35, 0, Math.PI*2); 
    ctx.fill();
    // Ball
    if (ballPos) {
      ctx.fillStyle='#ffffff';
      ctx.beginPath(); ctx.arc(ballPos.x/CELL*cw, ballPos.z/CELL*ch, Math.min(cw,ch)*0.4, 0, Math.PI*2); ctx.fill();
    }
    
    ctx.restore();
  }

  function showWin() {
    winEl.style.display = 'flex';
    document.getElementById('win-time').textContent = `Time: ${timerEl.textContent}`;
  }

  function hideMenu() {
    const menu = document.getElementById('menu');
    if (menu) menu.style.display = 'none';
  }

  function setWebcamStatus(active) {
    document.getElementById('webcam-preview')?.classList.toggle('active', active);
    document.getElementById('webcam-canvas')?.classList.toggle('active', active);
    const badge = document.getElementById('webcam-badge');
    if (badge) badge.textContent = active ? '📷 Webcam Active' : '';
  }

  function drawHandOverlay(hands, currentControlMode = 'grab') {
    const canvas = document.getElementById('webcam-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Ensure canvas dimensions match css
    if (canvas.width !== 320) canvas.width = 320;
    if (canvas.height !== 180) canvas.height = 180;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!hands || hands.length === 0) return;

    for (let i = 0; i < hands.length; i++) {
      const h = hands[i];
      if (!h || !h.landmarks) continue;

      const isActivating = currentControlMode === 'hover' ? true : h.pinch;
      const isLeftPhysical = h.handedness === 'Right';
      const inactiveColor = isLeftPhysical ? '#0099ff' : '#00ff99';
      const activeColor   = isLeftPhysical ? '#00ffff' : '#ffff00';
      const color = isActivating ? activeColor : inactiveColor;

      ctx.fillStyle = color;
      
      // Draw all landmarks
      for (const lm of h.landmarks) {
        ctx.beginPath();
        ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 2, 0, 2 * Math.PI);
        ctx.fill();
      }

      // Draw hand size text for debugging (un-mirror it so it's readable)
      ctx.save();
      ctx.scale(-1, 1);
      ctx.font = "14px monospace";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(`Hand ${i} Size: ${h.size.toFixed(3)}`, -canvas.width + 10, 20 + (i * 20));
      ctx.restore();

      // Connect thumb (4) and index finger (8)
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(h.landmarks[4].x * canvas.width, h.landmarks[4].y * canvas.height);
      ctx.lineTo(h.landmarks[8].x * canvas.width, h.landmarks[8].y * canvas.height);
      ctx.stroke();
    }
  }

  return { startTimer, stopTimer, updateMinimap, showWin, hideMenu, setWebcamStatus, drawHandOverlay };
}