// world.js — scene, board Group, wood materials, outer rim, exit beacon

import * as THREE from 'three';
import { COLS, ROWS, CELL, WALL_HEIGHT } from './main.js';

export function buildScene(grid, exitX, exitZ) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  const canvas = document.getElementById('canvas');
  const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  // ── Board Group ────────────────────────────────────────────────────────
  const board = new THREE.Group();
  scene.add(board);

  const wallMat  = new THREE.MeshLambertMaterial({ color: 0xc8a46e });
  const floorMat = new THREE.MeshLambertMaterial({ color: 0xb8935a });

  // ── Base plate ─────────────────────────────────────────────────────────
  const baseW = COLS * CELL + 4;
  const baseD = ROWS * CELL + 4;
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(baseW, 0.4, baseD),
    floorMat
  );
  base.position.set(COLS * CELL / 2, -0.2, ROWS * CELL / 2);
  board.add(base);

  // ── Floor ──────────────────────────────────────────────────────────────
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(COLS * CELL, ROWS * CELL),
    floorMat
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(COLS * CELL / 2, 0.01, ROWS * CELL / 2);
  board.add(floor);

  // ── Walls helper ───────────────────────────────────────────────────────
  const wallBoxes = [];
  function addWall(x, z, w, d, addToCollision = true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, WALL_HEIGHT, d), wallMat);
    mesh.position.set(x, WALL_HEIGHT / 2, z);
    board.add(mesh);
    if (addToCollision) {
      mesh.updateWorldMatrix(true, false);
      wallBoxes.push(new THREE.Box3().setFromObject(mesh));
    }
    return mesh;
  }

  // ── Power-Up Setup ─────────────────────────────────────────────────────
  const powerUpMeshes = [];
  const powerUpColors = { 'FREEZE': 0x00ffff, 'SPEED': 0xffaa00, 'TELEPORT': 0xff00ff };

  function addPowerUp(r, c, type) {
    const geo = new THREE.OctahedronGeometry(0.4);
    const mat = new THREE.MeshPhongMaterial({ color: powerUpColors[type], emissive: powerUpColors[type], emissiveIntensity: 0.5 });
    const mesh = new THREE.Mesh(geo, mat);
    
    // Position in center of cell
    mesh.position.set(c * CELL + CELL / 2, 0.6, r * CELL + CELL / 2);
    mesh.userData = { type: type, active: true };
    board.add(mesh);
    powerUpMeshes.push(mesh);
  }

  // ── Maze internal walls & Power-ups ────────────────────────────────────
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = grid[r][c];
      if (cell.walls.top)  addWall(c * CELL + CELL / 2, r * CELL, CELL, 0.3);
      if (cell.walls.left) addWall(c * CELL, r * CELL + CELL / 2, 0.3, CELL);
      
      // If maze.js added a power-up string here, build the mesh
      if (cell.powerUp) addPowerUp(r, c, cell.powerUp);
    }
  }

  // Collision function to be called from main.js
  function checkPowerUps(ballObj) {
    const ballPos = ballObj.getPos();
    powerUpMeshes.forEach(m => {
      if (!m.userData.active) return;

      // Simple 2D distance check (X and Z)
      const dist = Math.sqrt(Math.pow(ballPos.x - m.position.x, 2) + Math.pow(ballPos.z - m.position.z, 2));
      
      if (dist < 0.8) {
        m.userData.active = false;
        m.visible = false; // Hide it
        
        const type = m.userData.type;
        if (type === 'SPEED') {
          ballObj.boostSpeed(10000);
        } else if (type === 'TELEPORT') {
          // Teleport closer to exitMesh position
          ballObj.teleport(exitX - CELL, exitZ - CELL);
        } else if (type === 'FREEZE') {
          // Trigger a global freeze (handled in main.js/hud.js)
          window.dispatchEvent(new CustomEvent('freezeTime', { detail: { duration: 10000 } }));
        }
      }
      // Animation: Make them spin
      m.rotation.y += 0.05;
    });
  }

  // (Remaining outer walls and lighting code stays the same...)
  // ... (Right/Bottom outer walls, Thick rim, Lighting, Axis Reference)

  // right and bottom outer thin walls (for collision)
  for (let r = 0; r < ROWS; r++) addWall(COLS * CELL, r * CELL + CELL / 2, 0.3, CELL);
  for (let c = 0; c < COLS; c++) addWall(c * CELL + CELL / 2, ROWS * CELL, CELL, 0.3);

  const rimT = 1.5;
  const cx = COLS * CELL / 2, cz = ROWS * CELL / 2;
  addWall(cx, -rimT / 2, COLS * CELL + rimT * 2, rimT, false);
  addWall(cx, ROWS * CELL + rimT / 2, COLS * CELL + rimT * 2, rimT, false);
  addWall(-rimT / 2, cz, rimT, ROWS * CELL, false);
  addWall(COLS * CELL + rimT / 2, cz, rimT, ROWS * CELL, false);

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const keyLight = new THREE.DirectionalLight(0xffd9a0, 0.9);
  keyLight.position.set(COLS * CELL / 2 + 20, 40, ROWS * CELL / 2 - 20);
  scene.add(keyLight);

  // ── Exit beacon ────────────────────────────────────────────────────────
  const exitMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.8, 0.05, 32),
    new THREE.MeshLambertMaterial({ color: 0x00cc44 })
  );
  exitMesh.position.set(exitX, 0.05, exitZ);
  board.add(exitMesh);

  window.addEventListener('resize', () => renderer.setSize(window.innerWidth, window.innerHeight));

  return { scene, renderer, board, wallBoxes, exitMesh, checkPowerUps };
}