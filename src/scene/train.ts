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

function pick<T>(arr: T[]) { return arr[Math.floor(Math.random() * arr.length)]; }

export function createTrain(opts: TrainOpts = {}) {
  const group = new THREE.Group();

  // Selección aleatoria o fija (3 piezas por defecto)
  const numCars = opts.random ? (1 + Math.floor(Math.random() * 3)) : 2;
  const files = [
    (opts.random ? pick(HEADS) : 'train-electric-city-a.glb'),
    ...Array.from({ length: numCars }, () => (opts.random ? pick(CARS) : 'train-carriage-box.glb')),
  ];

  let loaded = 0;
  const expected = files.length;

  files.forEach((file, i) => {
    loader.load(`/assets/rails/${file}`, (gltf) => {
      const obj = gltf.scene;

      obj.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          const mesh = o as THREE.Mesh;
          const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
          if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
          mat.metalness = 0; mat.roughness = 0.6;
          mat.color = srgb(COLORS.trainRed);
          mesh.material = mat;
          mesh.castShadow = true;
        }
      });

      // Normaliza cada pieza al largo ~2.6u
      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3());
      const length = Math.max(size.x, size.z);
      const scale = 2.6 / length;
      obj.scale.setScalar(scale);
      obj.position.z = -i * 2.6;   // encadena vagones detrás de la cabeza

      group.add(obj);

      loaded++;
      if (loaded === expected) {
        // Ajuste vertical: apoya sobre la vía
        const bb = new THREE.Box3().setFromObject(group);
        const minY = bb.min.y;
        const railY = (opts.pose?.railY ?? 0.06);
        const clearance = 0.02; // leve separación
        group.position.y += (railY + clearance) - minY;

        // Orientación y posición final
        if (opts.pose?.yaw !== undefined) group.rotation.y = opts.pose.yaw;
        if (opts.pose?.position) group.position.add(opts.pose.position);
      }
    });
  });

  // fallback por si no pasas pose
  if (!opts.pose) group.position.set(8, 0.06, 0);

  return group;
}
