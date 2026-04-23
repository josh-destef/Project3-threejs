// ball.js — ball mesh + manual physics in board-local space

import * as THREE from 'three';
import { CELL, WALL_HEIGHT } from './main.js';

const BALL_RADIUS = 0.5;
const MAX_SPEED = 16;
const FRICTION = 0.985;

export function createBall(scene) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(BALL_RADIUS, 16, 16),
    new THREE.MeshLambertMaterial({ color: 0xeeeeee })
  );
  scene.add(mesh);

  // Small light that follows ball
  const ballLight = new THREE.PointLight(0xffffff, 0.8, 6);
  scene.add(ballLight);

  const pos = { x: CELL / 2, z: CELL / 2 };
  const vel = { x: 0, z: 0 };

  function update(board, wallBoxes, delta) {
    const gravX = -board.rotation.z * 25;
    const gravZ = board.rotation.x * 25;

    vel.x += gravX * delta;
    vel.z += gravZ * delta;
    vel.x *= FRICTION;
    vel.z *= FRICTION;

    const spd = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
    if (spd > MAX_SPEED) { vel.x = vel.x / spd * MAX_SPEED; vel.z = vel.z / spd * MAX_SPEED; }

    // X axis collision
    const tryX = pos.x + vel.x * delta;
    const bx = new THREE.Box3(
      new THREE.Vector3(tryX - BALL_RADIUS, 0, pos.z - BALL_RADIUS),
      new THREE.Vector3(tryX + BALL_RADIUS, WALL_HEIGHT, pos.z + BALL_RADIUS)
    );
    if (!wallBoxes.some(b => bx.intersectsBox(b))) pos.x = tryX; else vel.x = 0;

    // Z axis collision
    const tryZ = pos.z + vel.z * delta;
    const bz = new THREE.Box3(
      new THREE.Vector3(pos.x - BALL_RADIUS, 0, tryZ - BALL_RADIUS),
      new THREE.Vector3(pos.x + BALL_RADIUS, WALL_HEIGHT, tryZ + BALL_RADIUS)
    );
    if (!wallBoxes.some(b => bz.intersectsBox(b))) pos.z = tryZ; else vel.z = 0;

    // World position (ball is in scene space, positioned on tilted board)
    const wp = new THREE.Vector3(pos.x, BALL_RADIUS, pos.z);
    board.localToWorld(wp);
    mesh.position.copy(wp);

    // Ball light follows ball slightly above
    ballLight.position.set(wp.x, wp.y + 2, wp.z);

    return pos;
  }

  function getPos() { return pos; }
  return { mesh, update, getPos };
}
