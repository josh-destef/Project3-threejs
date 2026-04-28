// ball.js — ball mesh + manual physics in board-local space

import * as THREE from 'three';
import { CELL, WALL_HEIGHT } from './main.js';

const BALL_RADIUS = 0.5;
let currentMaxSpeed = 16; // Changed from const to let to allow speed boosts
const DEFAULT_MAX_SPEED = 16;
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

  // --- NEW: Power-Up Methods ---
  
  function boostSpeed(duration = 10000) {
    currentMaxSpeed = DEFAULT_MAX_SPEED * 2.5; // Significant boost
    mesh.material.color.setHex(0xffaa00); // Visual cue: Orange glow
    
    setTimeout(() => {
      currentMaxSpeed = DEFAULT_MAX_SPEED;
      mesh.material.color.setHex(0xeeeeee); // Reset color
    }, duration);
  }

  function teleport(targetX, targetZ) {
    // Directly move the local coordinates
    pos.x = targetX;
    pos.z = targetZ;
    // Kill velocity so the ball doesn't fly off instantly after TP
    vel.x = 0;
    vel.z = 0;
  }

  // --- End Power-Up Methods ---

  function update(board, wallBoxes, delta) {
    const gravX = -board.rotation.z * 25;
    const gravZ = board.rotation.x * 25;

    vel.x += gravX * delta;
    vel.z += gravZ * delta;
    vel.x *= FRICTION;
    vel.z *= FRICTION;

    const spd = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
    // Use currentMaxSpeed instead of the old constant
    if (spd > currentMaxSpeed) { 
      vel.x = vel.x / spd * currentMaxSpeed; 
      vel.z = vel.z / spd * currentMaxSpeed; 
    }

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
  
  // Added boostSpeed and teleport to the returned object
  return { mesh, update, getPos, boostSpeed, teleport };
}