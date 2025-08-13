import * as THREE from 'three';
import { railsLoader } from './loaders';
import { RAIL_UNIT } from './rails';

const loader = railsLoader();

type Pose = { position?: THREE.Vector3; yaw?: number; railY?: number };
type TrainOpts = { random?: boolean; pose?: Pose; carLength?: number };

const HEADS = [
  'train-electric-city-a.glb',
  'train-diesel-a.glb',
  'train-locomotive-a.glb',
  'train-electric-bullet-a.glb',
  'train-tram-classic.glb',
  'train-tram-modern.glb',
];
const CARS = [
  'train-electric-city-b.glb',
  'train-electric-city-c.glb',
  'train-carriage-box.glb',
  'train-carriage-wood.glb',
  'train-carriage-tank.glb',
  'train-carriage-lumber.glb',
  'train-carriage-flatbed.glb',
];

const CAR_LEN_DEFAULT = RAIL_UNIT * 0.92;
const CAR_LEN   = RAIL_UNIT * 0.92; // coche ≈ cuerda de vía, un pelín más corto
const GAP       = 0.02;             // separación mínima
  

function pick<T>(arr: T[]) { return arr[Math.floor(Math.random() * arr.length)]; }

export function createTrain(opts: TrainOpts = {}) {
  const group = new THREE.Group();
  const numCars = opts.random ? 1 + Math.floor(Math.random() * 3) : 2;
  const files = [
    (opts.random ? pick(HEADS) : 'train-electric-city-a.glb'),
    ...Array.from({ length: numCars }, () => (opts.random ? pick(CARS) : 'train-carriage-box.glb')),
  ];

  let loaded = 0;
  const expected = files.length;

  files.forEach((file, i) => {
loader.load(file, (gltf) => {
  const obj = gltf.scene;

  // conservar materiales/texturas originales
  obj.traverse((o: any) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach((m: any) => { if (m?.map) m.map.colorSpace = THREE.SRGBColorSpace; });
  });

  const targetLen = opts.carLength ?? CAR_LEN_DEFAULT;

  obj.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const length = Math.max(size.x, size.z) || 1;
  const scl = THREE.MathUtils.clamp(targetLen / length, 0.05, 5);
  obj.scale.setScalar(scl);

  // encadenar
  obj.position.z = -i * (targetLen + GAP);
  group.add(obj);

  if (++loaded === expected) {
    const bb = new THREE.Box3().setFromObject(group);
    const railY = (opts.pose?.railY ?? 0.08);
    group.position.y += (railY + 0.02) - bb.min.y; // apoyo justo sobre la vía
    if (opts.pose?.yaw !== undefined) group.rotation.y = opts.pose.yaw;
    if (opts.pose?.position) group.position.add(opts.pose.position);
  }
});
  });

  return group;
}
