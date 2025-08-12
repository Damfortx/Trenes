// src/scene/rails.ts
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
// Ayuda a resolver texturas externas (Kenney usa /Textures/colormap.png)
loader.setResourcePath('/assets/rails/');

const Y_RAIL = 0.08;     // altura sutil sobre el terreno
const SEGMENTS = 40;     // suavidad del círculo aprox
const MARGIN = 2.0;      // margen desde el borde del tablero

export function createRails() {
  const group = new THREE.Group();

  // Intentamos varias piezas rectas conocidas del pack
  const candidates = [
    'track.glb',
    'track-single.glb',
    'railroad-straight.glb',
    'railroad-rail-straight.glb',
  ];

  loadFirst(candidates).then((straight) => {
    if (!straight) {
      console.warn('[rails] No se encontró una pieza recta válida.');
      return;
    }
    normalizePiece(straight);

    // Determinar chordLen (longitud efectiva de la recta normalizada)
    const chordLen = measureSpan(straight);

    // Radio máximo que cabe en 32×24 con margen
    const halfW = 16 - MARGIN;
    const halfD = 12 - MARGIN;
    const maxR = Math.min(halfW, halfD);
    // Relación cuerda/radio: chord = 2*R*sin(pi/SEGMENTS)
    const R = Math.min(maxR, chordLen / (2 * Math.sin(Math.PI / SEGMENTS))) * 1.05;

    for (let i = 0; i < SEGMENTS; i++) {
      const theta = (i / SEGMENTS) * Math.PI * 2;
      const inst = straight.clone(true);
      const pos = new THREE.Vector3(R * Math.cos(theta), Y_RAIL, R * Math.sin(theta));
      inst.position.copy(pos);
      inst.rotation.y = theta + Math.PI / 2;
      group.add(inst);
    }

    // Export helpers
    (group as any)._spawnPose = (angle = 0) => ({
      position: new THREE.Vector3(R * Math.cos(angle), Y_RAIL, R * Math.sin(angle)),
      yaw: angle + Math.PI / 2,
    });
    (group as any)._railHeight = Y_RAIL;
    (group as any)._chordLen = chordLen;
  });

  return {
    group,
    getSpawnPose: () => (group as any)._spawnPose?.(0) ?? { position: new THREE.Vector3(0, Y_RAIL, 0), yaw: 0 },
    railHeight: (group as any)._railHeight ?? Y_RAIL,
    chordLen: (group as any)._chordLen ?? 2.0,
  };
}

function loadFirst(names: string[]) {
  return new Promise<THREE.Object3D | null>((resolve) => {
    const tryNext = (i: number) => {
      if (i >= names.length) return resolve(null);
      loader.load(`/assets/rails/${names[i]}`, (gltf) => resolve(gltf.scene), undefined, () => tryNext(i + 1));
    };
    tryNext(0);
  });
}

function normalizePiece(obj: THREE.Object3D) {
  obj.traverse((o: any) => {
    if (!o.isMesh) return;
    // Mantén materiales; sólo asegura sRGB en mapas
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      const mat = m as THREE.MeshStandardMaterial;
      if (mat.map) { mat.map.colorSpace = THREE.SRGBColorSpace; mat.map.anisotropy = 4; }
    }
    o.castShadow = true; o.receiveShadow = true;
  });

  // Escala para que su “span” mayor sea ≈ 2.0 (unidad de vía)
  const span = measureSpan(obj);
  const target = 2.0;
  const scl = THREE.MathUtils.clamp(target / (span || 1), 0.02, 5);
  obj.scale.setScalar(scl);
  obj.position.y = Y_RAIL;
  obj.updateWorldMatrix(true, true);
}

function measureSpan(obj: THREE.Object3D) {
  obj.updateWorldMatrix(true, true);
  const b = new THREE.Box3().setFromObject(obj);
  const s = b.getSize(new THREE.Vector3());
  return Math.max(s.x, s.z);
}
