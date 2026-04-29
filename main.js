// main.js — Constants, spherical-orbit camera, game loop
import * as THREE from 'three';
import { generateMaze } from './maze.js';
import { buildScene }   from './world.js';
import { createBall }   from './ball.js';
import { initControls } from './controls.js';
import { initHUD }      from './hud.js';
import { GestureControls } from './gestureControls.js';

// ── Shared Config (Variables instead of hard exports) ─────────────────────────
export let COLS          = 14;
export let ROWS          = 14;
export const CELL          = 4;
export const WALL_HEIGHT   = 3;
export const PLAYER_SPEED  = 0.09;
export const PLAYER_RADIUS = 0.5;

let BOARD_CX, BOARD_CZ, EXIT_X, EXIT_Z;
let grid, scene, renderer, board, wallBoxes, exitMesh, ball, checkPowerUpsFn, handIndicators;
let controls, orbitInput;
let won = false;
let currentControlMode = 'grab';
let MAX_HAND_SIZE = 0.25;
const clock = new THREE.Clock();

// store hazard positions so game loop can check them ───────────
let hazardPositions = [];
const HAZARD_RADIUS = 1.2;

// Track pinch duration for rotation activation
let handStates = {
  'Left': { pinchTime: 0, hoverTime: 0, isRotating: false, isHoverActive: false },
  'Right': { pinchTime: 0, hoverTime: 0, isRotating: false, isHoverActive: false }
};

// ── Camera & HUD ──────────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 800);
let orbitTheta = Math.PI * 0.15;
let orbitPhi = 0.1; // Almost perfectly top-down
let orbitRadius = 90;
let targetOrbitRadius = 90;
let cameraFocusX = 0;
let cameraFocusZ = 0;

const MIN_PHI = THREE.MathUtils.degToRad(5); // Allow much steeper top-down angle
const MAX_PHI = THREE.MathUtils.degToRad(75);

const { startTimer, stopTimer, updateMinimap, showWin, hideMenu, setWebcamStatus, drawHandOverlay } = initHUD();

const gesture = new GestureControls();
let gestureReady = false;

gesture.init().then(() => {
  gesture.start();
  gestureReady = true;
  if (setWebcamStatus) setWebcamStatus(true);
}).catch((err) => {
  console.warn('Webcam unavailable, using keyboard/touch controls.', err);
});

function applyKeyboardControls() {
  if (controls.up)    board.rotation.x = Math.max(board.rotation.x - 0.02, -0.3);
  if (controls.down)  board.rotation.x = Math.min(board.rotation.x + 0.02,  0.3);
  if (controls.left)  board.rotation.z = Math.min(board.rotation.z + 0.02,  0.3);
  if (controls.right) board.rotation.z = Math.max(board.rotation.z - 0.02, -0.3);
}

function updateCamera() {
  camera.position.x = cameraFocusX + orbitRadius * Math.sin(orbitPhi) * Math.sin(orbitTheta);
  camera.position.y = orbitRadius * Math.cos(orbitPhi);
  camera.position.z = cameraFocusZ + orbitRadius * Math.sin(orbitPhi) * Math.cos(orbitTheta);
  camera.lookAt(cameraFocusX, 0, cameraFocusZ);
}

