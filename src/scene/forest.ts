import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { COLORS } from './uiColors';

const loader = new GLTFLoader();
const srgb = (hex: number | string) => new THREE.Color(hex as any).convertSRGBToLinear();

export function createForest() {
  const group = new THREE.Group();

  const trees = ['tree_pineTallA.glb', 'tree_oak.glb', 'tree_cone.glb'];
  const rocks = ['rock_largeA.glb', 'rock_smallC.glb'];

  trees.forEach((t) => scatter(t, 6, true, COLORS.treeTop));
  rocks.forEach((r) => scatter(r, 4, false, COLORS.terrain));

  function scatter(file: string, count: number, cast: boolean, color: number) {
    loader.load(`/assets/nature/${file}`, (gltf) => {
      const meshes: THREE.Mesh[] = [];
      gltf.scene.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
      });

      const instances = meshes.map((m) => {
        const mat = new THREE.MeshStandardMaterial({
          color: srgb(color),
          metalness: 0,
          roughness: 0.8,
          flatShading: true,
        });
        const inst = new THREE.InstancedMesh(m.geometry, mat, count);
        inst.castShadow = cast;
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
        const s = 0.85 + Math.random() * 0.3;
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
