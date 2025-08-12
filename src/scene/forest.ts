import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

export function createForest() {
  const group = new THREE.Group();

  const trees = [
    'tree_pineTallA.glb',
    'tree_oak.glb',
    'tree_cone.glb',
    'tree_fat.glb',
    'tree_small.glb',
  ];
  const rocks = [
    'rock_largeA.glb',
    'rock_largeB.glb',
    'rock_smallA.glb',
    'stone_largeA.glb',
    'stone_smallB.glb',
  ];
  const plants = [
    'mushroom_red.glb',
    'mushroom_tan.glb',
    'plant_bush.glb',
    'cactus_short.glb',
    'log.glb',
    'lily_large.glb',
    'lily_small.glb',
  ];

  trees.forEach((t) => scatter(t, 4 + Math.floor(Math.random() * 6)));
  rocks.forEach((r) => scatter(r, 2 + Math.floor(Math.random() * 5)));
  plants.forEach((p) => scatter(p, 2 + Math.floor(Math.random() * 4)));

  function scatter(file: string, count: number) {
    loader.load(`/assets/nature/${file}`, (gltf) => {
      const meshes: THREE.Mesh[] = [];
      gltf.scene.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
      });

      const instances = meshes.map((m) => {
        const material = Array.isArray(m.material) ? m.material[0] : m.material;
        const inst = new THREE.InstancedMesh(m.geometry, material as THREE.Material, count);
        inst.castShadow = true;
        return inst;
      });

      const matrix = new THREE.Matrix4();
      const pos = new THREE.Vector3();
      const quat = new THREE.Quaternion();
      const scale = new THREE.Vector3();

      for (let i = 0; i < count; i++) {
        const x = Math.random() * 28 - 14;
        const z = Math.random() * 20 - 10;
        if (Math.hypot(x, z) < 6) { i--; continue; }
        pos.set(x, 0, z);
        quat.setFromEuler(new THREE.Euler(0, Math.random() * Math.PI * 2, 0));
        const s = 0.8 + Math.random() * 0.4;
        scale.set(s, s, s);
        matrix.compose(pos, quat, scale);
        instances.forEach((inst) => inst.setMatrixAt(i, matrix));
      }

      instances.forEach((inst) => {
        inst.instanceMatrix.needsUpdate = true;
        group.add(inst);
      });
    });
  }

  return group;
}