// ── Game Loop ─────────────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  if (!renderer) return;
  const delta = Math.min(clock.getDelta(), 0.05);

  if (!won && ball) {
    if (orbitInput.deltaTheta !== 0 || orbitInput.deltaPhi !== 0 || orbitInput.deltaZoom !== 0) {
      orbitTheta += orbitInput.deltaTheta;
      orbitPhi = THREE.MathUtils.clamp(orbitPhi + orbitInput.deltaPhi, MIN_PHI, MAX_PHI);
      
      const minRadius = Math.max(30, (COLS * CELL) / 3);
      const maxRadius = Math.min(500, (COLS * CELL) * 5);
      targetOrbitRadius = THREE.MathUtils.clamp(targetOrbitRadius + orbitInput.deltaZoom, minRadius, maxRadius);
      
      orbitInput.deltaTheta = 0; 
      orbitInput.deltaPhi = 0;
      orbitInput.deltaZoom = 0;
    }

    orbitRadius = THREE.MathUtils.lerp(orbitRadius, targetOrbitRadius, 0.1);
    updateCamera();

    const hands = gestureReady ? gesture.getData() : [];
    
    // Process pinch timing for each hand
    if (hands) {
      hands.forEach(h => {
        const state = handStates[h.handedness];
        if (state) {
          if (h.pinch) {
            state.pinchTime += delta;
            state.hoverTime = 0;
            state.isHoverActive = false;
            if (state.pinchTime >= 1.0) {
              state.isRotating = true;
            }
          } else {
            state.pinchTime = 0;
            state.isRotating = false;
            state.hoverTime += delta;
            if (state.hoverTime >= 1.0) {
              state.isHoverActive = true;
            }
          }
          // Attach progress to the hand object for HUD rendering
          // Use the max of either pinch or hover progress for the ring
          h.pinchProgress = Math.max(
            Math.min(1.0, state.pinchTime / 1.0),
            Math.min(1.0, state.hoverTime / 1.0)
          );
          h.isRotating = state.isRotating;
          h.isHoverActive = state.isHoverActive;
        }
      });
    }
    
    if (drawHandOverlay) drawHandOverlay(hands, currentControlMode);

    if (hands && hands.length > 0) {
      let activePushHands = 0;
      let totalPushX = 0;
      let totalPushZ = 0;
      
      const pinchedHands = hands.filter(h => h.isRotating);

      if (currentControlMode === 'hover' && pinchedHands.length > 0) {
        // --- CAMERA CONTROL MODE ---
        if (pinchedHands.length === 1) {
          const h = pinchedHands[0];
          if (!window.lastOrbitPos) window.lastOrbitPos = { x: h.x, y: h.y };
          const dx = h.x - window.lastOrbitPos.x;
          const dy = h.y - window.lastOrbitPos.y;
          
          orbitTheta -= dx * 5.0; 
          orbitPhi = THREE.MathUtils.clamp(orbitPhi - dy * 5.0, MIN_PHI, MAX_PHI);
          
          window.lastOrbitPos = { x: h.x, y: h.y };
          window.lastZoomDist = null;
        } else if (pinchedHands.length === 2) {
          const h1 = pinchedHands[0];
          const h2 = pinchedHands[1];
          const dist = Math.sqrt(Math.pow(h1.x - h2.x, 2) + Math.pow(h1.y - h2.y, 2));
          
          if (!window.lastZoomDist) window.lastZoomDist = dist;
          const dDist = dist - window.lastZoomDist;
          
          const minRadius = Math.max(30, (COLS * CELL) / 3);
          const maxRadius = Math.min(500, (COLS * CELL) * 5);
          
          const newTarget = THREE.MathUtils.clamp(targetOrbitRadius - dDist * 300, minRadius, maxRadius);
          const actualDeltaRadius = targetOrbitRadius - newTarget; // positive if zooming IN
          
          targetOrbitRadius = newTarget;

          if (actualDeltaRadius !== 0) {
            const screenX = ((h1.x + h2.x) / 2) - 0.5;
            const screenY = ((h1.y + h2.y) / 2) - 0.5;
            const worldOffsetX = screenX * Math.cos(orbitTheta) + screenY * Math.sin(orbitTheta);
            const worldOffsetZ = -screenX * Math.sin(orbitTheta) + screenY * Math.cos(orbitTheta);
            
            const pinchWorldX = BOARD_CX + worldOffsetX * COLS * CELL;
            const pinchWorldZ = BOARD_CZ + worldOffsetZ * ROWS * CELL;
            
            const zoomFraction = Math.abs(actualDeltaRadius) / targetOrbitRadius;
            
            if (actualDeltaRadius > 0) {
              // Zooming IN: move focus towards pinch point
              cameraFocusX += (pinchWorldX - cameraFocusX) * Math.min(1.0, zoomFraction * 2.0);
              cameraFocusZ += (pinchWorldZ - cameraFocusZ) * Math.min(1.0, zoomFraction * 2.0);
            } else {
              // Zooming OUT: move focus back towards board center
              cameraFocusX += (BOARD_CX - cameraFocusX) * Math.min(1.0, zoomFraction * 2.5);
              cameraFocusZ += (BOARD_CZ - cameraFocusZ) * Math.min(1.0, zoomFraction * 2.5);
            }
          }
          
          window.lastZoomDist = dist;
          window.lastOrbitPos = null;
        }

        // Draw indicators in camera mode (Purple to show camera mode)
        for (let i = 0; i < handIndicators.length; i++) {
          if (hands[i]) {
            handIndicators[i].visible = true;
            const screenX = hands[i].x - 0.5;
            const screenY = hands[i].y - 0.5;
            
            const worldOffsetX = screenX * Math.cos(orbitTheta) + screenY * Math.sin(orbitTheta);
            const worldOffsetZ = -screenX * Math.sin(orbitTheta) + screenY * Math.cos(orbitTheta);

            const targetX = BOARD_CX + worldOffsetX * COLS * CELL;
            const targetZ = BOARD_CZ + worldOffsetZ * ROWS * CELL;
            handIndicators[i].position.x = THREE.MathUtils.lerp(handIndicators[i].position.x, targetX, 0.2);
            handIndicators[i].position.z = THREE.MathUtils.lerp(handIndicators[i].position.z, targetZ, 0.2);

            const color = hands[i].isRotating ? 0xff00ff : (hands[i].handedness === 'Right' ? 0x0099ff : 0x00ff99);
            handIndicators[i].children[0].material.color.setHex(color);
            handIndicators[i].children[1].material.color.setHex(color);
            
            // Scale the ring based on progress
            const ring = handIndicators[i].children[1];
            if (hands[i].pinch && !hands[i].isRotating) {
              const ringScale = 0.5 + (hands[i].pinchProgress * 0.5);
              ring.scale.set(ringScale, ringScale, 1);
              ring.material.opacity = 0.3 + (hands[i].pinchProgress * 0.5);
            } else {
              ring.scale.set(1, 1, 1);
              ring.material.opacity = hands[i].isRotating ? 0.9 : 0.5;
            }

            const scale = Math.max(0.5, Math.min(2.0, hands[i].size * 4)); 
            handIndicators[i].scale.set(scale, scale, scale);
          } else {
            handIndicators[i].visible = false;
          }
        }
      } else {
        // --- BOARD PUSH MODE ---
        window.lastOrbitPos = null;
        window.lastZoomDist = null;

        for (let i = 0; i < handIndicators.length; i++) {
          if (hands[i]) {
            handIndicators[i].visible = true;
            const screenX = hands[i].x - 0.5;
            const screenY = hands[i].y - 0.5;
            
            const worldOffsetX = screenX * Math.cos(orbitTheta) + screenY * Math.sin(orbitTheta);
            const worldOffsetZ = -screenX * Math.sin(orbitTheta) + screenY * Math.cos(orbitTheta);

            const targetX = BOARD_CX + worldOffsetX * COLS * CELL;
            const targetZ = BOARD_CZ + worldOffsetZ * ROWS * CELL;
            handIndicators[i].position.x = THREE.MathUtils.lerp(handIndicators[i].position.x, targetX, 0.2);
            handIndicators[i].position.z = THREE.MathUtils.lerp(handIndicators[i].position.z, targetZ, 0.2);

            const isActivating = (currentControlMode === 'hover' && hands[i].isHoverActive) || hands[i].isRotating;

            const isLeftPhysical = hands[i].handedness === 'Right';
            const inactiveColor = isLeftPhysical ? 0x0099ff : 0x00ff99;
            const activeColor   = isLeftPhysical ? 0x00ffff : 0xffff00;
            const color = isActivating ? activeColor : inactiveColor;
            
            handIndicators[i].children[0].material.color.setHex(color);
            handIndicators[i].children[1].material.color.setHex(color);
            
            // Scale the ring based on progress
            const ring = handIndicators[i].children[1];
            if ((hands[i].pinch || currentControlMode === 'hover') && !isActivating) {
              const ringScale = 0.5 + (hands[i].pinchProgress * 0.5);
              ring.scale.set(ringScale, ringScale, 1);
              ring.material.opacity = 0.3 + (hands[i].pinchProgress * 0.5);
            } else {
              ring.scale.set(1, 1, 1);
              ring.material.opacity = isActivating ? 0.9 : 0.5;
            }

            const scale = Math.max(0.5, Math.min(2.0, hands[i].size * 4)); 
            handIndicators[i].scale.set(scale, scale, scale);

            if (isActivating) {
              activePushHands++;
              const pushMultiplier = Math.max(0.5, Math.min(3.0, (hands[i].size / MAX_HAND_SIZE) * 1.5));
              totalPushX += worldOffsetZ * 2 * 0.3 * pushMultiplier;
              totalPushZ += -worldOffsetX * 2 * 0.3 * pushMultiplier;
            }
          } else {
            handIndicators[i].visible = false;
          }
        }

        if (activePushHands > 0) {
          board.rotation.x = THREE.MathUtils.lerp(board.rotation.x, totalPushX / activePushHands, 0.2);
          board.rotation.z = THREE.MathUtils.lerp(board.rotation.z, totalPushZ / activePushHands, 0.2);
        }
      }
    } else {
      applyKeyboardControls();
      if (handIndicators) handIndicators.forEach(h => h.visible = false);
    }

    const ballPos = ball.update(board, wallBoxes, delta);
    if (checkPowerUpsFn) checkPowerUpsFn(ball);
    updateMinimap(grid, ballPos, COLS, ROWS, EXIT_X, EXIT_Z, orbitTheta);
    exitMesh.rotation.y += 0.02;

    // check if ball landed on any hazard tile ─────────────────
    for (const h of hazardPositions) {
      const dx = ballPos.x - h.x;
      const dz = ballPos.z - h.z;
      if (Math.sqrt(dx * dx + dz * dz) < 1.0) {
        ball.reset();
        board.rotation.x = 0;
        board.rotation.z = 0;
        break;
      }
    }

    const dx = ballPos.x - EXIT_X, dz = ballPos.z - EXIT_Z;
    if (Math.sqrt(dx*dx + dz*dz) < 1.5) {
      won = true; stopTimer(); showWin();
    }
  }
  renderer.render(scene, camera);
}

