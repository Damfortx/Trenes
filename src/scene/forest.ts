import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

export function createForest() {
  const group = new THREE.Group();

  const trees = ['tree_pineTallA.glb', 'tree_oak.glb', 'tree_cone.glb'];
  const rocks = ['rock_largeA.glb', 'rock_smallC.glb'];

  trees.forEach((t) => scatter(t, 6, true));
  rocks.forEach((r) => scatter(r, 4, false));

  function scatter(file: string, count: number, cast: boolean) {
    loader.load(`/assets/nature/${file}`, (gltf) => {
      ensureSRGB(gltf.scene);
      for (let i = 0; i < count; i++) {
        const inst = gltf.scene.clone(true);
        inst.traverse((o: any) => { if (o.isMesh) { o.castShadow = cast; o.receiveShadow = true; } });
        const x = Math.random() * 28 - 14;
        const z = Math.random() * 20 - 10;
        if (Math.hypot(x, z) < 6) { i--; continue; }
        inst.position.set(x, 0, z);
        inst.rotation.y = Math.random() * Math.PI * 2;
        const s = 0.85 + Math.random() * 0.3;
        inst.scale.setScalar(s);
        group.add(inst);
      }
    });
  }

  return group;
}

function ensureSRGB(obj: THREE.Object3D) {
  obj.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m: any) => {
        if (m.map) {
          m.map.colorSpace = THREE.SRGBColorSpace;
          m.map.anisotropy = 4;
        }
      });
    }
  });
}
