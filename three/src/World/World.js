import { loadBirds } from './components/birds/birds.js';
import { createCamera } from './components/camera.js';
import {
  createAxesHelper,
  createGridHelper,
} from './components/helpers.js';
import { createLights } from './components/lights.js';
import { createScene } from './components/scene.js';
import { Train } from './components/Train/Train.js';

import { createControls } from './systems/controls.js';
import { createRenderer } from './systems/renderer.js';
import { Resizer } from './systems/Resizer.js';
import { Loop } from './systems/Loop.js';

let camera;
let renderer;
let scene;
let loop;
let controls;

let focus_points = [];
let focus_select = 0;

class World {
  constructor(container) {
    camera = createCamera();
    scene = createScene();
    renderer = createRenderer();
    loop = new Loop(camera, scene, renderer);
    container.append(renderer.domElement);
    controls = createControls(camera, renderer.domElement);

    const { ambientLight, mainLight } = createLights();

    loop.updatables.push(controls);
    scene.add(ambientLight, mainLight);

/*
    const trainProto = new Train();      
    loop.updatables.push(trainProto);
    scene.add(trainProto);
    scene.add(createAxesHelper(), createGridHelper());
*/

    const resizer = new Resizer(container, camera, renderer);

  }

  
  async init() {
    const { parrot, flamingo, stork } = await loadBirds();

    scene.add(parrot, flamingo, stork);
    loop.updatables.push(parrot, flamingo, stork);

    // move the target to the center of the front bird
    focus_points.push(controls.target.clone(), stork.position, parrot.position, flamingo.position);
  }

  render() {
    renderer.render(scene, camera);
  }

  start() {
    loop.start();
  }

  stop() {
    loop.stop();
  }
  
  focusNext() {
    focus_select = (focus_select + 1) % focus_points.length;
    controls.target.copy(focus_points[focus_select].clone());
  }
}

export { World };