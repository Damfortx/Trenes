import * as THREE from 'three';

export function createLights() {
  const ambient = new THREE.AmbientLight(0xffffff, 0.45);
  const hemi = new THREE.HemisphereLight(0xfdf7e8, 0xcbd3d0, 0.25);

  const dir = new THREE.DirectionalLight(0xffffff, 1.0);
  dir.position.set(20, 30, 15);
  dir.castShadow = true;
  dir.shadow.mapSize.set(2048, 2048);
  dir.shadow.bias = -0.00015;
  const cam = dir.shadow.camera as THREE.OrthographicCamera;
  cam.left = cam.bottom = -40;
  cam.right = cam.top = 40;
  cam.updateProjectionMatrix();

  return { ambient, hemi, dir };
}
