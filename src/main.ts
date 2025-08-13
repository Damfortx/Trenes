// src/main.ts
import * as THREE from 'three';
import { createCamera } from './scene/camera';
import { createLights } from './scene/lights';
import { createGround } from './scene/ground';
import { createForest } from './scene/forest';
import { createRails } from './scene/rails';
import { createTrain } from './scene/train';
import { createWater } from './scene/water';
import { enableTrackEditor } from './ui/trackEditor';
import { RAIL_UNIT } from './scene/rails';

const srgb = (hex: number | string) => new THREE.Color(hex as any).convertSRGBToLinear();

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
 
document.getElementById('app')!.appendChild(renderer.domElement);

const scene = new THREE.Scene();

scene.background = srgb(0xf6f6f2);
scene.fog = new THREE.Fog(srgb(0xf6f6f2), 55, 100);

const { camera, controls } = createCamera(renderer);
const { ambient, hemi, dir } = createLights();
scene.add(ambient, hemi, dir);

// Terreno con asset (verde original)
const ground = createGround();
scene.add(ground);

// Agua igual que antes
const water = createWater();
scene.add(water.mesh);

// Vegetación/rocas con materiales originales
scene.add(createForest());

// Vías y tren
const rails = createRails();
 
scene.add(rails.group);
// Paleta + editor de colocación de vías (snap a rejilla del módulo)
enableTrackEditor({
  scene,
  camera,
  renderer,
  grid: { step: RAIL_UNIT, y: rails.railHeight }
});

const spawn = rails.getSpawnPose();
const train = createTrain({
  random: true,
  pose: { position: spawn.position, yaw: spawn.yaw, railY: rails.railHeight },
  carLength: rails.chordLen * 0.9, // ligeramente más corto que la cuerda de vía
});
scene.add(train);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate(t: number) {
  requestAnimationFrame(animate);
  water.animate(t);
  controls.update();
  renderer.render(scene, camera);
}
animate(0);
