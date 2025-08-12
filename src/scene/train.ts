// src/scene/train.ts
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

const gltf = new GLTFLoader();
const mtl = new MTLLoader();
const obj = new OBJLoader();

type Pose = { position?: THREE.Vector3; yaw?: number; railY?: number };
type TrainOpts = { random?: boolean; pose?: Pose; carLength?: number };

const HEADS_GLTF = [
  'train-electric-city-a.glb',
  'train-diesel-a.glb',
  'train-locomotive-a.glb',
  'train-electric-bullet-a.glb',
  'train-tram-classic.glb',
  'train-tram-modern.glb',
];

const CARS_GLTF = [
  'train-electric-city-b.glb',
  'train-electric-city-c.glb',
  'train-carriage-box.glb',
  'train-carriage-wood.glb',
  'train-carriage-tank.glb',
  'train-carriage-lumber.glb',
  'train-carriage-flatbed.glb',
];

// Quaternius (OBJ+MTL)
const HEADS_OBJ = [
  'Locomotive_Front.obj',
  'HighSpeed_Front.obj',
];
const CARS_OBJ = [
  'Locomotive_CoalTender.obj',
  'Locomotive_PassengerWagon.obj',
  'Locomotive_Wagon.obj',
  'HighSpeed_Wagon.obj',
];

function pick<T>(a: T[]) { return a[Math.floor(Math.random() * a.length)]; }

export function createTrain(opts: TrainOpts = {}) {
  const group = new THREE.Group();

  // longitud nominal por vagón (se pasa desde rails.chordLen para casar escalas)
  const CAR_LEN = Math.max(0.9 * (opts.carLength ?? 2.0), 1.2);
  const GAP = 0.03;

  const useObj = !!opts.random && Math.random() < 0.5;

  const files = useObj
    ? [pick(HEADS_OBJ), pick(CARS_OBJ), Math.random() < 0.5 ? pick(CARS_OBJ) : null].filter(Boolean) as string[]
    : [opts.random ? pick(HEADS_GLTF) : 'train-electric-city-a.glb',
       opts.random ? pick(CARS_GLTF) : 'train-carriage-box.glb',
       Math.random() < 0.5 ? pick(CARS_GLTF) : null].filter(Boolean) as string[];

  let loaded = 0;
  const expected = files.length;

  files.forEach((file, i) => {
    if (useObj) {
      // OBJ+MTL (Quaternius)
      const base = file.replace('.obj', '');
      mtl.setPath('/assets/trains/').load(`${base}.mtl`, (materials) => {
        materials.preload();
        obj.setMaterials(materials);
        obj.setPath('/assets/trains/').load(`${base}.obj`, (mesh) => {
          onPieceLoaded(mesh, i);
        });
      });
    } else {
      // GLTF (Kenney)
      gltf.setResourcePath('/assets/rails/Textures/'); // por si el GLTF referencia Textures/colormap.png
      gltf.load(`/assets/rails/${file}`, (g) => onPieceLoaded(g.scene, i));
    }
  });

  function onPieceLoaded(piece: THREE.Object3D, index: number) {
    // Conservar materiales; sólo asegurar sRGB en mapas
    piece.traverse((o: any) => {
      if (!o.isMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        const mat = m as THREE.MeshStandardMaterial;
        if (mat.map) { mat.map.colorSpace = THREE.SRGBColorSpace; mat.map.anisotropy = 4; }
      }
      o.castShadow = true;
    });

    // Normalizar longitud a CAR_LEN
    piece.updateWorldMatrix(true, true);
    const bb = new THREE.Box3().setFromObject(piece);
    const size = bb.getSize(new THREE.Vector3());
    const span = Math.max(size.x, size.z) || 1;
    const scl = THREE.MathUtils.clamp(CAR_LEN / span, 0.02, 5);
    piece.scale.setScalar(scl);

    // Encadenar
    piece.position.z = -index * (CAR_LEN + GAP);
    group.add(piece);

    if (++loaded === expected) {
      // Asentar sobre la vía con un pequeño “clearance”
      const b = new THREE.Box3().setFromObject(group);
      const railY = opts.pose?.railY ?? 0.08;
      const clearance = 0.02;
      group.position.y += (railY + clearance) - b.min.y;

      if (opts.pose?.yaw !== undefined) group.rotation.y = opts.pose.yaw;
      if (opts.pose?.position) group.position.add(opts.pose.position);
    }
  }

  return group;
}
