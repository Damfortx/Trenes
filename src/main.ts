import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
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

scene.add(createTrack());
scene.add(createTrain());
// Import kept for future asset loading
new GLTFLoader();

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
  const railMat = new THREE.MeshStandardMaterial({ color: COLORS.rail });
  const rail1 = new THREE.Mesh(new THREE.TorusGeometry(8, 0.05, 8, 100), railMat);
  rail1.rotation.x = Math.PI / 2;
  const rail2 = new THREE.Mesh(new THREE.TorusGeometry(8.5, 0.05, 8, 100), railMat);
  rail2.rotation.x = Math.PI / 2;
  group.add(rail1, rail2);

  const sleeperGeo = new THREE.BoxGeometry(0.6, 0.1, 0.2);
  const sleeperMat = new THREE.MeshLambertMaterial({ color: COLORS.sleeper });
  const count = 40;
  const sleepers = new THREE.InstancedMesh(sleeperGeo, sleeperMat, count);
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const radius = 8.25;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const matrix = new THREE.Matrix4()
      .makeRotationY(-angle)
      .multiply(new THREE.Matrix4().makeTranslation(x, 0, z));
    sleepers.setMatrixAt(i, matrix);
  }
  sleepers.instanceMatrix.needsUpdate = true;
  sleepers.castShadow = true;
  group.add(sleepers);

  group.position.y = 0.05;
  return group;
}

function createTrain() {
  const group = new THREE.Group();
  const bodyGeo = new THREE.BoxGeometry(1, 0.8, 2);
  const bodyMat = new THREE.MeshLambertMaterial({ color: COLORS.trainRed });
  const loco = new THREE.Mesh(bodyGeo, bodyMat);
  loco.castShadow = true;
  group.add(loco);

  const wagon = new THREE.Mesh(bodyGeo, bodyMat);
  wagon.position.x = -2.2;
  wagon.castShadow = true;
  group.add(wagon);

  group.position.set(8.25, 0.05, 0);
  return group;
}
