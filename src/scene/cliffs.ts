import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

export function createCliffs() {
  const group = new THREE.Group();
  loader.load('/assets/nature/cliff_block_stone.glb', (gltf) => {
    const base = gltf.scene;
    ensureSRGB(base);
    const levels = [
      { y: 0.3, offset: new THREE.Vector3(0, 0, 0), s: 1.0 },
      { y: 0.6, offset: new THREE.Vector3(-1.2, 0, 0.6), s: 0.9 },
      { y: 0.9, offset: new THREE.Vector3(-2.0, 0, 1.2), s: 0.85 },
    ];

    levels.forEach((L) => {
      const level = base.clone(true);
      level.traverse((o: any) => {
        if (o.isMesh) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m: any) => {
            if (m.map) {
              m.map.colorSpace = THREE.SRGBColorSpace;
              m.map.anisotropy = 4;
            }
          });
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      level.position.copy(L.offset);
      level.position.y = L.y;
      level.scale.setScalar(L.s);
      group.add(level);
    });
  });
  group.position.set(12, 0, 4);
  return group;
}

function ensureSRGB(obj: THREE.Object3D) {
  obj.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        const mat = m as THREE.MeshStandardMaterial;
        if (mat.map) {
          mat.map.colorSpace = THREE.SRGBColorSpace;
          mat.map.anisotropy = 4;
        }
      });
    }
  });
}
