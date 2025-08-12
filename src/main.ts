import * as THREE from 'three';
import { createCamera } from './scene/camera';
import { createLights } from './scene/lights';
import { createGround } from './scene/ground';
import { createWater } from './scene/water';
import { createCliffs } from './scene/cliffs';
import { createForest } from './scene/forest';
import { createRails } from './scene/rails';
import { createTrain } from './scene/train';

const srgb = (hex: number | string) => new THREE.Color(hex as any).convertSRGBToLinear();

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

document.getElementById('app')!.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = srgb(0xf6f6f2);
scene.fog = new THREE.Fog(srgb(0xf6f6f2), 55, 100);

const { camera, controls } = createCamera(renderer);
const { ambient, hemi, dir } = createLights();
scene.add(ambient, hemi, dir);

const ground = createGround();
scene.add(ground);

const water = createWater();
scene.add(water.mesh);

const cliffs = createCliffs();
scene.add(cliffs);

const forest = createForest();
scene.add(forest);

const rails = createRails();
scene.add(rails);

const train = createTrain();
scene.add(train);

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
