const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");
let rightPressed = false;
let leftPressed = false;
let upPressed = false;
let downPressed = false;
let spacePressed = false;
let kPressed = false;
let tPressed = false;
let score = 0;
let lines = 0;
let tick = 0;

const levels = [
  { lines: 5, speed: 60 },
  { lines: 10, speed: 55 },
  { lines: 15, speed: 50 },
  { lines: 20, speed: 45 },
  { lines: 25, speed: 40 },
  { lines: 30, speed: 35 },
  { lines: 35, speed: 30 },
  { lines: 40, speed: 25 },
  { lines: 45, speed: 20 },
  { lines: 50, speed: 15 },
  { lines: 55, speed: 10 },
  { lines: 60, speed: 9 },
  { lines: 70, speed: 8 },
  { lines: 80, speed: 7 },
  { lines: 100, speed: 6 },
  { lines: 125, speed: 5 },
];

const brickWidth = 20;
const brickHeight = 20;
const brickPadding = 1;
const paddedBrickWidth = brickWidth + 2 * brickPadding;
const paddedBrickHeight = brickHeight + 2 * brickPadding;

const brickRowCount = 20;
const brickColumnCount = 12;
const startColumn = Math.floor(brickColumnCount / 2)

const borderThickness = 2;
const borderWidth = paddedBrickWidth * brickColumnCount + borderThickness;
const borderHeight = paddedBrickHeight * brickRowCount + borderThickness;

const borderOffsetTop = 30;
const borderOffsetLeft = Math.floor((canvas.width - borderWidth) / 2);

const nextBrickRowCount = 4;
const nextBrickColumnCount = 6;
const nextPieceBoxWidth = nextBrickColumnCount * paddedBrickWidth + borderThickness;
const nextPieceBoxHeight = nextBrickRowCount * paddedBrickHeight + borderThickness;
const nextPieceBoxTop = borderOffsetTop;
const nextPieceBoxLeft = 
    Math.floor((canvas.width + borderOffsetLeft + borderWidth - nextPieceBoxWidth) / 2);

function Brick() {
  this.status = false;
  this.color = null;
}

function Board(left, top, width, height) {
  this.left = left;
  this.top = top;
  this.width = width;
  this.height = height;

  this.bricks = new Array(this.height);
  for (let y = 0; y < this.bricks.length; y++) {
    this.bricks[y] = new Array(this.width);
    for (let x = 0; x < this.bricks[y].length; x++) {
      this.bricks[y][x] = new Brick();
    }
  }

  this.status = function (x, y) {
    return this.bricks[y][x].status;
  }

  this.affix = function (x, y, color) {
    this.bricks[y][x].status = true;
    this.bricks[y][x].color = color;
  }

  this.eraseAllBricks = function () {
    for (let y = 0; y < this.bricks.length; y++) {
      let line = this.bricks[y];
      for (let x = 0; x < line.length; x++) {
        this.eraseBrick(x, y);
      }
    }
  }

  this.drawBrick = function (x, y, color) {
    if (y < 0)
      return;
    let dx = this.left + 2 * brickPadding + x * (brickWidth + 2 * brickPadding);
    let dy = this.top + 2 * brickPadding + y * (brickWidth + 2 * brickPadding);
    ctx.fillStyle = color;
    ctx.fillRect(dx, dy, brickWidth, brickHeight);
    //ctx.drawImage(color, dx, dy);
  }

  this.eraseBrick = function (x, y) {
    if (y < 0)
      return;
    let dx = this.left + 2 * brickPadding + x * (brickWidth + 2 * brickPadding);
    let dy = this.top + 2 * brickPadding + y * (brickWidth + 2 * brickPadding);
    ctx.clearRect(dx, dy, brickWidth, brickHeight);
  }

  this._dropLines = function(fromY) {
    for (let y = fromY; y > 0; y--) {
      for (let x = 0; x < this.width; x++) {
        Object.assign(this.bricks[y][x], this.bricks[y - 1][x]);
        this.eraseBrick(x, y);
        if (this.bricks[y][x].status)
          this.drawBrick(x, y, this.bricks[y][x].color);
      }
    }
  }

  this._isLineFull = function(y) {
    const line = this.bricks[y];
    for (let x = 0; x < line.length; x++)
      if (!line[x].status)
        return false;
    return true;
  }

  this.checkLines = function(lines) {
    let count = 0;
    for (let l = 0; l < lines.length; l++) {
      const y = lines[l];
      if (this._isLineFull(y)) {
        count += 1;
        this._dropLines(y);
      }      
    }
    return count;
  }
}

