const config = {
  cell: {
    size: 20,
    border: {
      thickness: 1,
      color: 0xFFFFFF,
    },
  },
  dead_color: 0x000000,
  live_color: 0xffffff,
  border: {
    min: 10,
  },
  period: 60,
};

class Game extends Phaser.Scene
{
  constructor () {
    super('game');

    this.cells;
    this.ticks = 0;
    this.border_spacing = config.cell.size + config.cell.border.thickness;
  }

  create () {
    const pw = this.cameras.main.width - 2 * config.border.min;
    const ph = this.cameras.main.height - 2 * config.border.min;

    this.Nx = Math.floor((pw - config.cell.border.thickness) / this.border_spacing);
    this.Ny = Math.floor((ph - config.cell.border.thickness) / this.border_spacing);

    this.Sx = Math.floor((this.cameras.main.width - this.Nx * this.border_spacing) / 2);
    this.Sy = Math.floor((this.cameras.main.height - this.Ny * this.border_spacing) / 2);

    this.graphics = this.add.graphics();

    // Initialize cells
    this.cells = new Array(this.Ny);
    for (let y = 0; y < this.Ny; y++) {
      this.cells[y] = new Array(this.Nx).fill(0);
      for (let x = 0; x < this.Nx; x++) {
        this.cells[y][x] = Math.round(Math.random());
      }
    }

//    this.cells[1][1] = 1;
//    this.cells[1][2] = 1;
//    this.cells[1][3] = 1;

    // Draw cells
    for (let y = 0; y < this.Ny; y++) {
      for (let x = 0; x < this.Nx; x++) {
        this.drawCell(x, y, this.cells[y][x]);
      }
    }

    // Add a new asteroid every 1 sec
    this.timedEvent = this.time.addEvent({ delay: 120, callback: this.updateCells, callbackScope: this, loop: true });
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

  updateCells() {
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

    for (let y = 0; y < this.Ny; y++) {
      for (let x = 0; x < this.Nx; x++) {
        this.cells[y][x] = next[y][x];
      }
    }
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