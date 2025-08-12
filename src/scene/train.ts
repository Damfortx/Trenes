import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { COLORS } from './uiColors';

const loader = new GLTFLoader();
const srgb = (hex: number) => new THREE.Color(hex).convertSRGBToLinear();

export function createTrain() {
  const group = new THREE.Group();
  const files = ['train-electric-city-a.glb', 'train-carriage-box.glb', 'train-carriage-wood.glb'];

  files.forEach((file, i) => {
    loader.load(`/assets/rails/${file}`, (gltf) => {
      const obj = gltf.scene;
      ensureSRGB(obj);
      obj.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          const mesh = o as THREE.Mesh;
          const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
          if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
          mat.color = srgb(COLORS.trainRed);
          mesh.material = mat;
          mesh.castShadow = true;
        }
      });
      const box = new THREE.Box3().setFromObject(obj);
      const length = box.getSize(new THREE.Vector3()).z;
      const scale = 2.6 / length;
      obj.scale.setScalar(scale);
      obj.position.z = -i * 2.6;
      group.add(obj);
    });
  });

  group.position.set(8, 0.06, 0);
  return group;
}

function ensureSRGB(obj: THREE.Object3D) {
  obj.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      const mesh = o as THREE.Mesh;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m: THREE.Material) => {
        const mat = m as THREE.MeshStandardMaterial;
        if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
      });
    }
  });
}
