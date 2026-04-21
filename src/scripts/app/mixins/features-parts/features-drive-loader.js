import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const orionDriveCarColormapUrl = new URL('../../../../Assets/NymoDrive/Сar-kit/Models/GLB format/Textures/colormap.png', import.meta.url).href;

function createOrionDriveGltfLoader() {
  const manager = new THREE.LoadingManager();
  manager.setURLModifier((url) => {
    const safeUrl = String(url || '').trim();
    if (!safeUrl) return safeUrl;
    if (/Textures\/colormap\.png(?:[?#].*)?$/i.test(safeUrl)) {
      return orionDriveCarColormapUrl;
    }
    return safeUrl;
  });
  return new GLTFLoader(manager);
}

export {
  createOrionDriveGltfLoader
};
