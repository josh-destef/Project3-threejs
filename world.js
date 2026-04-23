// world.js — scene, board Group, wood materials, outer rim, exit beacon

import * as THREE from 'three';
import { COLS, ROWS, CELL, WALL_HEIGHT } from './main.js';

export function buildScene(grid) {
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

  // ── Maze internal walls ────────────────────────────────────────────────
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = grid[r][c];
      if (cell.walls.top)  addWall(c * CELL + CELL / 2, r * CELL, CELL, 0.3);
      if (cell.walls.left) addWall(c * CELL, r * CELL + CELL / 2, 0.3, CELL);
    }
  }
  // right and bottom outer thin walls (for collision)
  for (let r = 0; r < ROWS; r++) addWall(COLS * CELL, r * CELL + CELL / 2, 0.3, CELL);
  for (let c = 0; c < COLS; c++) addWall(c * CELL + CELL / 2, ROWS * CELL, CELL, 0.3);

  // ── Thick outer rim (decorative, no collision needed — thin walls handle it) ──
  const rimH = WALL_HEIGHT;
  const rimT = 1.5;
  const cx = COLS * CELL / 2, cz = ROWS * CELL / 2;
  // North
  addWall(cx, -rimT / 2, COLS * CELL + rimT * 2, rimT, false);
  // South
  addWall(cx, ROWS * CELL + rimT / 2, COLS * CELL + rimT * 2, rimT, false);
  // West
  addWall(-rimT / 2, cz, rimT, ROWS * CELL, false);
  // East
  addWall(COLS * CELL + rimT / 2, cz, rimT, ROWS * CELL, false);

  // ── Lighting ───────────────────────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));

  const keyLight = new THREE.DirectionalLight(0xffd9a0, 0.9);
  keyLight.position.set(COLS * CELL / 2 + 20, 40, ROWS * CELL / 2 - 20);
  scene.add(keyLight);

  const fillLight = new THREE.PointLight(0x88aaff, 0.5, 120);
  fillLight.position.set(COLS * CELL / 2, 30, ROWS * CELL / 2);
  scene.add(fillLight);

  // ── Exit beacon — flat green goal circle ───────────────────────────────
  const exitMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.8, 0.05, 32),
    new THREE.MeshLambertMaterial({ color: 0x00cc44 })
  );
  exitMesh.position.set((COLS - 1) * CELL + CELL / 2, 0.05, (ROWS - 1) * CELL + CELL / 2);
  board.add(exitMesh);

  const exitLight = new THREE.PointLight(0x00ff44, 2, 6);
  exitLight.position.copy(exitMesh.position);
  exitLight.position.y += 1;
  board.add(exitLight);

  window.addEventListener('resize', () => renderer.setSize(window.innerWidth, window.innerHeight));

  return { scene, renderer, board, wallBoxes, exitMesh };
}
