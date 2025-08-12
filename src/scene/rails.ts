// scene/rails.ts
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

const TILE = 2.0;      // 1 recta = 2u
const Y_RAIL = 0.08;   // un poco más alto para que no se pierda contra el suelo
const SEGMENTS = 36;   // círculo más suave
const R_FACTOR = 1.30; // círculo más grande que antes

export function createRails() {
  const group = new THREE.Group();

  const candidates = [
    '/assets/rails/railroad-straight.glb',
    '/assets/rails/railroad-rail-straight.glb',
    '/assets/rails/track.glb',
    '/assets/rails/track-single.glb',
    '/assets/rails/track-single-detailed.glb',
  ];

  loadFirstExisting(candidates).then((straight) => {
    if (!straight) {
      console.warn('[rails] no se encontró ninguna recta de las candidatas:', candidates);
      return;
    }
    preparePiece(straight);
    buildLoop(straight);
  });

  function preparePiece(obj: THREE.Object3D) {
    obj.traverse((o: any) => {
      if (!o.isMesh) return;
      const name = (o.name || '').toLowerCase();
      const color =
        name.includes('rail')  ? 0x6F6F6F :      // metal
        name.includes('sleep') ? 0x8B5A2B :      // durmientes
                                0x8B5A2B;
      o.material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color).convertSRGBToLinear(),
        metalness: 0,
        roughness: 0.6,
        flatShading: true,
      });
      o.castShadow = true; o.receiveShadow = true;
    });

    // Normaliza la longitud a TILE (eje x/z mayor)
    obj.updateWorldMatrix(true, true);
    const b = new THREE.Box3().setFromObject(obj);
    const s = b.getSize(new THREE.Vector3());
    const span = Math.max(s.x, s.z) || 1; // evita división por cero
    const scale = THREE.MathUtils.clamp(TILE / span, 0.02, 5.0);
    obj.scale.setScalar(scale);
    obj.position.y = Y_RAIL;
    obj.updateWorldMatrix(true, true);
  }

  const center = new THREE.Vector3(0, 0, 0);
  const chord = TILE;
  const baseR = chord / (2 * Math.sin(Math.PI / SEGMENTS));
  const R = baseR * R_FACTOR;

  function poseAt(theta = 0) {
    const pos = new THREE.Vector3(center.x + R * Math.cos(theta), Y_RAIL, center.z + R * Math.sin(theta));
    const yaw = theta + Math.PI / 2; // tangente
    return { position: pos, yaw };
  }

  function buildLoop(piece: THREE.Object3D) {
    for (let i = 0; i < SEGMENTS; i++) {
      const theta = (i / SEGMENTS) * Math.PI * 2;
      const inst = piece.clone(true);
      const { position, yaw } = poseAt(theta);
      inst.position.copy(position);
      inst.rotation.y = yaw;
      group.add(inst);
    }
  }

  async function loadFirstExisting(paths: string[]) {
    for (const p of paths) {
      try {
        const gltf = await new Promise<THREE.Object3D | null>((resolve, reject) => {
          loader.load(p, (g) => resolve(g.scene), undefined, () => resolve(null));
        });
        if (gltf) return gltf;
      } catch {}
    }
    return null;
  }

  return {
    group,
    getSpawnPose: () => poseAt(0),
    railHeight: Y_RAIL,
  };
}
