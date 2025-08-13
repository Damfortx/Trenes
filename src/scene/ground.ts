// src/scene/ground.ts
import * as THREE from 'three';

const WIDTH = 32;
const DEPTH = 24;
const BASE_H = 1;

// Verde claro tipo mockups (sin texturita repetida)
const GRASS_HEX = 0xDFF6A1; // si lo quieres aún más claro: 0xE8FAB5

export function createGround() {
  const group = new THREE.Group();

  // Base tipo diorama (beige)
  const baseGeo = new THREE.BoxGeometry(WIDTH + 2, BASE_H, DEPTH + 2);
  const baseMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xF7F7F0).convertSRGBToLinear(),
    metalness: 0,
    roughness: 0.9,
  });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = -BASE_H / 2;
  base.receiveShadow = true;
  group.add(base);

// Plano de césped (solo color)
const planeGeo = new THREE.PlaneGeometry(WIDTH, DEPTH, 1, 1);
planeGeo.rotateX(-Math.PI / 2);
const planeMat = new THREE.MeshStandardMaterial({
  color: new THREE.Color(0xDFF6A1).convertSRGBToLinear(), // verde claro
  metalness: 0,
  roughness: 0.88,
});
const grass = new THREE.Mesh(planeGeo, planeMat);
grass.position.y = 0.001;           // << levanta 1 mm para evitar z-fighting
grass.receiveShadow = true;
group.add(grass);


  return group;
}
