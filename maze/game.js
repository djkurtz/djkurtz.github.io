const config = {
  cell: {
    size: 32,
    border: {
      thickness: 1,
      color: 0x888888,
    },
  },
  dead_color: 0x000000,
  alive_color: 0xffffff,
  border: {
    menu: 20,
    min: 10,
  },
  interval: {
    range: [ 0, 15, 25, 50, 100, 250, 500, 1000, 2000 ],
    start_idx: 4,
  },
  start_live_chance: 0.5,
};

const states = [
  { n: false, w: false, e: false, s: false },
  { n: true,  w: false, e: false, s: false },
  { n: false, w: true,  e: false, s: false },
  { n: true,  w: true,  e: false, s: false },
  { n: false, w: false, e: true,  s: false },
  { n: true,  w: false, e: true,  s: false },
  { n: false, w: true,  e: true,  s: false },
  { n: true,  w: true,  e: true,  s: false },
  { n: false, w: false, e: false, s: true },
  { n: true,  w: false, e: false, s: true },
  { n: false, w: true,  e: false, s: true },
  { n: true,  w: true,  e: false, s: true },
  { n: false, w: false, e: true,  s: true },
  { n: true,  w: false, e: true,  s: true },
  { n: false, w: true,  e: true,  s: true },
  { n: true,  w: true,  e: true,  s: true },
];

function state_to_idx(state) {
  return (state.s ? 8 : 0) + (state.e ? 4 : 0) + (state.w ? 2 : 0) + (state.n ? 1 : 0);
}

function to_state(north, west, east, south) {
  return { n: north, w: west, e: east, s: south };
}

class Cell extends Phaser.GameObjects.Sprite
{
  constructor (world, x, y, size) {
    super(world.scene, x * size, y * size, 'walls');

    this.world = world;
    this.coord = { x: x, y: y };
    this.state = states[0];

    this.visited = false;

    this.setOrigin(0);
    this.setDisplaySize(size, size);
    //this.setInteractive();
    //this.on('pointerdown', function () { this.toggle_state(); });

    world.scene.add.existing(this);
  }

  update() {
    this.setFrame(state_to_idx(this.state));
  }

  set_state(state) {
    this.state = to_state(state.n, state.w, state.e, state.s);
    this.update();
  }

  north() {
    return this.state.n;
  }

  west() {
    return this.state.w;
  }

  east() {
    return this.state.e;
  }

  south() {
    return this.state.s;
  }

  open_n() {
    this.set_state(to_state(true, this.state.w, this.state.e, this.state.s));
  }
  open_w() {
    this.set_state(to_state(this.state.n, true, this.state.e, this.state.s));
  }
  open_e() {
    this.set_state(to_state(this.state.n, this.state.w, true, this.state.s));
  }
  open_s() {
    this.set_state(to_state(this.state.n, this.state.w, this.state.e, true));
  }
}

class Guy extends Phaser.GameObjects.Sprite
{
  constructor (world, x, y, size) {
    super(world.scene, x * size, y * size, 'guy');

    this.world = world;
    this.size = size;
    this.coord = { x: x, y: y };

    this.setOrigin(0);
    this.setDisplaySize(size, size);
    this.setDepth(1);
    //this.setInteractive();
    //this.on('pointerdown', function () { this.toggle_state(); });

    world.scene.add.existing(this);
  }

  set_pos(x, y) {
    this.coord = { x: x, y: y };
    this.setPosition(x * this.size, y * this.size);
  }

  set_random(Nx, Ny) {
    const x = Math.round(Math.random() * (Nx - 1));
    const y = Math.round(Math.random() * (Ny - 1));
    this.set_pos(x, y);
  }
}

class Door extends Phaser.GameObjects.Sprite
{
  constructor (world, x, y, size) {
    super(world.scene, x * size, y * size, 'door');

    this.world = world;
    this.size = size;
    this.coord = { x: x, y: y };

    this.setOrigin(0);
    this.setDisplaySize(size, size);
    //this.setInteractive();
    //this.on('pointerdown', function () { this.toggle_state(); });

    world.scene.add.existing(this);
  }

  set_pos(x, y) {
    this.coord = { x: x, y: y };
    this.setPosition(x * this.size, y * this.size);
  }

  set_random(Nx, Ny) {
    const x = Math.round(Math.random() * (Nx - 1));
    const y = Math.round(Math.random() * (Ny - 1));
    this.set_pos(x, y);
  }
}

class World extends Phaser.GameObjects.Container
{
  constructor (scene, world_min_x, world_min_y, world_max_width, world_max_height) {
    const Nx = Math.floor(world_max_width / config.cell.size);
    const Ny = Math.floor(world_max_height / config.cell.size);

    const world_width = Nx * config.cell.size;
    const world_height = Ny * config.cell.size;

    const world_x = world_min_x + Math.floor((world_max_width - world_width) / 2);
    const world_y = world_min_y + Math.floor((world_max_height - world_height) / 2);

    super(scene, world_x, world_y);

    this.Nx = Nx;
    this.Ny = Ny;

    this.pause = true;
    this.level = 1;

    // Initialize cells
    this.cells = new Array(this.Ny);
    for (let y = 0; y < this.Ny; y++) {
      this.cells[y] = new Array(this.Nx);
      for (let x = 0; x < this.Nx; x++) {
        this.cells[y][x] = new Cell(this, x, y, config.cell.size);
        this.add(this.cells[y][x]);
      }
    }

    this.door = new Door(this, 1, 1, config.cell.size);
    this.add(this.door);

    this.guy = new Guy(this, 0, 0, config.cell.size);
    this.add(this.guy);

    scene.add.existing(this);
  }

