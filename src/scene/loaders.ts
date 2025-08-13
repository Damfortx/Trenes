import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function railsLoader() {
  const l = new GLTFLoader();
  // Las texturas de los GLB del Train Kit se resuelven relativo a esta carpeta:
  l.setPath('/assets/rails/');          // para los .glb
  l.setResourcePath('/assets/rails/');  // para dependencias tipo "Textures/colormap.png"
  return l;
}

export function natureLoader() {
  const l = new GLTFLoader();
  l.setPath('/assets/nature/');
  l.setResourcePath('/assets/nature/');
  return l;
}
