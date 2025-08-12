import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { createCamera } from './scene/camera';
import { createLights } from './scene/lights';
import { createGround } from './scene/ground';
import { createWater } from './scene/water';
import { createCliffs } from './scene/cliffs';
import { createForest } from './scene/forest';
import { COLORS } from './scene/uiColors';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

document.getElementById('app')!.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(COLORS.terrain);

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
const objLoader = new OBJLoader();
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
  const baseRadius = 2.55;
  const scale = radius / baseRadius;

  gltfLoader.load('/assets/rails/railroad-rail-curve.glb', (gltf) => {
    const piece = gltf.scene;
    piece.traverse((o) => {
      if (o instanceof THREE.Mesh) o.castShadow = true;
    });
    for (let i = 0; i < 4; i++) {
      const seg = piece.clone();
      seg.scale.setScalar(scale);
      seg.rotation.y = i * Math.PI / 2;
      seg.position.set(Math.cos(i * Math.PI / 2) * radius, 0, Math.sin(i * Math.PI / 2) * radius);
      group.add(seg);
    }
  });

  gltfLoader.load('/assets/rails/railroad-rail-straight.glb', (gltf) => {
    const straight = gltf.scene;
    straight.scale.setScalar(scale);
    straight.position.set(0, 0, 0);
    group.add(straight);
  });

  group.position.y = 0.05;
  return group;
}

function createTrain() {
  const group = new THREE.Group();

  objLoader.load('/assets/trains/Locomotive_Front.obj', (obj) => {
    repaint(obj);
    group.add(obj);
  });

  objLoader.load('/assets/trains/CargoTrain_Wagon.obj', (obj) => {
    repaint(obj);
    obj.position.x = -2.2;
    group.add(obj);
  });

  group.position.set(8, 0.05, 0);
  return group;
}

function repaint(root: THREE.Object3D) {
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.material = new THREE.MeshLambertMaterial({ color: COLORS.trainRed });
      o.castShadow = true;
    }
  });
}
