import * as THREE from 'three';
import { COLORS } from './uiColors';

const srgb = (hex: number) => new THREE.Color(hex).convertSRGBToLinear();

export function createCliffs() {
  const group = new THREE.Group();
  const geo = new THREE.BoxGeometry(8, 1, 8);
  const mat = new THREE.MeshLambertMaterial({ color: srgb(COLORS.terrain) });
  const terrace1 = new THREE.Mesh(geo, mat);
  terrace1.position.set(12, 0.5, 4);
  terrace1.receiveShadow = true;
  group.add(terrace1);

  const terrace2 = new THREE.Mesh(geo, mat);
  terrace2.scale.set(0.7, 1, 0.7);
  terrace2.position.y = 1.5;
  group.add(terrace2);

  const terrace3 = new THREE.Mesh(geo, mat);
  terrace3.scale.set(0.5, 1, 0.5);
  terrace3.position.y = 2.5;
  group.add(terrace3);

  return group;
}
