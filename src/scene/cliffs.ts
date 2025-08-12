import * as THREE from 'three';
import { COLORS } from './uiColors';

export function createCliffs() {
  const group = new THREE.Group();
  const terrace1 = new THREE.Mesh(
    new THREE.BoxGeometry(8, 1, 8),
    new THREE.MeshLambertMaterial({ color: COLORS.terrain })
  );
  terrace1.position.set(12, 0.5, 4);
  terrace1.receiveShadow = true;
  group.add(terrace1);

  const terrace2 = terrace1.clone();
  terrace2.scale.set(0.7, 1, 0.7);
  terrace2.position.y = 1.5;
  group.add(terrace2);

  return group;
}
