import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function createGround() {
  const width = 32;
  const depth = 24;
  const group = new THREE.Group();
  const loader = new GLTFLoader();

  loader.load('/assets/nature/platform_grass.glb', (gltf) => {
    const mesh = gltf.scene;
    ensureSRGB(mesh);
    mesh.traverse((o: any) => {
      if (o.isMesh) { o.receiveShadow = true; }
    });

    // Escala al área deseada
    mesh.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(mesh);
    const size = box.getSize(new THREE.Vector3());
    const sx = width / (size.x || 1);
    const sz = depth / (size.z || 1);
    mesh.scale.set(sx, 1, sz);
    mesh.updateWorldMatrix(true, true);
    // centra
    const box2 = new THREE.Box3().setFromObject(mesh);
    const center = box2.getCenter(new THREE.Vector3());
    mesh.position.sub(center);

    group.add(mesh);
  });

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