// ── Initialization ────────────────────────────────────────────────────────────
function initGame(config) {
  currentControlMode = config.controlMode || 'grab';
  // Cleanup
  if (renderer) {
    renderer.dispose();
    const canvas = document.getElementById('canvas');
    const newCanvas = canvas.cloneNode(true);
    canvas.parentNode.replaceChild(newCanvas, canvas);
  }

  const isPractice = config.size === 'practice';
  
  if (isPractice) {
    COLS = 10;
    ROWS = 10;
  } else {
    COLS = parseInt(config.size);
    ROWS = parseInt(config.size);
  }
  BOARD_CX = COLS * CELL / 2;
  BOARD_CZ = ROWS * CELL / 2;
  if (config.goal === 'center') {
    EXIT_X = Math.floor(COLS / 2) * CELL + CELL / 2;
    EXIT_Z = Math.floor(ROWS / 2) * CELL + CELL / 2;
  } else {
    EXIT_X = (COLS - 1) * CELL + CELL / 2;
    EXIT_Z = (ROWS - 1) * CELL + CELL / 2;
  }

  grid = generateMaze(COLS, ROWS, config.algorithm);
  
  // Clear power-ups for practice mode
  if (isPractice) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        delete grid[r][c].powerUp;
      }
    }
  }

  const result = buildScene(grid, EXIT_X, EXIT_Z, config.mazeColor);
  scene = result.scene;
  renderer = result.renderer;
  board = result.board;
  wallBoxes = result.wallBoxes;
  exitMesh = result.exitMesh;
  hazardPositions = result.hazardPositions;
  checkPowerUpsFn = result.checkPowerUps;
  handIndicators = result.handIndicators;

  ball = createBall(scene, config.ballColor);
  const ctrlResult = initControls(scene, board, camera, BOARD_CX, BOARD_CZ);
  controls = ctrlResult.tilt;
  orbitInput = ctrlResult.orbit;

  // Reset camera to top-down default
  orbitPhi = 0.1;
  orbitTheta = Math.PI * 0.15;
  // Adjusting initial zoom to be a little closer
  const startRadius = COLS > 14 ? 260 : 130;
  orbitRadius = startRadius;
  targetOrbitRadius = startRadius;
  cameraFocusX = BOARD_CX;
  cameraFocusZ = BOARD_CZ;

  won = false;
  updateCamera();
  hideMenu();
  startTimer();
}

