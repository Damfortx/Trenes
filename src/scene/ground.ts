import * as THREE from 'three';
import { COLORS } from './uiColors';

export function createGround() {
  const width = 32;
  const depth = 24;
  const baseHeight = 1;
  const group = new THREE.Group();

  const baseGeo = new THREE.BoxGeometry(width + 2, baseHeight, depth + 2);
  const baseMat = new THREE.MeshLambertMaterial({ color: COLORS.terrain });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = -baseHeight / 2;
  base.receiveShadow = true;
  group.add(base);

  const geo = new THREE.PlaneGeometry(width, depth, 32, 24);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const y = (Math.random() - 0.5) * 0.3;
    pos.setY(i, y);
  }
  geo.computeVertexNormals();
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshLambertMaterial({ color: COLORS.grass });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  group.add(mesh);

  return group;
}
