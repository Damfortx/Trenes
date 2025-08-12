import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function createCamera(renderer: THREE.WebGLRenderer) {
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(25, 25, 25);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.minDistance = 12;
  controls.maxDistance = 50;
  controls.maxPolarAngle = Math.PI * 0.45;
  const bounds = new THREE.Box3(new THREE.Vector3(-16, -Infinity, -12), new THREE.Vector3(16, Infinity, 12));
  controls.addEventListener('change', () => {
    controls.target.x = THREE.MathUtils.clamp(controls.target.x, bounds.min.x, bounds.max.x);
    controls.target.z = THREE.MathUtils.clamp(controls.target.z, bounds.min.z, bounds.max.z);
  });
  return { camera, controls };
}
