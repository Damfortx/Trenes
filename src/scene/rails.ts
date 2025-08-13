// src/scene/rails.ts
import * as THREE from 'three';
import { railsLoader } from './loaders';

const loader = railsLoader();

export const RAIL_UNIT = 2.0;   // longitud objetivo de una recta normalizada
const Y_RAIL = 0.07;
const MARGIN = 2.0;
const BOARD_HALF_X = 16;  // WIDTH/2
const BOARD_HALF_Z = 12;  // DEPTH/2

type CurveNorm = {
  wrap: THREE.Object3D;
  spanX: number; // huella en X (ya escalada y centrada)
  spanZ: number; // huella en Z
};

export function createRails() {
  const group = new THREE.Group();

  // rectas y curvas probables en Kenney/Quaternius
  const STRAIGHT_CAND = [
    'railroad-straight.glb',
    'railroad-rail-straight.glb',
    'track.glb',
    'track-single.glb',
    'track-single-detailed.glb',
  ];
  // preferimos explícitas de 90°
  const CURVE_CAND = [
    'track-curve-90.glb',
    'railroad-curve-90.glb',
    'railroad-rail-curve-90.glb',
    'track-curve.glb',
    'railroad-curve.glb',
  ];

  // guardamos última solución para getSpawnPose()
  let last = {
    half: 6,         // semilado de la vía (centro a esquina de la “línea central”)
    span: RAIL_UNIT, // huella cuadrada que ocupa la curva en una esquina
    L: RAIL_UNIT,    // longitud de recta
  };

  Promise.all([
    loadFirstExisting(STRAIGHT_CAND),
    loadFirstExistingWithName(CURVE_CAND),
  ]).then(([straightRaw, curveNamed]) => {
    if (!straightRaw || !curveNamed?.scene) {
      console.warn('[rails] faltan piezas (recta o curva)');
      return;
    }
    const straight = normalizeStraight(straightRaw);
    const curve = normalizeCurve(curveNamed.scene); // devuelve {wrap, spanX, spanZ}
  //  buildSquareLoop(straight, curve);
  });

  // ---------- helpers de normalización ----------

  function ensureSRGBAndShadows(obj: THREE.Object3D) {
    obj.traverse((o: any) => {
      if (!o?.isMesh) return;
      o.castShadow = true; o.receiveShadow = true;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m: any) => { if (m?.map) m.map.colorSpace = THREE.SRGBColorSpace; });
    });
  }

  function normalizeStraight(src: THREE.Object3D) {
    ensureSRGBAndShadows(src);
    src.updateWorldMatrix(true, true);
    const b = new THREE.Box3().setFromObject(src);
    const size = b.getSize(new THREE.Vector3());
    const center = b.getCenter(new THREE.Vector3());
    const long = Math.max(size.x, size.z) || 1;
    const scale = THREE.MathUtils.clamp(RAIL_UNIT / long, 0.02, 5);

    const wrap = new THREE.Group();
    src.position.add(center.multiplyScalar(-scale)); // recentra
    src.scale.setScalar(scale);
    wrap.add(src);

    // orientamos para que “apunte” por +Z (su eje largo)
    if (size.x >= size.z) wrap.rotation.y = Math.PI / 2;

    wrap.position.y = Y_RAIL;
    wrap.updateWorldMatrix(true, true);
    return wrap;
  }

  function normalizeCurve(src: THREE.Object3D): CurveNorm {
    ensureSRGBAndShadows(src);
    src.updateWorldMatrix(true, true);
    const b0 = new THREE.Box3().setFromObject(src);
    const size0 = b0.getSize(new THREE.Vector3());
    const center0 = b0.getCenter(new THREE.Vector3());

    // escalamos la curva para que su “huella” quepa en una celda ~ L×L
    const boxSpan = Math.max(size0.x, size0.z) || 1;
    const scale = THREE.MathUtils.clamp(RAIL_UNIT / boxSpan, 0.02, 5);

    const wrap = new THREE.Group();
    src.position.add(center0.multiplyScalar(-scale)); // recéntrala al (0,0,0)
    src.scale.setScalar(scale);
    wrap.add(src);
    wrap.position.y = Y_RAIL;

    // medimos ya escalado y centrado:
    wrap.updateWorldMatrix(true, true);
    const b = new THREE.Box3().setFromObject(wrap);
    const size = b.getSize(new THREE.Vector3());
    return { wrap, spanX: size.x, spanZ: size.z };
  }

  // ---------- construcción del cuadrado ----------

  function buildSquareLoop(straight: THREE.Object3D, curve: CurveNorm) {
    const L = RAIL_UNIT;
    const span = Math.max(curve.spanX, curve.spanZ); // curva ocupa una “celda” ~ span×span

    // radio/semilado máximo que cabe con margen:
    const fitHalf = Math.min(BOARD_HALF_X, BOARD_HALF_Z) - MARGIN;

    // Queremos un cuadrado de lado interior: side = N*L + span
    // => N = floor((2*fitHalf - span) / L)  (N>=2)
    const N = Math.max(2, Math.floor((2 * fitHalf - span) / L));

    // semilado real que vamos a usar:
    const half = (N * L + span) / 2;

    // guardamos para spawn
    last = { half, span, L };

    // Centros de las curvas (cada una ocupa su celda de tamaño `span`)
    // cuadrantes: SW, SE, NE, NW
    const corners = [
      { x: -half + span / 2, z: -half + span / 2, rot: 0 },              // SW  (de +X a +Z)
      { x:  half - span / 2, z: -half + span / 2, rot: Math.PI / 2 },    // SE  (de +Z a -X)
      { x:  half - span / 2, z:  half - span / 2, rot: Math.PI },        // NE  (de -X a -Z)
      { x: -half + span / 2, z:  half - span / 2, rot: -Math.PI / 2 },   // NW  (de -Z a +X)
    ];

    // Colocamos curvas (centradas en su celda)
    corners.forEach(c => {
      const inst = curve.wrap.clone(true);
      inst.position.set(c.x, Y_RAIL, c.z);
      inst.rotation.y = c.rot;
      group.add(inst);
    });

    // Tramos rectos: EXACTAMENTE N por lado
    // Lado Sur: de x = -half + span/2  hasta  x = half - span/2  (z = -half)
    for (let k = 0; k < N; k++) {
      const x = (-half + span / 2) + (k + 0.5) * L;
      const inst = straight.clone(true);
      inst.position.set(x, Y_RAIL, -half);
      inst.rotation.y = Math.PI / 2; // a lo largo de X
      group.add(inst);
    }
    // Este
    for (let k = 0; k < N; k++) {
      const z = (-half + span / 2) + (k + 0.5) * L;
      const inst = straight.clone(true);
      inst.position.set(half, Y_RAIL, z);
      inst.rotation.y = 0; // a lo largo de Z
      group.add(inst);
    }
    // Norte
    for (let k = 0; k < N; k++) {
      const x = (half - span / 2) - (k + 0.5) * L;
      const inst = straight.clone(true);
      inst.position.set(x, Y_RAIL, half);
      inst.rotation.y = Math.PI / 2;
      group.add(inst);
    }
    // Oeste
    for (let k = 0; k < N; k++) {
      const z = (half - span / 2) - (k + 0.5) * L;
      const inst = straight.clone(true);
      inst.position.set(-half, Y_RAIL, z);
      inst.rotation.y = 0;
      group.add(inst);
    }
  }

  // ---------- loaders con nombre ----------

  async function loadFirstExisting(paths: string[]) {
    for (const p of paths) {
      const gltf = await new Promise<THREE.Object3D | null>((resolve) => {
        loader.load(p, (g) => resolve(g.scene), undefined, () => resolve(null));
      });
      if (gltf) return gltf;
    }
    return null;
  }

  async function loadFirstExistingWithName(paths: string[]) {
    for (const p of paths) {
      const gltf = await new Promise<{scene: THREE.Object3D, name: string} | null>((resolve) => {
        loader.load(p, (g) => resolve({ scene: g.scene, name: p }), undefined, () => resolve(null));
      });
      if (gltf) return gltf;
    }
    return null;
  }

  return {
    group,
    getSpawnPose: () => {
      // centro del primer tramo del lado sur (mirando +X)
      const x = (-last.half + last.span / 2) + (0.5) * last.L;
      return { position: new THREE.Vector3(x, Y_RAIL, -last.half), yaw: Math.PI / 2 };
    },
    railHeight: Y_RAIL,
    chordLen: RAIL_UNIT,
  };
}
