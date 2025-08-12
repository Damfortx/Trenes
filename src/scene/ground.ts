import * as THREE from 'three';
import { COLORS } from './uiColors';

const srgb = (hex: number | string) => new THREE.Color(hex as any).convertSRGBToLinear();

export function createGround() {
  const width = 32;
  const depth = 24;
  const baseHeight = 1;
  const group = new THREE.Group();

  const baseGeo = new THREE.BoxGeometry(width + 2, baseHeight, depth + 2);
  const baseMat = new THREE.MeshStandardMaterial({
    color: srgb(COLORS.terrain), metalness: 0, roughness: 0.85,
  });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = -baseHeight / 2;
  base.receiveShadow = true;
  group.add(base);

  const geo = new THREE.PlaneGeometry(width, depth, 32, 24);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const y = (Math.random() - 0.5) * 0.05;
    pos.setY(i, y);
  }
  geo.computeVertexNormals();
  geo.rotateX(-Math.PI / 2);
// scene/ground.ts (dentro de createGround, tras crear el geo y antes del material)
function tinyGrassTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 4;
  const ctx = c.getContext('2d')!;
  // parches suaves
  const g1 = '#e8fab5', g2 = '#dff6a1', g3 = '#e4f9b0';
  ctx.fillStyle = g1; ctx.fillRect(0,0,4,4);
  ctx.fillStyle = g2; ctx.fillRect(0,0,2,2);
  ctx.fillStyle = g3; ctx.fillRect(2,2,2,2);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 12); // tablero 32×24 -> 2 texels por unidad
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const mat = new THREE.MeshStandardMaterial({
  color: srgb(0xDFF6A1),
  metalness: 0,
  roughness: 0.85,
  map: tinyGrassTexture(),   // << añade variación sutil
});

  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  group.add(mesh);

  return group;
}
