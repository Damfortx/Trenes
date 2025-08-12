import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { COLORS } from './uiColors';

const loader = new GLTFLoader();

export function createForest() {
  const group = new THREE.Group();

  loader.load('/assets/nature/tree_pineTallA.glb', (gltf) => {
    const [trunkObj, topObj] = gltf.scene.children as THREE.Mesh[];
    const trunkGeo = trunkObj.geometry.clone();
    const topGeo = topObj.geometry.clone();
    const trunkMat = new THREE.MeshLambertMaterial({ color: COLORS.treeTrunk, flatShading: true });
    const topMat = new THREE.MeshLambertMaterial({ color: COLORS.treeTop, flatShading: true });
    const count = 50;
    const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
    const topMesh = new THREE.InstancedMesh(topGeo, topMat, count);

    let idx = 0;
    while (idx < count) {
      const x = Math.random() * 28 - 14;
      const z = Math.random() * 20 - 10;
      if (Math.hypot(x, z) < 6) continue;
      const trunkMatrix = new THREE.Matrix4().makeTranslation(x, 0, z);
      trunkMesh.setMatrixAt(idx, trunkMatrix);
      const topMatrix = new THREE.Matrix4().makeTranslation(x, 0, z);
      topMesh.setMatrixAt(idx, topMatrix);
      idx++;
    }
    trunkMesh.instanceMatrix.needsUpdate = true;
    topMesh.instanceMatrix.needsUpdate = true;
    trunkMesh.castShadow = true;
    topMesh.castShadow = true;
    group.add(trunkMesh, topMesh);
  });

  loader.load('/assets/nature/rock_largeA.glb', (gltf) => {
    const rockGeo = (gltf.scene.children[0] as THREE.Mesh).geometry.clone();
    const rockMat = new THREE.MeshLambertMaterial({ color: 0x888888, flatShading: true });
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, 20);
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * 30 - 15;
      const z = Math.random() * 22 - 11;
      if (Math.hypot(x, z) < 5) { i--; continue; }
      const matrix = new THREE.Matrix4().makeTranslation(x, 0, z);
      rocks.setMatrixAt(i, matrix);
    }
    rocks.instanceMatrix.needsUpdate = true;
    rocks.castShadow = true;
    group.add(rocks);
  });

  return group;
}
