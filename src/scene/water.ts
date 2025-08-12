import * as THREE from 'three';
import { COLORS } from './uiColors';

export function createWater() {
  const geometry = new THREE.PlaneGeometry(6, 4, 1, 1);
  const material = new THREE.MeshStandardMaterial({ color: COLORS.water, transparent: true, opacity: 0.9 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  let x = 0, z = 0;
  do {
    x = Math.random() * 24 - 12;
    z = Math.random() * 16 - 8;
  } while (Math.hypot(x, z) < 4);
  mesh.position.set(x, 0.02, z);
  mesh.receiveShadow = true;

  const animate = (t: number) => {
    mesh.material.opacity = 0.9 + Math.sin(t * 0.001) * 0.02;
  };

  return { mesh, animate };
}