// ── UI Listeners ──────────────────────────────────────────────────────────────
document.getElementById('start-btn').addEventListener('click', () => {
  initGame({
    size: document.getElementById('size-select').value,
    goal: document.getElementById('goal-select').value,
    ballColor: document.getElementById('ball-color-select').value, 
    mazeColor: document.getElementById('maze-color-select').value,
    controlMode: document.getElementById('control-mode-select').value,
  });
});

let calibInterval;
document.getElementById('calibrate-btn').addEventListener('click', () => {
  document.getElementById('menu').style.display = 'none';
  document.getElementById('calibration-screen').style.display = 'flex';
  
  calibInterval = setInterval(() => {
    const hands = gestureReady ? gesture.getData() : [];
    if (hands && hands.length > 0) {
      document.getElementById('calib-size-display').textContent = hands[0].size.toFixed(3);
    } else {
      document.getElementById('calib-size-display').textContent = 'No hand detected';
    }
  }, 100);
});

document.getElementById('calib-confirm-btn').addEventListener('click', () => {
  const hands = gestureReady ? gesture.getData() : [];
  if (hands && hands.length > 0) {
    MAX_HAND_SIZE = hands[0].size;
    console.log("Calibrated MAX_HAND_SIZE:", MAX_HAND_SIZE);
  }
  clearInterval(calibInterval);
  document.getElementById('calibration-screen').style.display = 'none';
  document.getElementById('menu').style.display = 'flex';
});

