import * as THREE from 'three';
import { COLORS } from './uiColors';

export function createForest() {
  const group = new THREE.Group();

  const trunkGeo = new THREE.CylinderGeometry(0.1, 0.1, 1, 6);
  const trunkMat = new THREE.MeshLambertMaterial({ color: COLORS.treeTrunk, flatShading: true });
  const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, 50);

  const topGeo = new THREE.ConeGeometry(0.5, 1, 6);
  const topMat = new THREE.MeshLambertMaterial({ color: COLORS.treeTop, flatShading: true });
  const topMesh = new THREE.InstancedMesh(topGeo, topMat, 50);

  let idx = 0;
  while (idx < 50) {
    const x = Math.random() * 28 - 14;
    const z = Math.random() * 20 - 10;
    if (Math.hypot(x, z) < 6) continue; // leave center clear
    const trunkMatrix = new THREE.Matrix4().makeTranslation(x, 0.5, z);
    trunkMesh.setMatrixAt(idx, trunkMatrix);
    const topMatrix = new THREE.Matrix4().makeTranslation(x, 1.3, z);
    topMesh.setMatrixAt(idx, topMatrix);
    idx++;
  }
  trunkMesh.instanceMatrix.needsUpdate = true;
  topMesh.instanceMatrix.needsUpdate = true;
  trunkMesh.castShadow = true;
  topMesh.castShadow = true;

  group.add(trunkMesh);
  group.add(topMesh);

  const rockGeo = new THREE.DodecahedronGeometry(0.3);
  const rockMat = new THREE.MeshLambertMaterial({ color: 0x888888, flatShading: true });
  const rocks = new THREE.InstancedMesh(rockGeo, rockMat, 20);
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * 30 - 15;
    const z = Math.random() * 22 - 11;
    if (Math.hypot(x, z) < 5) { i--; continue; }
    const matrix = new THREE.Matrix4().makeTranslation(x, 0.15, z);
    rocks.setMatrixAt(i, matrix);
  }
  rocks.instanceMatrix.needsUpdate = true;
  rocks.castShadow = true;
  group.add(rocks);

  return group;
}
