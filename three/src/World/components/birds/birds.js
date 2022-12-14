import { GLTFLoader } from '../../../../vendor/three/examples/jsm/loaders/GLTFLoader.js';
import { Vector3 } from '../../../../vendor/three/build/three.module.js';
import { setupModel } from './setupModel.js';

async function loadBirds() {
  const loader = new GLTFLoader();

  const [parrotData, flamingoData, storkData] = await Promise.all([
    loader.loadAsync('/three/assets/models/Parrot.glb'),
    loader.loadAsync('/three/assets/models/Flamingo.glb'),
    loader.loadAsync('/three/assets/models/Stork.glb'),
  ]);

  console.log('Squaaawk!', parrotData);

  const parrot = setupModel(parrotData);
  const flamingo = setupModel(flamingoData);
  const stork = setupModel(storkData);

  const front = new Vector3( 0, 0, 2.5 );
  const left = new Vector3( 7.5, 0, -10 );
  const back = new Vector3( 0, -2.5, -10 );

  parrot.position.copy(front);
  flamingo.position.copy(left);
  stork.position.copy(back);
  
  return { parrot, flamingo, stork, }
}

export { loadBirds };