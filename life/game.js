const State = Object.freeze({
  dead: 0,
  alive: 1,
});

const Rules = Object.freeze({
  b3s23: {
    name: 'b3s23',
    b: [ 3 ],
    s: [ 2, 3 ],
  },
  b3s1234: {
    name: 'b3s1234',
    b: [ 3 ],
    s: [ 1, 2, 3, 4 ],
  },
  b3s12345: {
    name: 'b3s12345',
    b: [ 3 ],
    s: [ 1, 2, 3, 4, 5 ],
  },
});

const config = {
  cell: {
    size: 20,
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
  rule: Rules.b3s23,
};

class Cell extends Phaser.GameObjects.Rectangle
{
  constructor (world, x, y, width, height) {
    super(world.scene, x * width, y * width, width, height, config.dead_color);

    this.world = world;
    this.neighbors;

    this.setOrigin(0);
    this.setInteractive();
    this.on('pointerdown', function () { this.toggle_state(); });

    this.setStrokeStyle(config.cell.border.thickness, config.cell.border.color);
    this.state = State.dead;
//    this.set_dead();

    world.scene.add.existing(this);
  }

  set_dead() {
    this.state = State.dead;
    this.setFillStyle(config.dead_color);
  }

  set_alive() {
    this.state = State.alive;
    this.setFillStyle(config.alive_color);
  }

  is_alive() {
    switch (this.state) {
      case State.dead: { return false; }
      case State.alive: { return true; }
    }
  }

  toggle_state() {
    switch (this.state) {
      case State.dead: { this.set_alive(); break; }
      case State.alive: { this.set_dead(); break; }
    }
  }

  set_neighbors(neighbors) {
    this.neighbors = neighbors;
  }

  compute_next_state(rule) {
    let sum = 0;
    this.neighbors.forEach(n => { if (n.is_alive()) sum += 1; });
    if (!this.is_alive())
      this.next_state = rule.b.includes(sum) ? State.alive : State.dead;
    else
      this.next_state = rule.s.includes(sum) ? State.alive : State.dead;
  }

  update_state() {
    switch (this.next_state) {
      case State.alive: this.set_alive(); break;
      case State.dead: this.set_dead(); break;
    }
  }
}

class World extends Phaser.GameObjects.Container
{
  constructor (scene, world_min_x, world_min_y, world_max_width, world_max_height,
               rule = Rules.b3s23) {
    const Nx = Math.floor(world_max_width / config.cell.size);
    const Ny = Math.floor(world_max_height / config.cell.size);

    const world_width = Nx * config.cell.size;
    const world_height = Ny * config.cell.size;

    const world_x = world_min_x + Math.floor((world_max_width - world_width) / 2);
    const world_y = world_min_y + Math.floor((world_max_height - world_height) / 2);

    super(scene, world_x, world_y);

    this.rule = rule;
    
    this.Nx = Nx;
    this.Ny = Ny;

    // Initialize cells
    this.cells = new Array(this.Ny);
    for (let y = 0; y < this.Ny; y++) {
      this.cells[y] = new Array(this.Nx);
      for (let x = 0; x < this.Nx; x++) {
        this.cells[y][x] = new Cell(this, x, y, config.cell.size, config.cell.size);
        this.add(this.cells[y][x]);
      }
    }

    for (let y = 0; y < this.Ny; y++) {
      for (let x = 0; x < this.Nx; x++) {
        this.cells[y][x].set_neighbors([
          this.cells[(y - 1 + this.Ny) % this.Ny][(x - 1 + this.Nx) % this.Nx],
          this.cells[(y + 0 + this.Ny) % this.Ny][(x - 1 + this.Nx) % this.Nx],
          this.cells[(y + 1 + this.Ny) % this.Ny][(x - 1 + this.Nx) % this.Nx],
          this.cells[(y - 1 + this.Ny) % this.Ny][(x - 0 + this.Nx) % this.Nx],
          this.cells[(y + 1 + this.Ny) % this.Ny][(x - 0 + this.Nx) % this.Nx],
          this.cells[(y - 1 + this.Ny) % this.Ny][(x + 1 + this.Nx) % this.Nx],
          this.cells[(y + 0 + this.Ny) % this.Ny][(x + 1 + this.Nx) % this.Nx],
          this.cells[(y + 1 + this.Ny) % this.Ny][(x + 1 + this.Nx) % this.Nx]
        ]);
      }
    }

    scene.add.existing(this);
  }

  clear() {
    this.cells.forEach(row => row.forEach(cell => cell.set_dead()));
  }

  randomize(live_chance) {
    this.cells.forEach(row => row.forEach(cell => { 
      const r = Math.random();
      if (r <= live_chance) { cell.set_alive(); }
      else { cell.set_dead(); }
    }));
  }

  update_cells() {
    this.cells.forEach(row => row.forEach(cell => cell.compute_next_state(this.rule)));
    this.cells.forEach(row => row.forEach(cell => cell.update_state()));
  }

  get_population() {
    let population = 0;
    for (let y = 0; y < this.Ny; y++) {
      for (let x = 0; x < this.Nx; x++) {
        if (this.cells[y][x].is_alive()) {
          population += 1;
        }
      }
    }
    return population;
  }

  set_rule(rule) {
    this.rule = rule;
  }
}

class Game extends Phaser.Scene
{
  constructor () {
    super('game');

    this.cells;
    this.prev_tick = 0;
    this.ticks = 0;
    this.interval_idx = config.interval.start_idx;
    this.population = 0;
    this.live_chance = config.start_live_chance;

    this.run = false;
  }

  create () {
    this.tick_text = this.add.text(10, 10, 'Ticks: ' + this.ticks,
        { font: '14px Arial Black', fill: '#ffffff' });
    this.interval_text = this.add.text(210, 10, 'Interval: ' + this.interval_get() + ' ms',
        { font: '14px Arial Black', fill: '#ffffff' });
    this.population_text = this.add.text(410, 10, 'Population: 0',
        { font: '14px Arial Black', fill: '#ffffff' });
    this.rule_text = this.add.text(610, 10, 'Rule: ' + config.rule.name,
        { font: '14px Arial Black', fill: '#ffffff' });
    this.pause_text = this.add.text(810, 10, 'PAUSED',
        { font: '14px Arial Black', fill: '#ffffff', backgroundColor: '#ff0000' }).setVisible(false);

    const world_min_x = config.border.min;
    const world_min_y = config.border.menu + config.border.min;
    const world_max_width = this.cameras.main.width - 2 * config.border.min;
    const world_max_height = this.cameras.main.height - 2 * config.border.min - config.border.menu;

    this.input.keyboard.on('keydown-UP', function(event) { this.interval_dec(); }, this);
    this.input.keyboard.on('keydown-DOWN', function(event) { this.interval_inc(); }, this);

    this.input.keyboard.on('keydown-S', function(event) { this.toggle(); }, this);
    this.input.keyboard.on('keydown-C', function(event) { this.clear(); }, this);
    this.input.keyboard.on('keydown-R', function(event) { this.randomize(); }, this);

    this.input.keyboard.on('keydown-ONE', function(event) { this.set_rule(Rules.b3s23); }, this);
    this.input.keyboard.on('keydown-TWO', function(event) { this.set_rule(Rules.b3s1234); }, this);
    this.input.keyboard.on('keydown-THREE', function(event) { this.set_rule(Rules.b3s12345); }, this);

    // Initialize cells
    this.world = new World(this, world_min_x, world_min_y, world_max_width, world_max_height);
    this.randomize();
    this.start();
  }

  set_rule(rule) {
    if (!Rules.includes(rule))
      return;
    this.rule_text.setText('Rule: ' + rule.name);
    this.world.set_rule(rule);
  }

  clear() {
    this.stop();
    this.ticks = 0;
    this.world.clear();
    this.population_text.setText('Population: ' + this.world.get_population());
  }

  randomize() {
    this.stop();
    this.ticks = 0;
    this.world.randomize(this.live_chance);
    this.population_text.setText('Population: ' + this.world.get_population());
  }

  toggle () {
    if (this.run) this.stop();
    else this.start();
  }

  start () {
    this.run = true;
    this.pause_text.setVisible(!this.run);
  }

  stop () {
    this.run = false;
    this.pause_text.setVisible(!this.run);
  }

  interval_get ( ) {
    return config.interval.range[this.interval_idx];
  }

  interval_set (idx) {
    this.interval_idx = Math.max(0, Math.min(idx, config.interval.range.length - 1));
    this.interval = config.interval.range[this.interval_idx];
    this.interval_text.setText('Interval: ' + this.interval + ' ms');
  }

  interval_inc () {
    this.interval_set(this.interval_idx + 1);
  }

  interval_dec () {
    this.interval_set(this.interval_idx - 1);
  }

  update ( time, delta ) {
    if (!this.run)
      return;

    if (time - this.prev_tick < this.interval_get())
      return;
    
    this.prev_tick = time;

    this.ticks += 1;
    this.tick_text.setText('Ticks: ' + this.ticks);

    this.world.update_cells();

    this.population_text.setText('Population: ' + this.world.get_population());
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