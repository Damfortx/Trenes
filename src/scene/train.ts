// scene/train.ts
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { COLORS } from './uiColors';

const loader = new GLTFLoader();
const srgb = (hex: number | string) => new THREE.Color(hex as any).convertSRGBToLinear();

type Pose = { position?: THREE.Vector3; yaw?: number; railY?: number };
type TrainOpts = { random?: boolean; pose?: Pose };

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

const CAR_LEN = 1.6;   // más corto que la cuerda de vía (TILE=2.0)
const GAP     = 0.03;  // separación mínima
const SCALE_MIN = 0.05, SCALE_MAX = 5.0; // seguridad

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
    loader.load(`/assets/rails/${file}`, (gltf) => {
      const obj = gltf.scene;

      obj.traverse((o: any) => {
        if (!o.isMesh) return;
        const mat = (o.material as THREE.MeshStandardMaterial).clone();
        if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
        mat.metalness = 0; mat.roughness = 0.6; mat.color = srgb(COLORS.trainRed);
        o.material = mat; o.castShadow = true;
      });

      obj.updateWorldMatrix(true, true);
      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3());
      const length = Math.max(size.x, size.z) || 1; // seguridad
      const scl = THREE.MathUtils.clamp(CAR_LEN / length, SCALE_MIN, SCALE_MAX);
      obj.scale.setScalar(scl);

      // encadena los vagones detrás de la cabeza
      obj.position.z = -i * (CAR_LEN + GAP);
      group.add(obj);

      if (++loaded === expected) {
        // Apoyo vertical sobre la vía, y pose final
        const bb = new THREE.Box3().setFromObject(group);
        const railY = (opts.pose?.railY ?? 0.08);
        const clearance = 0.02;
        group.position.y += (railY + clearance) - bb.min.y;
        if (opts.pose?.yaw !== undefined) group.rotation.y = opts.pose.yaw;
        if (opts.pose?.position) group.position.add(opts.pose.position);
      }
    });
  });

  return group;
}
