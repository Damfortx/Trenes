// src/scene/ground.ts
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const srgb = (hex: number | string) => new THREE.Color(hex as any).convertSRGBToLinear();

// Dimensiones “tablero” (no cambies: otros módulos asumen esto)
const WIDTH = 32;
const DEPTH = 24;
const BASE_H = 1;

export function createGround() {
  const group = new THREE.Group();

  // Base inferior (bisel gris) para el look diorama
  const baseGeo = new THREE.BoxGeometry(WIDTH + 2, BASE_H, DEPTH + 2);
  const baseMat = new THREE.MeshStandardMaterial({
    color: srgb(0xdad9d6),
    metalness: 0,
    roughness: 0.9,
  });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = -BASE_H / 2;
  base.receiveShadow = true;
  group.add(base);

  // Terreno del Kenney Nature Kit (verde con textura/material del pack)
  const loader = new GLTFLoader();
  loader.load('/assets/nature/platform_grass.glb', (gltf) => {
    const mesh = gltf.scene;
    // Asegura sRGB para cualquier textura encontrada
    mesh.traverse((o: any) => {
      if (o.isMesh) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          const mat = m as THREE.MeshStandardMaterial;
          if (mat.map) {
            mat.map.colorSpace = THREE.SRGBColorSpace;
            mat.map.anisotropy = 4;
          }
        }
        o.castShadow = false;
        o.receiveShadow = true;
      }
    });

    // Normaliza a WIDTH×DEPTH
    mesh.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(mesh);
    const size = box.getSize(new THREE.Vector3());
    const sx = WIDTH / (size.x || 1);
    const sz = DEPTH / (size.z || 1);
    mesh.scale.set(sx, 1, sz);
    mesh.position.y = 0; // apoyado sobre la base
    group.add(mesh);
  });

  return group;
}

// Exporta dimensiones para otros módulos si lo necesitas en el futuro
export const GROUND_SIZE = { width: WIDTH, depth: DEPTH };
