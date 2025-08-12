// scene/train.ts
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

type Pose = { position?: THREE.Vector3; yaw?: number; railY?: number };
type TrainOpts = { random?: boolean; pose?: Pose; carLength: number };

const gltfLoader = new GLTFLoader();
const mtlLoader = new MTLLoader();
const objLoader = new OBJLoader();

const K_HEADS = [
  'train-electric-city-a.glb',
  'train-diesel-a.glb',
  'train-locomotive-a.glb',
  'train-electric-bullet-a.glb',
  'train-tram-classic.glb',
  'train-tram-modern.glb',
];

const K_CARS = [
  'train-electric-city-b.glb',
  'train-electric-city-c.glb',
  'train-carriage-box.glb',
  'train-carriage-wood.glb',
  'train-carriage-tank.glb',
  'train-carriage-lumber.glb',
  'train-carriage-flatbed.glb',
];

const Q_HEADS = [
  { obj: 'Locomotive_Front.obj', mtl: 'Locomotive_Front.mtl' },
  { obj: 'CargoTrain_Front.obj', mtl: 'CargoTrain_Front.mtl' },
  { obj: 'HighSpeed_Front.obj', mtl: 'HighSpeed_Front.mtl' },
];

const Q_CARS = [
  { obj: 'Locomotive_Wagon.obj', mtl: 'Locomotive_Wagon.mtl' },
  { obj: 'Locomotive_PassengerWagon.obj', mtl: 'Locomotive_PassengerWagon.mtl' },
  { obj: 'CargoTrain_Wagon.obj', mtl: 'CargoTrain_Wagon.mtl' },
  { obj: 'CargoTrain_WagonEmpty.obj', mtl: 'CargoTrain_WagonEmpty.mtl' },
  { obj: 'CargoTrain_WagonOpenContainer.obj', mtl: 'CargoTrain_WagonOpenContainer.mtl' },
  { obj: 'CargoTrain_Container.obj', mtl: 'CargoTrain_Container.mtl' },
  { obj: 'HighSpeed_Wagon.obj', mtl: 'HighSpeed_Wagon.mtl' },
];

const GAP = 0.03;
const SCALE_MIN = 0.05, SCALE_MAX = 5.0;

function pick<T>(arr: T[]) { return arr[Math.floor(Math.random() * arr.length)]; }

export function createTrain(opts: TrainOpts) {
  const group = new THREE.Group();
  const numCars = opts.random ? 1 + Math.floor(Math.random() * 3) : 2;
  const useKenney = opts.random ? Math.random() < 0.5 : true;

  const files = useKenney
    ? [opts.random ? pick(K_HEADS) : K_HEADS[0], ...Array.from({ length: numCars }, () => opts.random ? pick(K_CARS) : K_CARS[0])]
    : [opts.random ? pick(Q_HEADS) : Q_HEADS[0], ...Array.from({ length: numCars }, () => opts.random ? pick(Q_CARS) : Q_CARS[0])];

  const loaders = files.map((f) => useKenney ? loadGLB(`/assets/rails/${f as string}`) : loadOBJ(f as any));

  Promise.all(loaders).then((parts) => {
    parts.forEach((obj, i) => {
      prepareObj(obj);
      obj.updateWorldMatrix(true, true);
      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3());
      const length = Math.max(size.x, size.z) || 1;
      const scl = THREE.MathUtils.clamp(opts.carLength / length, SCALE_MIN, SCALE_MAX);
      obj.scale.setScalar(scl);
      obj.position.z = -i * (opts.carLength + GAP);
      group.add(obj);
    });

    const bb = new THREE.Box3().setFromObject(group);
    const railY = opts.pose?.railY ?? 0.08;
    const clearance = 0.02;
    group.position.y += (railY + clearance) - bb.min.y;
    if (opts.pose?.yaw !== undefined) group.rotation.y = opts.pose.yaw;
    if (opts.pose?.position) group.position.add(opts.pose.position);
  });

  return group;
}

function loadGLB(path: string): Promise<THREE.Object3D> {
  return new Promise((resolve) => {
    gltfLoader.load(path, (gltf) => resolve(gltf.scene));
  });
}

function loadOBJ(files: { obj: string; mtl: string }): Promise<THREE.Object3D> {
  return new Promise((resolve) => {
    mtlLoader.setResourcePath('/assets/trains/');
    mtlLoader.setPath('/assets/trains/');
    mtlLoader.load(files.mtl, (materials) => {
      materials.preload();
      objLoader.setMaterials(materials);
      objLoader.setPath('/assets/trains/');
      objLoader.load(files.obj, (obj) => resolve(obj));
    });
  });
}

function prepareObj(obj: THREE.Object3D) {
  obj.traverse((o: any) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach((m: any) => {
      if (m.map) {
        m.map.colorSpace = THREE.SRGBColorSpace;
        m.map.anisotropy = 4;
      }
    });
    o.castShadow = true;
  });
}