let board = new Board(borderOffsetLeft, borderOffsetTop, brickColumnCount, brickRowCount);
let nextBoard = new Board(nextPieceBoxLeft, nextPieceBoxTop, nextBrickColumnCount, nextBrickRowCount);

function drawBorder() {
  ctx.strokeRect(borderOffsetLeft, borderOffsetTop, borderWidth, borderHeight);
}

function drawNextBoxBorder() {
  ctx.strokeRect(nextPieceBoxLeft, nextPieceBoxTop, nextPieceBoxWidth, nextPieceBoxHeight);
}

function drawScore(score) {
  ctx.save();
  ctx.font = "20px Arial";
  ctx.fillStyle = "#0095DD";
  ctx.clearRect(0, 0, borderOffsetLeft - 1, 30);
  ctx.fillText(`Score: ${score}`, 8, 20);
  ctx.restore();
}

function increaseScore(delta) {
  score += delta;
  drawScore(score);
}

function drawLines(lines) {
  ctx.save();
  ctx.font = "20px Arial";
  ctx.fillStyle = "#0095DD";
  ctx.clearRect(0, 30, borderOffsetLeft - 1, 30);
  ctx.fillText(`Lines: ${lines}`, 8, 50);
  ctx.restore();
}

function drawLogo() {
  ctx.save();
  ctx.font = "26px Courier";
  ctx.fillStyle = "#0095DD";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(`Dantris 2022`, canvas.width/2, borderOffsetTop/2);
  ctx.restore();
}

var blurpSound = new Audio('blurp.wav');
var tromboneSound = new Audio('trombone.wav');
var popSound = new Audio('pop.wav');

function setupBoard() {
  drawBorder();
  drawNextBoxBorder();
  drawLogo();
  drawScore(0);
  drawLines(0);
}

const gameOverWidth = borderWidth;
const gameOverHeight = 60;
const gameOverOffsetTop = Math.floor((canvas.height - gameOverHeight) / 2);
const gameOverOffsetLeft = Math.floor((canvas.width - gameOverWidth) / 2);

function gameOver() {
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.fillRect(borderOffsetLeft, borderOffsetTop, borderWidth, borderHeight);
  ctx.restore();

  ctx.clearRect(gameOverOffsetLeft, gameOverOffsetTop, gameOverWidth, gameOverHeight);
  ctx.strokeRect(gameOverOffsetLeft, gameOverOffsetTop, gameOverWidth, gameOverHeight);

  ctx.save();
  ctx.font = "32px ComicSans";
  ctx.fillStyle = "#0095DD";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(`Game Over!`, canvas.width/2, canvas.height/2);
  ctx.restore();

  tromboneSound.play();
}

const kTypes = [
  { color: 'pink', /* . */
    rotations: [
      [ [0, 0], ],
    ] },
];

