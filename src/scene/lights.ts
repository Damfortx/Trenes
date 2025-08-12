import * as THREE from 'three';

export function createLights() {
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  const dir = new THREE.DirectionalLight(0xfff0e0, 0.8);
  dir.position.set(30, 40, 10);
  dir.castShadow = true;
  dir.shadow.mapSize.set(1024, 1024);
  return { ambient, dir };
}
