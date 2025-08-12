import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

export function createRails() {
  const group = new THREE.Group();
  let straight: THREE.Object3D | null = null;
  let curve: THREE.Object3D | null = null;

  loader.load('/assets/rails/railroad-rail-straight.glb', (gltf) => {
    straight = gltf.scene;
    preparePiece(straight);
    build();
  });
  loader.load('/assets/rails/railroad-curve.glb', (gltf) => {
    curve = gltf.scene;
    preparePiece(curve);
    build();
  });

  function preparePiece(obj: THREE.Object3D) {
    ensureSRGB(obj);
    obj.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        const mesh = o as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const length = Math.max(size.x, size.z);
    const scale = 2 / length;
    obj.scale.setScalar(scale);
    obj.position.y = 0.08;
  }

  function build() {
    if (!straight || !curve) return;
    const pieces = [
      { obj: straight, rot: 0, pos: new THREE.Vector3(-2, 0.08, 2) },
      { obj: straight, rot: 0, pos: new THREE.Vector3(0, 0.08, 2) },
      { obj: curve, rot: 0, pos: new THREE.Vector3(2, 0.08, 2) },
      { obj: straight, rot: -Math.PI / 2, pos: new THREE.Vector3(2, 0.08, 0) },
      { obj: straight, rot: -Math.PI / 2, pos: new THREE.Vector3(2, 0.08, -2) },
      { obj: curve, rot: -Math.PI / 2, pos: new THREE.Vector3(2, 0.08, -2) },
      { obj: straight, rot: Math.PI, pos: new THREE.Vector3(0, 0.08, -2) },
      { obj: straight, rot: Math.PI, pos: new THREE.Vector3(-2, 0.08, -2) },
      { obj: curve, rot: Math.PI, pos: new THREE.Vector3(-2, 0.08, -2) },
      { obj: straight, rot: Math.PI / 2, pos: new THREE.Vector3(-2, 0.08, 0) },
      { obj: straight, rot: Math.PI / 2, pos: new THREE.Vector3(-2, 0.08, 2) },
      { obj: curve, rot: Math.PI / 2, pos: new THREE.Vector3(-2, 0.08, 2) },
    ];
    pieces.forEach((p) => {
      const inst = p.obj!.clone(true);
      inst.rotation.y = p.rot;
      inst.position.copy(p.pos);
      group.add(inst);
    });
  }

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
