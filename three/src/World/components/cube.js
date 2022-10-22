import {
  BoxGeometry, CapsuleGeometry, CircleGeometry, ConeGeometry, CylinderGeometry, DodecahedronGeometry,
  EdgesGeometry, ExtrudeGeometry, IcosahedronGeometry, LatheGeometry, OctahedronGeometry, PlaneGeometry, PolyhedronGeometry, RingGeometry,
  ShapeGeometry, SphereGeometry, TetrahedronGeometry, TorusGeometry, TorusKnotGeometry, TubeGeometry, WireframeGeometry,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  TextureLoader,
 } from '../../../vendor/three/build/three.module.js';

function createMaterial(color) {
  // create a texture loader.
  const textureLoader = new TextureLoader();

  // load a texture
  const texture_col = textureLoader.load(
    '../../../assets/textures/uv-test-col.png'
  );
  const texture_bw = textureLoader.load(
    '../../../assets/textures/uv-test-bw.png',
  );

  // create a "standard" material
  // the texture we just loaded as a color map
  const material = new MeshStandardMaterial({
    alphaMap: texture_col,
    map: texture_bw,
    transparent: true,
    color: color
  });

  return material;
}

function createCube(w = 1, h = 1, d = 1, color = 'orchid', x = 0, y = 0, z = 0, rx = -45, ry = -20, rz = 30) {
  // create a geometry
  const geometry = new BoxGeometry();//w , h, d);

  const material = createMaterial(color);

  // create a Mesh containing the geometry and material
  const cube = new Mesh(geometry, material);

  cube.position.set(x, y, z);
  cube.rotation.set(MathUtils.degToRad(rx), MathUtils.degToRad(ry), MathUtils.degToRad(rz));

  const radiansPerSecond = MathUtils.degToRad(30);

  // this method will be called once per frame
  cube.tick = (delta) => {
    // increase the cube's rotation each frame
    cube.rotation.z += delta * radiansPerSecond;
    cube.rotation.x += delta * radiansPerSecond;
    cube.rotation.y += delta * radiansPerSecond;
  };

  return cube;
}

export { createCube };