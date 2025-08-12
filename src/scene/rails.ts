import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

const TILE = 2;       // 1 pieza recta = 2u
const Y_RAIL = 0.06;  // elevación sutil sobre el suelo
const SEGMENTS = 32;  // lados del "círculo" (32 ≈ se ve suave y cabe en 32×24)

export function createRails() {
  const group = new THREE.Group();
  let straight: THREE.Object3D | null = null;

  // Usa SIEMPRE la misma subfamilia de Kenney
  loader.load('/assets/rails/railroad-straight.glb', (gltf) => {
    straight = gltf.scene;
    preparePiece(straight);
    build();
  });

  function preparePiece(obj: THREE.Object3D) {
    obj.traverse((o: any) => {
      if (!o.isMesh) return;
      const name = (o.name || '').toLowerCase();
      const color =
        name.includes('rail')  ? 0x6F6F6F :
        name.includes('sleep') ? 0x8B5A2B : 0x8B5A2B;

      o.material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color).convertSRGBToLinear(),
        metalness: 0, roughness: 0.6, flatShading: true,
      });
      o.castShadow = true; o.receiveShadow = true;
    });

    // Normaliza para que la recta mida TILE en su eje largo
    const b = new THREE.Box3().setFromObject(obj);
    const s = b.getSize(new THREE.Vector3());
    const span = Math.max(s.x, s.z);
    const scale = TILE / span;
    obj.scale.setScalar(scale);
    obj.position.y = Y_RAIL;
    obj.updateWorldMatrix(true, true);
  }

  // Posición/orientación útil para poner el tren
  const center = new THREE.Vector3(0, 0, 0);
  const R = TILE / (2 * Math.sin(Math.PI / SEGMENTS)); // cuerda entre piezas = TILE
  function getPoseAtAngle(theta = 0) {
    const pos = new THREE.Vector3(
      center.x + R * Math.cos(theta),
      Y_RAIL,
      center.z + R * Math.sin(theta),
    );
    const yaw = theta + Math.PI / 2; // tangente del círculo
    return { position: pos, yaw };
  }

  function place(p: THREE.Object3D, theta: number) {
    const inst = p.clone(true);
    const { position, yaw } = getPoseAtAngle(theta);
    inst.position.copy(position);
    inst.rotation.y = yaw;
    group.add(inst);
  }

  function build() {
    if (!straight) return;
    for (let i = 0; i < SEGMENTS; i++) {
      const theta = (i / SEGMENTS) * Math.PI * 2;
      place(straight!, theta);
    }
  }

  return { group, getSpawnPose: () => getPoseAtAngle(0), railHeight: Y_RAIL };
}
