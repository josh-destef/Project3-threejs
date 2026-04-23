// controls.js — 3D arrow mesh tilt + drag-to-orbit (no HTML buttons)

import * as THREE from 'three';

const BASE_COLOR   = 0xe8873a;
const HOVER_COLOR  = 0xffaa55;

export function initControls(scene, board, camera, boardCX, boardCZ) {
  const RIM_OFFSET = boardCX + 4;
  // ── Tilt hold state ─────────────────────────────────────────────────────
  const tilt = { up: false, down: false, left: false, right: false };

  // ── Orbit drag state ────────────────────────────────────────────────────
  const orbit = { deltaTheta: 0, deltaPhi: 0 };

  // ── 3D Arrow meshes ─────────────────────────────────────────────────────
  const arrowGeo = new THREE.ConeGeometry(2, 3.5, 3);
  const makeMat  = () => new THREE.MeshLambertMaterial({ color: BASE_COLOR });

  function makeArrow(x, y, z, rx, rz) {
    const mesh = new THREE.Mesh(arrowGeo, makeMat());
    mesh.position.set(x, y, z);
    if (rx !== undefined) mesh.rotation.x = rx;
    if (rz !== undefined) mesh.rotation.z = rz;
    board.add(mesh);
    return mesh;
  }

  const topArrow    = makeArrow(boardCX,            0.5, boardCZ - RIM_OFFSET, -Math.PI / 2,  undefined);
  const bottomArrow = makeArrow(boardCX,            0.5, boardCZ + RIM_OFFSET,  Math.PI / 2,  undefined);
  const leftArrow   = makeArrow(boardCX - RIM_OFFSET, 0.5, boardCZ,            undefined,  Math.PI / 2);
  const rightArrow  = makeArrow(boardCX + RIM_OFFSET, 0.5, boardCZ,            undefined, -Math.PI / 2);

  const arrows     = [topArrow, bottomArrow, leftArrow, rightArrow];
  const arrowTilts = [  'up',      'down',    'left',    'right'   ];

  // ── Raycaster ───────────────────────────────────────────────────────────
  const raycaster = new THREE.Raycaster();
  const mouse     = new THREE.Vector2();
  const canvas    = document.getElementById('canvas');

  function getArrowHit(clientX, clientY) {
    mouse.x =  (clientX / window.innerWidth)  * 2 - 1;
    mouse.y = -(clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(arrows);
    return hits.length > 0 ? hits[0].object : null;
  }

  function setTilt(mesh, on) {
    const idx = arrows.indexOf(mesh);
    if (idx !== -1) tilt[arrowTilts[idx]] = on;
  }

  function clearTilts() {
    tilt.up = tilt.down = tilt.left = tilt.right = false;
  }

  // ── Hover highlight ─────────────────────────────────────────────────────
  function updateHover(clientX, clientY) {
    const hit = getArrowHit(clientX, clientY);
    arrows.forEach(a => {
      a.material.color.setHex(a === hit ? HOVER_COLOR : BASE_COLOR);
    });
  }

  // ── Mouse events ────────────────────────────────────────────────────────
  const SENS = 0.005;
  let dragging = false, dragX = 0, dragY = 0;

  canvas.addEventListener('mousedown', (e) => {
    const hit = getArrowHit(e.clientX, e.clientY);
    if (hit) {
      setTilt(hit, true);
    } else {
      dragging = true; dragX = e.clientX; dragY = e.clientY;
    }
  });

  window.addEventListener('mousemove', (e) => {
    updateHover(e.clientX, e.clientY);
    if (!dragging) return;
    orbit.deltaTheta += (e.clientX - dragX) * SENS;
    orbit.deltaPhi   += (e.clientY - dragY) * SENS;
    dragX = e.clientX; dragY = e.clientY;
  });

  window.addEventListener('mouseup', () => {
    dragging = false;
    clearTilts();
  });

  canvas.addEventListener('mouseleave', () => {
    dragging = false;
    clearTilts();
    arrows.forEach(a => a.material.color.setHex(BASE_COLOR));
  });

  // ── Touch events ────────────────────────────────────────────────────────
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    const hit = getArrowHit(t.clientX, t.clientY);
    if (hit) {
      e.preventDefault();
      setTilt(hit, true);
    } else {
      dragging = true; dragX = t.clientX; dragY = t.clientY;
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    const t = e.touches[0];
    if (dragging) {
      orbit.deltaTheta += (t.clientX - dragX) * SENS;
      orbit.deltaPhi   += (t.clientY - dragY) * SENS;
      dragX = t.clientX; dragY = t.clientY;
    }
  }, { passive: false });

  canvas.addEventListener('touchend', () => {
    dragging = false;
    clearTilts();
  });
  canvas.addEventListener('touchcancel', () => {
    dragging = false;
    clearTilts();
  });

  return { tilt, orbit };
}
