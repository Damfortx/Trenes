import * as THREE from 'three';
import { COLORS } from './uiColors';

const srgb = (hex: number) => new THREE.Color(hex).convertSRGBToLinear();

export function createWater() {
  const geometry = new THREE.PlaneGeometry(6, 4, 1, 1);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 2;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#A6FBFF';
  ctx.fillRect(0, 0, 2, 2);
  ctx.fillStyle = '#9fe0e5';
  ctx.fillRect(0, 0, 1, 1);
  ctx.fillRect(1, 1, 1, 1);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  const material = new THREE.MeshStandardMaterial({ color: srgb(COLORS.water), transparent: true, opacity: 0.9, map: texture });
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
    texture.offset.set(t * 0.00005, t * 0.00007);
  };

  return { mesh, animate };
}