let menuZoom = 1.0;
let menuRotX = 0;
let menuRotY = 0;
let lastMenuZoomDist = null;
let lastMenuOrbitPos = null;

let pbX = 30;
let pbY = 30;
let pbVX = 0;
let pbVY = 0;

// Dynamically inject 3D sides into the cards and menu items to make them solid prisms
document.querySelectorAll('.instructions-detailed .inst-item, .menu-content h1, #close-instructions-btn, .menu-options .option, #calibrate-btn, #start-btn, #how-to-play-btn').forEach(el => {
  el.style.transformStyle = 'preserve-3d';
  ['top', 'bottom', 'left', 'right'].forEach(side => {
    const face = document.createElement('div');
    face.className = `block-face face-${side}`;
    el.appendChild(face);
  });
});

document.getElementById('how-to-play-btn').addEventListener('click', () => {
  document.getElementById('menu').style.display = 'none';
  document.getElementById('instructions-screen').style.display = 'flex';
  menuZoom = 1.0;
  menuRotX = 0;
  menuRotY = 0;
  lastMenuZoomDist = null;
  lastMenuOrbitPos = null;
  pbX = 30;
  pbY = 30;
  pbVX = 0;
  pbVY = 0;
  if (setWebcamStatus) setWebcamStatus(true);
});

document.getElementById('close-instructions-btn').addEventListener('click', () => {
  document.getElementById('instructions-screen').style.display = 'none';
  document.getElementById('menu').style.display = 'flex';
  // Reset home menu state
  menuZoom = 1.0;
  menuRotX = 0;
  menuRotY = 0;
  lastMenuZoomDist = null;
  lastMenuOrbitPos = null;
  pbX = 30;
  pbY = 30;
  pbVX = 0;
  pbVY = 0;
});

