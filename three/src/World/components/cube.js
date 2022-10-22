import { BoxGeometry, MathUtils, Mesh, MeshStandardMaterial } from '../../../vendor/three/build/three.module.js';

function createCube(w = 1, h = 1, d = 1, color = 'orchid', x = 0, y = 0, z = 0, rx = -45, ry = -20, rz = 30) {
  // create a geometry
  const geometry = new BoxGeometry(w, h, d);

  // Switch the old "basic" material to
  // a physically correct "standard" material
  const material = new MeshStandardMaterial({ color: color });

  // create a Mesh containing the geometry and material
  const cube = new Mesh(geometry, material);

  cube.position.set(x, y, z);
  cube.rotation.set(MathUtils.degToRad(rx), MathUtils.degToRad(ry), MathUtils.degToRad(rz));

  return cube;
}

export { createCube };