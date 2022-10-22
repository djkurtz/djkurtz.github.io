import { OrbitControls } from '../../../vendor/three/examples/jsm/controls/OrbitControls.js';

function createControls(camera, canvas) {
  const controls = new OrbitControls(camera, canvas);

  return controls;
}

export { createControls };
