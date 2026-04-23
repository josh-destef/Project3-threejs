// main.js — Constants, spherical-orbit camera, game loop

import * as THREE from 'three';
import { generateMaze } from './maze.js';
import { buildScene }   from './world.js';
import { createBall }   from './ball.js';
import { initControls } from './controls.js';
import { initHUD }      from './hud.js';

// ── Constants ─────────────────────────────────────────────────────────────────
export const COLS          = 14;
export const ROWS          = 14;
export const CELL          = 4;
export const WALL_HEIGHT   = 3;
export const PLAYER_SPEED  = 0.09;
export const PLAYER_RADIUS = 0.5;

const BOARD_CX = COLS * CELL / 2;  // 28
const BOARD_CZ = ROWS * CELL / 2;  // 28

const EXIT_X = (COLS - 1) * CELL + CELL / 2;
const EXIT_Z = (ROWS - 1) * CELL + CELL / 2;

// ── Scene & ball (controls needs scene + board, so build first) ───────────────
const grid = generateMaze(COLS, ROWS);
const { scene, renderer, board, wallBoxes, exitMesh } = buildScene(grid);
const ball = createBall(scene);

// ── Camera — spherical orbit ──────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 500);
let orbitTheta  = Math.PI * 0.15;
let orbitPhi    = 1.1;
let orbitRadius = 90;

const MIN_PHI = THREE.MathUtils.degToRad(15);
const MAX_PHI = THREE.MathUtils.degToRad(75);

function updateCamera() {
  camera.position.x = BOARD_CX + orbitRadius * Math.sin(orbitPhi) * Math.sin(orbitTheta);
  camera.position.y = orbitRadius * Math.cos(orbitPhi);
  camera.position.z = BOARD_CZ + orbitRadius * Math.sin(orbitPhi) * Math.cos(orbitTheta);
  camera.lookAt(BOARD_CX, 0, BOARD_CZ);
}
updateCamera();

// ── Controls (needs camera for raycasting, board for arrow meshes) ────────────
const { tilt: controls, orbit: orbitInput } = initControls(scene, board, camera, BOARD_CX, BOARD_CZ);

// ── HUD ───────────────────────────────────────────────────────────────────────
const { startTimer, stopTimer, updateMinimap, showWin } = initHUD();

// ── Resize ────────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Tilt constants ────────────────────────────────────────────────────────────
const MAX_TILT  = 0.3;
const TILT_STEP = 0.02;
const TILT_LERP = 0.05;

const clock = new THREE.Clock();
let won = false;
startTimer();

// ── Game loop ─────────────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);

  if (!won) {
    // Camera orbit from drag
    if (orbitInput.deltaTheta !== 0 || orbitInput.deltaPhi !== 0) {
      orbitTheta += orbitInput.deltaTheta;
      orbitPhi    = THREE.MathUtils.clamp(orbitPhi + orbitInput.deltaPhi, MIN_PHI, MAX_PHI);
      orbitInput.deltaTheta = 0;
      orbitInput.deltaPhi   = 0;
    }
    updateCamera();

    // Board tilt
    board.rotation.x = THREE.MathUtils.lerp(board.rotation.x, 0, TILT_LERP);
    board.rotation.z = THREE.MathUtils.lerp(board.rotation.z, 0, TILT_LERP);

    if (controls.up)    board.rotation.x = Math.max(board.rotation.x - TILT_STEP, -MAX_TILT);
    if (controls.down)  board.rotation.x = Math.min(board.rotation.x + TILT_STEP,  MAX_TILT);
    if (controls.left)  board.rotation.z = Math.min(board.rotation.z + TILT_STEP,  MAX_TILT);
    if (controls.right) board.rotation.z = Math.max(board.rotation.z - TILT_STEP, -MAX_TILT);

    // Ball
    const ballPos = ball.update(board, wallBoxes, delta);
    updateMinimap(grid, ballPos);

    exitMesh.rotation.y += 0.02;

    // Win check
    const dx = ballPos.x - EXIT_X, dz = ballPos.z - EXIT_Z;
    if (Math.sqrt(dx*dx + dz*dz) < 1.5) {
      won = true; stopTimer(); showWin();
    }
  }

  renderer.render(scene, camera);
}

animate();