  clear() {
    this.pause = true;
    this.cells.forEach(row => row.forEach(cell => {
        cell.set_state(states[0]);
        cell.visited = false;
        cell.tint = 0xffffff;
    }));
  }

  randomize() {
    this.clear();
    let stack = [];

    stack.push(this.cells[0][0]);

    while (stack.length > 0) {
      const c = stack.pop();

      let unvisited = [];
      const x = c.coord.x;
      const y = c.coord.y;
      if (x > 0           && !this.cells[y][x - 1].visited) { unvisited.push('w') }
      if (x < this.Nx - 1 && !this.cells[y][x + 1].visited) { unvisited.push('e') }
      if (y > 0           && !this.cells[y - 1][x].visited) { unvisited.push('n') }
      if (y < this.Ny - 1 && !this.cells[y + 1][x].visited) { unvisited.push('s') }

      if (unvisited.length == 0)
        continue;

      const r = Math.round(Math.random() * (unvisited.length - 1));
      const dir = unvisited[r];

      let n;
      switch(dir) {
        case 'w': n = this.cells[y][x - 1]; c.open_w(); n.open_e(); break;
        case 'e': n = this.cells[y][x + 1]; c.open_e(); n.open_w(); break; 
        case 'n': n = this.cells[y - 1][x]; c.open_n(); n.open_s(); break; 
        case 's': n = this.cells[y + 1][x]; c.open_s(); n.open_n(); break; 
      }

      n.visited = true;
      stack.push(c);
      stack.push(n);
    }

    this.door.set_random(this.Nx, this.Ny);
//  this.guy.set_random(this.Nx, this.Ny);
//    this.door.set_pos(0, 0);
//    this.guy.set_pos(1, 1);
    this.guy.setVisible(true);

    this.pause = false;
  }

  guy_north() {
    let p = this.guy.coord;
    if (this.cells[p.y][p.x].north())
      this.guy.set_pos(p.x, p.y - 1);
  }

  guy_south() {
    let p = this.guy.coord;
    if (this.cells[p.y][p.x].south())
      this.guy.set_pos(p.x, p.y + 1);
  }

  guy_west() {
    let p = this.guy.coord;
    if (this.cells[p.y][p.x].west())
      this.guy.set_pos(p.x - 1, p.y);
  }

  guy_east() {
    let p = this.guy.coord;
    if (this.cells[p.y][p.x].east())
      this.guy.set_pos(p.x + 1, p.y);
  }

  update() {
    this.cells[this.guy.coord.y][this.guy.coord.x].tint = 0xcccccc;
    if (this.guy.coord.x === this.door.coord.x && this.guy.coord.y === this.door.coord.y) {
      this.pause = true;
      this.door.play("door_open").once('animationcomplete', () => {
          this.level += 1;
          this.guy.setVisible(false);
          this.door.playReverse("door_open").once('animationcomplete', () => {
              this.randomize();
              this.pause = false;
          });
      }, this);

    }
  }
}

class Game extends Phaser.Scene
{
  constructor () {
    super('game');

    this.cells;
  }

  preload () {
    this.load.setPath('assets/img/');
    this.load.image('guy', 'guy.png');
    this.load.spritesheet('walls', 'walls.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('door', 'door.png', { frameWidth: 32, frameHeight: 32 });
  }

  create () {
    const world_min_x = config.border.min;
    const world_min_y = config.border.menu + config.border.min;
    const world_max_width = this.cameras.main.width - 2 * config.border.min;
    const world_max_height = this.cameras.main.height - 2 * config.border.min - config.border.menu;

    this.cursors = this.input.keyboard.createCursorKeys();

    this.input.keyboard.on('keydown-C', function(event) { this.clear(); }, this);
    this.input.keyboard.on('keydown-R', function(event) { this.randomize(); }, this);

    // Initialize cells
    this.world = new World(this, world_min_x, world_min_y, world_max_width, world_max_height);
    this.world.randomize();

    const doorOpenAnimation = this.anims.create({
      key: 'door_open',
      frames: this.anims.generateFrameNumbers('door'),
      frameRate: 6,
    });

    this.level_text = this.add.text(10, 10, 'Level: ' + this.world.level,
      { font: '20px Arial', fill: '#ffffff' });
  }

  clear() {
    this.world.clear();
  }

  randomize() {
    this.world.randomize();
  }

  update ( time, delta ) {
    if (this.world.pause)
      return;

    this.world.update();

    this.level_text.setText('Level: ' + this.world.level);

    if (this.input.keyboard.checkDown(this.cursors.left, 250)) {
      this.world.guy_west();
    }

    if (this.input.keyboard.checkDown(this.cursors.right, 250)) {
      this.world.guy_east();
    }

    if (this.input.keyboard.checkDown(this.cursors.up, 250)) {
      this.world.guy_north();
    }

    if (this.input.keyboard.checkDown(this.cursors.down, 250)) {
      this.world.guy_south();
    }
  }
}

const phaser_config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#404040',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  antialias: false,
  pixelArt: true,
  scene: [ Game ],
};

let game = new Phaser.Game(phaser_config);