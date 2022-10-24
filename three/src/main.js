import { World } from './World/World.js';

async function main() {
  // Get a reference to the container element
  const container = document.querySelector('#scene-container');
  
  // Create a new world
  const world = new World(container);
  
  // Complete async tasks
  await world.init();

  world.start();

  const switch_focus = document.getElementById("switch-focus");
  switch_focus.addEventListener("click", function() {
    world.focusNext();
  });
}

// call main to start the app
main().catch((err) => {
  console.error(err);
});