const tradTypes = [
  { color: 'red', /* | */
    rotations: [
      [ [-1, 0], [0, 0], [1, 0], [2, 0] ],
      [ [0, 1], [0, 0], [0, -1], [0, -2] ],
    ] },
  { color: 'orange', /* T */
    rotations: [
      [ [-1, 0], [0, 0], [0, -1], [1, 0] ],
      [ [0, 1], [0, 0], [-1, 0], [0, -1] ],
      [ [1, 0], [0, 0], [0, 1], [-1, 0] ],
      [ [0, -1], [0, 0], [1, 0], [0, 1] ],
    ] },
  { color: 'yellow', /* S */
    rotations: [
      [ [-1, 0], [0, 0], [0, -1], [1, -1] ],
      [ [0, 1], [0, 0], [-1, 0], [-1, -1] ],
    ] },
  { color: 'green', /* Z */
    rotations: [
      [ [1, 0], [0, 0], [0, -1], [-1, -1] ],
      [ [0, -1], [0, 0], [-1, 0], [-1, 1] ],
    ] },
  { color: 'blue',  /* ☐ */
    rotations: [
      [ [-1, 0], [0, 0], [-1, -1], [0, -1] ],
    ] },
  { color: 'indigo', /* L  */
    rotations: [
      [ [-1, 0], [0, 0], [1, 0], [1, -1] ],
      [ [0, 1], [0, 0], [0, -1], [-1, -1] ],
      [ [1, 0], [0, 0], [-1, 0], [-1, 1] ],
      [ [0, -1], [0, 0], [0, 1], [1, 1] ],
    ] },
  { color: 'violet', /* Γ */
    rotations: [
      [ [1, 0], [0, 0], [-1, 0], [-1, -1] ],
      [ [0, -1], [0, 0], [0, 1], [-1, 1] ],
      [ [-1, 0], [0, 0], [1, 0], [1, 1] ],
      [ [0, 1], [0, 0], [0, -1], [1, -1] ],
    ] },
];

let pieceTypes = tradTypes;

function randomPieceType() {
  return pieceTypes[Math.floor(Math.random() * pieceTypes.length)];
}

function Piece() {
  this.x = startColumn;
  this.y = 0;
  this.type = randomPieceType();
  this.rotation = 0;

  //this.image = new Image(brickWidth, brickHeight);
  //this.image.src = "blue_orange.png";
  
  this.drawNext = function () {
    nextBoard.eraseAllBricks();
    const shape = this.type.rotations[0];
    for (let b = 0; b < shape.length; b++) {
      const brick = shape[b];
      const nx = 2 + brick[0];
      const ny = 2 + brick[1];
      nextBoard.drawBrick(nx, ny, this.type.color);
      // drawBrick(nx, ny, this.image);
    }
  }

  this.draw = function () {
    const shape = this.type.rotations[this.rotation];
    for (let b = 0; b < shape.length; b++) {
      const brick = shape[b];
      const nx = this.x + brick[0];
      const ny = this.y + brick[1];
      board.drawBrick(nx, ny, this.type.color);
      // drawBrick(nx, ny, this.image);
    }
  }

  this.clear = function () {
    const shape = this.type.rotations[this.rotation];
    for (let b=0; b < shape.length; b++) {
      const brick = shape[b];
      const nx = this.x + brick[0];
      const ny = this.y + brick[1];
      board.eraseBrick(nx, ny);
    }
  }

  this.canMove = function(dx, dy) {
    const shape = this.type.rotations[this.rotation];
    for (let b = 0; b < shape.length; b++) {
      const brick = shape[b]
      const nx = this.x + brick[0] + dx;
      const ny = this.y + brick[1] + dy;
      if (ny < 0)
        continue;
      if (nx < 0 || nx >= brickColumnCount || ny >= brickRowCount || board.status(nx, ny))
        return false;
    }
    return true;
  }

  this.canRotate = function() {
    const shape = this.type.rotations[(this.rotation + 1) % this.type.rotations.length];
    for (let b = 0; b < shape.length; b++) {
      const brick = shape[b];
      const nx = this.x + brick[0];
      const ny = this.y + brick[1];
      if (ny < 0)
        continue;
      if (nx < 0 || nx >= brickColumnCount || ny >= brickRowCount || board.status(nx, ny))
        return false;
    }
    return true;
  }

  this.moveLeft = function () {
    if (!this.canMove(-1, 0))
      return false;

    this.clear();
    this.x -= 1;
    this.draw();
    return true;
  };
  
  this.moveRight = function () {
    if (!this.canMove(+1, 0))
      return false;
  
    this.clear();
    this.x += 1;
    this.draw();
    return true;
  };

  this.moveDown = function () {
    if (!this.canMove(0, +1))
      return false;
  
    this.clear();
    this.y += 1;
    this.draw();
    return true;
  };

  this.rotate = function () {
    if (!this.canRotate())
      return false;
  
    this.clear();
    this.rotation = (this.rotation + 1) % this.type.rotations.length;
    this.draw();
    return true;
  };

  this.drop = function () {
    while (this.moveDown())
      continue;
  }

  this.affix = function () {
    const shape = this.type.rotations[this.rotation];
    for (let b = 0; b < shape.length; b++) {
      const brick = shape[b];
      const nx = this.x + brick[0];
      const ny = this.y + brick[1];
      if (ny < 0) {
        continue;
      }
      board.affix(nx, ny, this.type.color);
    }
    popSound.play();
  }

  this.checkLine = function () {
    var completedLines = 0;
    var linesToCheck = new Set();
    const shape = this.type.rotations[this.rotation];
    for (let b = 0; b < shape.length; b++) {
      const brick = shape[b];
      let y = this.y + brick[1];
      // Ignore off-screen lines for blocks at very top.
      if (y >= 0) {
        linesToCheck.add(this.y + brick[1]);
      }
    }

    if (linesToCheck.length == 0) {
      return;
    }

    linesToCheck = Array.from(linesToCheck).sort((a, b) => a - b);

    completedLines = board.checkLines(linesToCheck);
  
    switch (completedLines) {
      case 0:
        return;
      case 1:
        increaseScore(100);
        break;
      case 2:
        increaseScore(250);
        break;
      case 3:
        increaseScore(500);
        break;
      case 4:
        increaseScore(1000);
        break;
      }

    lines += completedLines;
    drawLines(lines);
    blurpSound.play();
  }  
}

