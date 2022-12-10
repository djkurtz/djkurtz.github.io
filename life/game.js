const config = {
  cell: {
    size: 20,
    border: {
      thickness: 1,
      color: 0x888888,
    },
  },
  dead_color: 0x000000,
  live_color: 0xffffff,
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

class Game extends Phaser.Scene
{
  constructor () {
    super('game');

    this.cells;
    this.prev_tick = 0;
    this.ticks = 0;
    this.interval_idx = config.interval.start_idx;
    this.population = 0;
    this.border_spacing = config.cell.size + config.cell.border.thickness;
    this.live_chance = config.start_live_chance;

    this.run = true;
  }

  create () {
    this.tick_text = this.add.text(10, 10, 'Ticks: ' + this.ticks,
        { font: '14px Arial Black', fill: '#ffffff' });
    this.interval_text = this.add.text(210, 10, 'Interval: ' + this.interval_get() + ' ms',
        { font: '14px Arial Black', fill: '#ffffff' });
    this.population_text = this.add.text(410, 10, 'Population: 0',
        { font: '14px Arial Black', fill: '#ffffff' });
    this.pause_text = this.add.text(610, 10, 'PAUSED',
        { font: '14px Arial Black', fill: '#ffffff', backgroundColor: '#ff0000' }).setVisible(false);

    const pw = this.cameras.main.width - 2 * config.border.min;
    const ph = this.cameras.main.height - 2 * config.border.min - config.border.menu;

    this.Nx = Math.floor((pw - config.cell.border.thickness) / this.border_spacing);
    this.Ny = Math.floor((ph - config.cell.border.thickness) / this.border_spacing);

    this.Sx = Math.floor((this.cameras.main.width - this.Nx * this.border_spacing) / 2);
    this.Sy = Math.floor((this.cameras.main.height + config.border.menu - this.Ny * this.border_spacing) / 2);

    this.input.keyboard.on('keydown-UP', function(event) { this.interval_dec(); }, this);
    this.input.keyboard.on('keydown-DOWN', function(event) { this.interval_inc(); }, this);

    this.input.keyboard.on('keydown-S', function(event) { this.toggle(); }, this);
    this.input.keyboard.on('keydown-C', function(event) { this.clear(); }, this);
    this.input.keyboard.on('keydown-R', function(event) { this.randomize(); }, this);

    this.input.on('pointerdown', this.handleClick, this);

    this.graphics = this.add.graphics();

    // Initialize cells
    this.cells = new Array(this.Ny);
    for (let y = 0; y < this.Ny; y++) {
      this.cells[y] = new Array(this.Nx);
      for (let x = 0; x < this.Nx; x++) {
        this.cells[y][x] = (Math.random() <= this.live_chance) ? 1 : 0;
      }
    }

    this.randomize();
    this.start();
  }

  handleClick(pointer) {
    let cell = this.pointer_in_cell(pointer);
    if (!cell)
      return;
   
    // toggle cell state
    this.cells[cell.y][cell.x] = this.cells[cell.y][cell.x] ^ 1; 

    this.drawCell(cell.x, cell.y, this.cells[cell.y][cell.x]);
  }

  clear() {
    for (let y = 0; y < this.Ny; y++) {
      this.cells[y].fill(0);
    }
    this.drawCells();
    this.ticks = 0;
    this.stop();
  }

  randomize() {
    for (let y = 0; y < this.Ny; y++) {
      for (let x = 0; x < this.Nx; x++) {
        this.cells[y][x] = (Math.random() <= this.live_chance) ? 1 : 0;
      }
    }
    this.drawCells();
    this.ticks = 0;
    this.stop();
  }

  drawCells() {
    for (let y = 0; y < this.Ny; y++) {
      for (let x = 0; x < this.Nx; x++) {
        this.drawCell(x, y, this.cells[y][x]);
      }
    }
  }

  pointer_in_cell(pointer) {
    const cellx = Math.floor((pointer.x - this.Sx) / this.border_spacing);
    const celly = Math.floor((pointer.y - this.Sy) / this.border_spacing);
    if (cellx < 0 || cellx >= this.Nx || celly < 0 || celly >= this.Ny)
      return null;

    // TODO: ignore click on border between cells
//    const dx = this.Sx + x * this.border_spacing;
//    const dy = this.Sy + y * this.border_spacing;

    return { x: cellx, y: celly };
  }

  drawCell(x, y, cell) {
    const dx = this.Sx + x * this.border_spacing;
    const dy = this.Sy + y * this.border_spacing;
    this.graphics.lineStyle(config.cell.border.thickness, config.cell.border.color);
    this.graphics.strokeRect(dx, dy, this.border_spacing, this.border_spacing);
    const color = cell ? config.live_color : config.dead_color
    this.graphics.fillStyle(color);
    this.graphics.fillRect(dx, dy, config.cell.size, config.cell.size);
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

    let next = new Array(this.Ny);
    for (let y = 0; y < this.Ny; y++) {
      next[y] = new Array(this.Nx);
      for (let x = 0; x < this.Nx; x++) {
        let s = this.count_neighbors(x, y, this.cells);
        next[y][x] = ((s == 2 && this.cells[y][x]) || s == 3) ? 1 : 0;
        if (next[y][x] != this.cells[y][x])
          this.drawCell(x, y, next[y][x]);
      }
    }

    let population = 0;
    for (let y = 0; y < this.Ny; y++) {
      for (let x = 0; x < this.Nx; x++) {
        this.cells[y][x] = next[y][x];
        population += next[y][x];
      }
    }
    this.population = population;
    this.population_text.setText('Population: ' + this.population);
  }

  count_neighbors(x, y, cells) {
    let sum = 0;
    if (cells[(y - 1 + this.Ny) % this.Ny][(x - 1 + this.Nx) % this.Nx]) sum++;
    if (cells[(y + 0 + this.Ny) % this.Ny][(x - 1 + this.Nx) % this.Nx]) sum++;
    if (cells[(y + 1 + this.Ny) % this.Ny][(x - 1 + this.Nx) % this.Nx]) sum++;
    if (cells[(y - 1 + this.Ny) % this.Ny][(x - 0 + this.Nx) % this.Nx]) sum++;
    if (cells[(y + 1 + this.Ny) % this.Ny][(x - 0 + this.Nx) % this.Nx]) sum++;
    if (cells[(y - 1 + this.Ny) % this.Ny][(x + 1 + this.Nx) % this.Nx]) sum++;
    if (cells[(y + 0 + this.Ny) % this.Ny][(x + 1 + this.Nx) % this.Nx]) sum++;
    if (cells[(y + 1 + this.Ny) % this.Ny][(x + 1 + this.Nx) % this.Nx]) sum++;
    return sum;
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