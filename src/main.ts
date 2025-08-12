import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createCamera } from './scene/camera';
import { createLights } from './scene/lights';
import { createGround } from './scene/ground';
import { createWater } from './scene/water';
import { createCliffs } from './scene/cliffs';
import { createForest } from './scene/forest';
import { COLORS } from './scene/uiColors';

const srgb = (hex: number) => new THREE.Color(hex).convertSRGBToLinear();

function ensureSRGB(obj: THREE.Object3D) {
  obj.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        const mat = m as THREE.MeshStandardMaterial;
        if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
      });
    }
  });
}

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

document.getElementById('app')!.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = srgb(COLORS.terrain);

const { camera, controls } = createCamera(renderer);
const { ambient, dir } = createLights();
scene.add(ambient, dir);

const ground = createGround();
scene.add(ground);

const water = createWater();
scene.add(water.mesh);

const cliffs = createCliffs();
scene.add(cliffs);

const forest = createForest();
scene.add(forest);

const gltfLoader = new GLTFLoader();
scene.add(createTrack());
scene.add(createTrain());

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate(time: number) {
  requestAnimationFrame(animate);
  water.animate(time);
  controls.update();
  renderer.render(scene, camera);
}

animate(0);

function createTrack() {
  const group = new THREE.Group();
  const radius = 8;
  gltfLoader.load('/assets/rails/railroad-rail-curve.glb', (gltf) => {
    const piece = gltf.scene;
    ensureSRGB(piece);
    piece.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.material = new THREE.MeshStandardMaterial({ color: srgb(COLORS.rail) });
        o.castShadow = true;
      }
    });
    const box = new THREE.Box3().setFromObject(piece);
    const baseRadius = Math.abs(box.min.x) + 0.35;
    const scale = radius / baseRadius;
    for (let i = 0; i < 4; i++) {
      const seg = piece.clone(true);
      seg.scale.setScalar(scale);
      seg.rotation.y = i * Math.PI / 2;
      seg.position.set(Math.cos(i * Math.PI / 2) * radius, 0, Math.sin(i * Math.PI / 2) * radius);
      group.add(seg);
    }
  });

  const sleeperGeo = new THREE.BoxGeometry(0.9, 0.18, 0.08);
  const sleeperMat = new THREE.MeshStandardMaterial({ color: srgb(COLORS.sleeper) });
  const sleeperSpacing = 0.5;
  const sleeperCount = Math.floor((Math.PI * 2 * radius) / sleeperSpacing);
  const sleepers = new THREE.InstancedMesh(sleeperGeo, sleeperMat, sleeperCount);
  const matrix = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scaleVec = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < sleeperCount; i++) {
    const angle = (i / sleeperCount) * Math.PI * 2;
    pos.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -angle);
    matrix.compose(pos, quat, scaleVec);
    sleepers.setMatrixAt(i, matrix);
  }
  sleepers.castShadow = true;
  sleepers.instanceMatrix.needsUpdate = true;
  group.add(sleepers);

  group.position.y = 0.06;
  return group;
}

function createTrain() {
  const group = new THREE.Group();
  const files = ['train-electric-city-a.glb', 'train-carriage-box.glb', 'train-carriage-wood.glb'];
  files.forEach((file, i) => {
    gltfLoader.load(`/assets/rails/${file}`, (gltf) => {
      const obj = gltf.scene;
      ensureSRGB(obj);
      obj.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.material = new THREE.MeshStandardMaterial({ color: srgb(COLORS.trainRed) });
          o.castShadow = true;
        }
      });
      const box = new THREE.Box3().setFromObject(obj);
      const length = box.getSize(new THREE.Vector3()).z;
      const scale = 2.6 / length;
      obj.scale.setScalar(scale);
      obj.position.z = -i * 2.6;
      group.add(obj);
    });
  });

  group.position.set(8, 0.05, 0);
  return group;
}