// Generic loop to update 3D menu physics (used for Home and Instructions)
setInterval(() => {
  const instrScreen = document.getElementById('instructions-screen');
  const mainMenu = document.getElementById('menu');
  
  let activeOverlay = null;
  let ballId = 'practice-ball';
  
  if (instrScreen.style.display === 'flex') {
    activeOverlay = instrScreen;
    ballId = 'practice-ball';
  } else if (mainMenu.style.display === 'flex' || (mainMenu.style.display === '' && getComputedStyle(mainMenu).display === 'flex')) {
    activeOverlay = mainMenu;
    ballId = 'practice-ball-home';
  }
  
  if (!activeOverlay) return;
  if (setWebcamStatus) setWebcamStatus(true); // Keep webcam active in menus

  const hands = gestureReady ? gesture.getData() : [];
  drawHandOverlay(hands, 'hover');
  
  const menuContent = activeOverlay.querySelector('.menu-content');
  const isHome = activeOverlay.id === 'menu';
  const mLeft = document.getElementById(isHome ? 'marker-left-home' : 'marker-left');
  const mRight = document.getElementById(isHome ? 'marker-right-home' : 'marker-right');
  if (!menuContent || !mLeft || !mRight) return;

  mLeft.style.display = 'none';
  mRight.style.display = 'none';

  let totalPushX = 0;
  let totalPushY = 0;
  let activePushHands = 0;

  const pinchedHands = hands.filter(h => h && h.pinch);

  if (pinchedHands.length === 1) {
    // 1-Hand Pinch -> ROTATE (Orbit)
    const hand = pinchedHands[0];
    if (lastMenuOrbitPos) {
      const dx = hand.x - lastMenuOrbitPos.x;
      const dy = hand.y - lastMenuOrbitPos.y;
      menuRotY += dx * 100; // spin Y axis
      menuRotX -= dy * 100; // spin X axis
    }
    lastMenuOrbitPos = { x: hand.x, y: hand.y };
    lastMenuZoomDist = null;
  } else if (pinchedHands.length >= 2) {
    // 2-Hand Pinch -> ZOOM
    const h1 = pinchedHands[0];
    const h2 = pinchedHands[1];
    const dist = Math.sqrt(Math.pow(h1.x - h2.x, 2) + Math.pow(h1.y - h2.y, 2));
    
    if (lastMenuZoomDist !== null) {
      const dDist = dist - lastMenuZoomDist;
      menuZoom = Math.max(0.4, Math.min(2.5, menuZoom + dDist * 2));
    }
    lastMenuZoomDist = dist;
    lastMenuOrbitPos = null;
  } else {
    // Hover Push
    lastMenuOrbitPos = null;
    lastMenuZoomDist = null;
    for (let i = 0; i < hands.length; i++) {
      const h = hands[i];
      if (h) {
        activePushHands++;
        const mappedX = (h.x - 0.5) * 1.5;
        const mappedY = (h.y - 0.5) * 1.5;
        const effectiveMaxHandSize = MAX_HAND_SIZE * 0.7; // Make push 30% more sensitive
        const pushMultiplier = Math.max(0.5, Math.min(3.0, (h.size / effectiveMaxHandSize) * 1.5));
        totalPushX -= mappedY * 2 * pushMultiplier;
        totalPushY += mappedX * 2 * pushMultiplier;
      }
    }
  }

  for (let i = 0; i < hands.length; i++) {
    const h = hands[i];
    if (h) {
      const marker = h.handedness === 'Right' ? mLeft : mRight;
      marker.style.display = 'block';
      
      const mappedX = (h.x - 0.5) * 1.5 + 0.5;
      const mappedY = (h.y - 0.5) * 1.5 + 0.5;
      marker.style.left = `${mappedX * 100}%`;
      marker.style.top = `${mappedY * 100}%`;
      
      const isActivating = h.pinch;
      const inactiveColor = h.handedness === 'Right' ? '#0099ff' : '#00ff99';
      const color = isActivating ? '#ff00ff' : inactiveColor;
      marker.style.background = color;
      marker.style.boxShadow = `0 0 15px ${color}`;
      
      const scale = Math.max(0.5, Math.min(2.0, h.size * 4));
      marker.style.transform = `translate(-50%, -50%) translateZ(100px) scale(${scale})`;
    }
  }

  let rx = menuRotX + 5; // Default tilt
  let ry = menuRotY - 5; // Default tilt
  
  if (activePushHands > 0) {
    rx += (totalPushX / activePushHands) * 15;
    ry += (totalPushY / activePushHands) * 15;
  }
  
  menuContent.style.transform = `perspective(800px) scale(${menuZoom}) rotateX(${rx}deg) rotateY(${ry}deg)`;

  // --- 2D DOM Physics for Practice Ball ---
  const dt = 0.03;
  // menuRotX > 0 means the bottom tilts up, top tilts away.
  // Actually CSS rotateX(deg): positive means top goes backwards, bottom comes forwards. 
  // So the ball should roll towards the top (negative Y).
  // CSS rotateY(deg): positive means right side goes backwards, left side comes forward.
  // So ball rolls right (positive X).
  pbVX += ry * 4 * dt;
  pbVY -= rx * 4 * dt; // gravity depends on X tilt
  
  // Friction
  pbVX *= 0.92;
  pbVY *= 0.92;

  let nx = pbX + pbVX;
  let ny = pbY + pbVY;
  
  const r = 14; // slightly larger collision radius to prevent visual clipping
  const mw = menuContent.offsetWidth;
  const mh = menuContent.offsetHeight;

  // Screen Bounds
  if (nx < r) { nx = r; pbVX *= -0.5; }
  if (nx > mw - r) { nx = mw - r; pbVX *= -0.5; }
  if (ny < r) { ny = r; pbVY *= -0.5; }
  if (ny > mh - r) { ny = mh - r; pbVY *= -0.5; }

  // Obstacle Collision
  const obstacles = Array.from(menuContent.querySelectorAll('.inst-item, h1, #close-instructions-btn, .option, #how-to-play-btn, #calibrate-btn, #start-btn'));
  for (const obs of obstacles) {
    let ox = 0;
    let oy = 0;
    let current = obs;
    while (current && current !== menuContent) {
      ox += current.offsetLeft;
      oy += current.offsetTop;
      current = current.offsetParent;
    }
    
    const padding = 2; // Extra padding to keep ball out of the faces
    ox -= padding;
    oy -= padding;
    const ow = obs.offsetWidth + padding * 2;
    const oh = obs.offsetHeight + padding * 2;
    
    // Nearest point on AABB
    const nearestX = Math.max(ox, Math.min(nx, ox + ow));
    const nearestY = Math.max(oy, Math.min(ny, oy + oh));

    const dx = nx - nearestX;
    const dy = ny - nearestY;
    const dist2 = dx * dx + dy * dy;

    if (dist2 < r * r && dist2 > 0) {
      const dist = Math.sqrt(dist2);
      const overlap = r - dist;
      
      const normalX = dx / dist;
      const normalY = dy / dist;
      
      nx += normalX * overlap;
      ny += normalY * overlap;
      
      const dot = pbVX * normalX + pbVY * normalY;
      if (dot < 0) {
        pbVX -= 1.5 * dot * normalX;
        pbVY -= 1.5 * dot * normalY;
      }
    } else if (dist2 === 0) {
      // Direct intersection
      nx -= pbVX; ny -= pbVY;
      pbVX *= -0.5; pbVY *= -0.5;
    }
  }

  pbX = nx;
  pbY = ny;

  const pball = document.getElementById(ballId);
  if (pball) {
    pball.style.left = `${pbX}px`;
    pball.style.top = `${pbY}px`;
  }

}, 30);

window.addEventListener('resize', () => {
  if (!renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
