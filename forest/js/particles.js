/**
 * @file
 * The main scene.
 */

/**
 * Define constants.
 */
const TEXTURE_PATH = 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/123879/';

/**
 * Set our global variables.
 */
var cubeCount = 1600;

var camera,
    scene,
    renderer,
    effect,
    controls,
    element,
    container,
    rotationPoint;

var cubes = [];

document.addEventListener( 'mousemove', onDocumentMouseMove, false );

init();
animate(); 

/**
 * Initializer function.
 */
function init() {
  // Build the container
  container = document.createElement( 'div' );
  document.body.appendChild( container );
  
  // Create the scene.
  scene = new THREE.Scene();
  
  // Create a rotation point.
  rotationPoint = new THREE.Object3D();
  rotationPoint.position.set( 0, 0, 0 );
  scene.add(rotationPoint);
  
    // Create the camera.
  camera = new THREE.PerspectiveCamera(
   50, // Angle
    window.innerWidth / window.innerHeight, // Aspect Ratio.
    1, // Near view.
    23000 // Far view.
  );
  camera.position.z = -200;
  rotationPoint.add( camera );

  // Build the renderer.
  renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } );
  element = renderer.domElement;
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.shadowMap.enabled;
  container.appendChild( element );
  
  // Build the controls.
  controls = new THREE.OrbitControls( camera, element );
  controls.enablePan = true;
  controls.enableZoom = true; 
  controls.maxDistance = 200; 
  controls.minDistance = 200;
  controls.target.copy( new THREE.Vector3( 0, 0, 0 ) );
  
  function setOrientationControls(e) {
    if (!e.alpha) {
     return;
    }

    controls = new THREE.DeviceOrientationControls( camera );
    controls.connect();

    window.removeEventListener('deviceorientation', setOrientationControls, true);
  }
  window.addEventListener('deviceorientation', setOrientationControls, true);
  
  // Ambient lights
  var ambient = new THREE.AmbientLight( 0x555555);
  scene.add( ambient );

  // The sun.
  var light = new THREE.PointLight( 0xffffff, 1, 5000, 0 );
  light.position.set( -4000, 0, 0 );
  scene.add( light );
  
    // The sun.
  var light2 = new THREE.PointLight( 0xaaffff, 1, 500, 0 );
  light2.position.set( 400, 400, 0 );
  scene.add( light2 );
  
  // Add the skymap.
  addSkybox();
  
  // Build a bunch of cubes.
  var counter = cubeCount;
  
  while (counter > 0) {
    buildObject();
    counter--;
  }
  
  window.addEventListener('resize', onWindowResize, false);
}

/**
 * Events to fire upon window resizing.
 */
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

/**
 * Updates to apply to the scene while running.
 */
function update() {
  camera.updateProjectionMatrix();
}

/**
 * Render the scene.
 */
function render() {
  renderer.render(scene, camera);
  
  var timer = 0.0001 * Date.now();
  
  for (var i = 0; i < cubeCount; i++) {
    var cube = cubes[i];
    //cube.rotation.y += 0.005;
    cube.position.x = 200 * Math.cos( timer + i );
    cube.position.y = 200 * Math.sin( timer + i * 1.1);
    //cube.position.z = 200 * Math.cos( timer + i );
  }
  
  //rotationPoint.rotation.y -= 0.0005;
  rotationPoint.rotation.y = Math.sin(timer);
  rotationPoint.rotation.x = Math.cos(timer);
}

/**
 * Animate the scene.
 */
function animate() {
  requestAnimationFrame(animate);
  update();
  render();
}

/**
 * Add the skybox, the stars wrapper.
 */
function addSkybox() {
  var urlPrefix = TEXTURE_PATH;
  var urls = [
    urlPrefix + 'test.jpg',
    urlPrefix + 'test.jpg',
    urlPrefix + 'test.jpg',
    urlPrefix + 'test.jpg',
    urlPrefix + 'test.jpg',
    urlPrefix + 'test.jpg',
  ];

  var loader = new THREE.CubeTextureLoader();
  loader.setCrossOrigin( 'https://s.codepen.io' );
  
  var textureCube = loader.load( urls );
  textureCube.format = THREE.RGBFormat;

  var shader = THREE.ShaderLib[ "cube" ];
  shader.uniforms[ "tCube" ].value = textureCube;

  var material = new THREE.ShaderMaterial( {
    fragmentShader: shader.fragmentShader,
    vertexShader: shader.vertexShader,
    uniforms: shader.uniforms,
    depthWrite: false,
    side: THREE.BackSide
  } );

  var geometry = new THREE.BoxGeometry( 20000, 20000, 20000 );
  var skybox = new THREE.Mesh( geometry, material );
  scene.add( skybox );
}

function onDocumentMouseMove( event ) {
  event.preventDefault();
}

/**
 * Build the object.
 */
function buildObject() {
  
  var timer = 0.0001 * Date.now();
  var randNum = Math.floor(Math.random() * (5 - 1) + 1);
  
  var color = 0x999999;
  var multiplier = 1;
  if (randNum == 4) {
    color = 0x999999;
    multiplier = -1;
  } else if (randNum == 3) {
    color = 0x990099;
    multiplier = 1;
  } else if (randNum == 2) {
    color = 0x990000;
    multiplier = -1;
  } else if (randNum == 1) {
    color = 0x000099;
    multiplier = 1;
  } 
  
  //var geometry = new THREE.BoxGeometry( 2, 2, 2 );
  var geometry =  new THREE.SphereGeometry( 2, 8, 8 );
  var material = new THREE.MeshPhongMaterial( {color: color, emissive: color} );
  var cube = new THREE.Mesh( geometry, material );
  
  // Set initial position.
  cube.position.x = ( Math.random() - 0.5 ) * 400;
  cube.position.y = ( Math.random() - 0.5 ) * 400;
  cube.position.z = ( Math.random() - 0.5 ) * 400;
  
  // Set initial rotation.
  cube.scale.x = cube.scale.y = cube.scale.z = Math.random() * 0.5 + 0.1;
  scene.add( cube );
  cubes.push( cube );
}