function gameSpeed() {
  for (let l = 0; l < levels.length; l++) {
    if (lines < levels[l].lines)
      return levels[l].speed;
  }
  return 1;
}

function draw() {
  tick += 1;
  if (tick % gameSpeed() == 0) {
    if (!piece.moveDown()) {
      increaseScore(10);
      piece.affix();
      piece.checkLine();

      piece = nextPiece;
      piece.draw();
      if (!piece.canMove(0, 0)) {
        gameOver();
        return;
      }

      nextPiece = new Piece();
      nextPiece.drawNext();
    }
  }

  processKeys();

  requestAnimationFrame(draw);
}

function processKeys() {
  if (rightPressed) {
    piece.moveRight();
    rightPressed = false;
  } else if (leftPressed) {
    piece.moveLeft();
    leftPressed = false;
  } else if (downPressed) {
    piece.moveDown();
    downPressed = false;
  } else if (upPressed) {
    piece.rotate(); 
    upPressed = false;
  } else if (spacePressed) {
    piece.drop();
    spacePressed = false;
  } else if (kPressed) {
    pieceTypes = kTypes;
    kPressed = false;
  } else if (tPressed) {
    pieceTypes = tradTypes;
    tPressed = false;
  }
}

document.addEventListener("keydown", keyDownHandler, false);
canvas.addEventListener("mousemove", mouseMoveHandler, false);
document.addEventListener("mouseup", mouseUpHandler, false);
document.addEventListener("touchmove", touchMoveHandler, false);

setupBoard();
let piece = new Piece();
piece.draw();
let nextPiece = new Piece();
nextPiece.drawNext();
draw();


function keyDownHandler(e) {
  if (e.key === "ArrowRight") {
    rightPressed = true;
  } else if (e.key === "ArrowLeft") {
    leftPressed = true;
  } else if (e.key === "ArrowUp") {
    upPressed = true;
  } else if (e.key === "ArrowDown") {
    downPressed = true;
  } else if (e.key === " ") {
    spacePressed = true;
  } else if (e.key === "k") {
    kPressed = true;
  } else if (e.key === "t") {
    tPressed = true;
  }
}

function mouseMoveHandler(e) {
  if (e.movementX > 1) {
    rightPressed = true;
  } else if (e.movementX < -1) {
    leftPressed = true;
  }
  //console.log(e.offsetX);
}

function mouseUpHandler(e) {
  spacePressed = true;
}

let lastTouchX = null;
function touchMoveHandler(e) {
  if (!lastTouchX) {
    lastTouchX = e.touches[0].clientX;
    return;
  }
  let delta = e.touches[0].clientX - lastTouchX
  lastTouchX = e.touches[0].clientX;
  if (delta > 1) {
    rightPressed = true;
  } else if (delta < -1) {
    leftPressed = true;
  }
}