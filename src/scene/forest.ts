// src/scene/forest.ts
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const rand = (a: number, b: number) => a + Math.random() * (b - a);

export function createForest() {
  const group = new THREE.Group();

  // Selección contenida pero variada del Nature Kit
  const TREES = [
    'tree_oak.glb',
    'tree_pineTallA.glb',
    'tree_cone.glb',
    'tree_default.glb',
  ];
  const ROCKS = [
    'rock_largeA.glb',
    'rock_smallC.glb',
    'stone_largeA.glb',
    'stone_smallC.glb',
  ];

  scatterMany(TREES, 14, true);
  scatterMany(ROCKS, 12, false);

  function scatterMany(files: string[], countTotal: number, castShadow: boolean) {
    files.forEach((file) => {
      loader.load(`/assets/nature/${file}`, (gltf) => {
        const source = gltf.scene;
        // sRGB en texturas + shadows
        source.traverse((o: any) => {
          if (o.isMesh) {
            const mats = Array.isArray(o.material) ? o.material : [o.material];
            for (const m of mats) {
              const mat = m as THREE.MeshStandardMaterial;
              if (mat.map) { mat.map.colorSpace = THREE.SRGBColorSpace; mat.map.anisotropy = 4; }
            }
            o.castShadow = castShadow;
            o.receiveShadow = true;
          }
        });

        // Dispersión con “reserva” circular (deja hueco al loop de vías)
        const radiusReserve = 6.5;
        for (let i = 0; i < Math.floor(countTotal / files.length); i++) {
          const clone = source.clone(true);
          let x = 0, z = 0;
          do {
            x = rand(-14, 14);
            z = rand(-10, 10);
          } while (Math.hypot(x, z) < radiusReserve);

          clone.position.set(x, 0, z);
          clone.rotation.y = rand(0, Math.PI * 2);
          const s = rand(0.85, 1.15);
          clone.scale.setScalar(s);
          group.add(clone);
        }
      });
    });
  }

  return group;
}
