import * as THREE from 'three';

export function createLights() {
  const ambient = new THREE.AmbientLight(0xffffff, 0.45);
  const dir = new THREE.DirectionalLight(new THREE.Color(0xffe7d6).convertSRGBToLinear(), 1.0);
  dir.position.set(30, 40, 10);
  dir.castShadow = true;
  dir.shadow.mapSize.set(1024, 1024);
  dir.shadow.bias = -0.0005;
  return { ambient, dir };
}
