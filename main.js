// main.js — Constants, spherical-orbit camera, game loop
import * as THREE from 'three';
import { generateMaze } from './maze.js';
import { buildScene }   from './world.js';
import { createBall }   from './ball.js';
import { initControls } from './controls.js';
import { initHUD }      from './hud.js';

// ── Shared Config (Variables instead of hard exports) ─────────────────────────
export let COLS          = 14;
export let ROWS          = 14;
export const CELL          = 4;
export const WALL_HEIGHT   = 3;
export const PLAYER_SPEED  = 0.09;
export const PLAYER_RADIUS = 0.5;

let BOARD_CX, BOARD_CZ, EXIT_X, EXIT_Z;
let grid, scene, renderer, board, wallBoxes, exitMesh, ball;
let controls, orbitInput;
let won = false;
const clock = new THREE.Clock();

// ── Camera & HUD ──────────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 800);
let orbitTheta = Math.PI * 0.15;
let orbitPhi = 1.1;
let orbitRadius = 90;
let targetOrbitRadius = 90;

const MIN_PHI = THREE.MathUtils.degToRad(15);
const MAX_PHI = THREE.MathUtils.degToRad(75);

const { startTimer, stopTimer, updateMinimap, showWin, hideMenu } = initHUD();

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

    // board.rotation.x = THREE.MathUtils.lerp(board.rotation.x, 0, 0.05);
    // board.rotation.z = THREE.MathUtils.lerp(board.rotation.z, 0, 0.05);

    if (controls.up)    board.rotation.x = Math.max(board.rotation.x - 0.02, -0.3);
    if (controls.down)  board.rotation.x = Math.min(board.rotation.x + 0.02,  0.3);
    if (controls.left)  board.rotation.z = Math.min(board.rotation.z + 0.02,  0.3);
    if (controls.right) board.rotation.z = Math.max(board.rotation.z - 0.02, -0.3);

    const ballPos = ball.update(board, wallBoxes, delta);
    updateMinimap(grid, ballPos, COLS, ROWS);
    exitMesh.rotation.y += 0.02;

    const dx = ballPos.x - EXIT_X, dz = ballPos.z - EXIT_Z;
    if (Math.sqrt(dx*dx + dz*dz) < 1.5) {
      won = true; stopTimer(); showWin();
    }
  }
  renderer.render(scene, camera);
}

// ── Initialization ────────────────────────────────────────────────────────────
function initGame(config) {
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
  EXIT_X = (COLS - 1) * CELL + CELL / 2;
  EXIT_Z = (ROWS - 1) * CELL + CELL / 2;

  grid = generateMaze(COLS, ROWS, config.algorithm);
  const result = buildScene(grid);
  scene = result.scene;
  renderer = result.renderer;
  board = result.board;
  wallBoxes = result.wallBoxes;
  exitMesh = result.exitMesh;

  ball = createBall(scene);
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
    size: document.getElementById('size-select').value
  });
});

window.addEventListener('resize', () => {
  if (!renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
