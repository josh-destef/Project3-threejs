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

// ── Camera & HUD ──────────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 800);
let orbitTheta = Math.PI * 0.15;
let orbitPhi = 1.1;
let orbitRadius = 90;
let targetOrbitRadius = 90;

const MIN_PHI = THREE.MathUtils.degToRad(15);
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
  camera.position.x = BOARD_CX + orbitRadius * Math.sin(orbitPhi) * Math.sin(orbitTheta);
  camera.position.y = orbitRadius * Math.cos(orbitPhi);
  camera.position.z = BOARD_CZ + orbitRadius * Math.sin(orbitPhi) * Math.cos(orbitTheta);
  camera.lookAt(BOARD_CX, 0, BOARD_CZ);
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
    
    if (drawHandOverlay) drawHandOverlay(hands, currentControlMode);

    if (hands && hands.length > 0) {
      let activeHands = 0;
      let totalPushX = 0;
      let totalPushZ = 0;

      for (let i = 0; i < handIndicators.length; i++) {
        if (hands[i]) {
          handIndicators[i].visible = true;
          const targetX = hands[i].x * COLS * CELL;
          const targetZ = hands[i].y * ROWS * CELL;
          handIndicators[i].position.x = THREE.MathUtils.lerp(handIndicators[i].position.x, targetX, 0.2);
          handIndicators[i].position.z = THREE.MathUtils.lerp(handIndicators[i].position.z, targetZ, 0.2);

          const isActivating = currentControlMode === 'hover' ? true : hands[i].pinch;

          // Colors: Left physical hand (Right in mediapipe) = Blue, Right physical hand = Green
          const isLeftPhysical = hands[i].handedness === 'Right';
          const inactiveColor = isLeftPhysical ? 0x0099ff : 0x00ff99;
          const activeColor   = isLeftPhysical ? 0x00ffff : 0xffff00;
          const color = isActivating ? activeColor : inactiveColor;
          
          handIndicators[i].children[0].material.color.setHex(color);
          handIndicators[i].children[1].material.color.setHex(color);
          
          // Scale indicator based on physical hand proximity to camera
          const scale = Math.max(0.5, Math.min(2.0, hands[i].size * 4)); 
          handIndicators[i].scale.set(scale, scale, scale);

          if (isActivating) {
            activeHands++;
            const pushMultiplier = Math.max(0.5, Math.min(3.0, (hands[i].size / MAX_HAND_SIZE) * 1.5));
            totalPushX += (hands[i].y - 0.5) * 2 * 0.3 * pushMultiplier;
            totalPushZ += -(hands[i].x - 0.5) * 2 * 0.3 * pushMultiplier;
          }
        } else {
          handIndicators[i].visible = false;
        }
      }

      if (activeHands > 0) {
        board.rotation.x = THREE.MathUtils.lerp(board.rotation.x, totalPushX / activeHands, 0.2);
        board.rotation.z = THREE.MathUtils.lerp(board.rotation.z, totalPushZ / activeHands, 0.2);
      }
    } else {
      applyKeyboardControls();
      if (handIndicators) handIndicators.forEach(h => h.visible = false);
    }

    const ballPos = ball.update(board, wallBoxes, delta);
    if (checkPowerUpsFn) checkPowerUpsFn(ball);
    updateMinimap(grid, ballPos, COLS, ROWS, EXIT_X, EXIT_Z);
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

  COLS = parseInt(config.size);
  ROWS = parseInt(config.size);
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

  // Set initial zoom based on maze size
  const startRadius = COLS > 14 ? 160 : 90;
  orbitRadius = startRadius;
  targetOrbitRadius = startRadius;

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

window.addEventListener('resize', () => {
  if (!renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
