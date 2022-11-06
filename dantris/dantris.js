const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");
let rightPressed = false;
let leftPressed = false;
let upPressed = false;
let downPressed = false;
let spacePressed = false;
let score = 0;
let lines = 0;
let level = 0;
let levelSpeed;
var piece = null;
var tick = 0;

const levels = [
  { maxRows: 5, speed: 60 },
  { maxRows: 10, speed: 55 },
  { maxRows: 15, speed: 50 },
  { maxRows: 20, speed: 45 },
  { maxRows: 25, speed: 40 },
  { maxRows: 30, speed: 35 },
  { maxRows: 35, speed: 30 },
  { maxRows: 40, speed: 25 },
  { maxRows: 45, speed: 20 },
  { maxRows: 50, speed: 15 },
  { maxRows: 55, speed: 10 },
  { maxRows: 60, speed: 5 },
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

const nextPieceBoxWidth = 5 * paddedBrickWidth;
const nextPieceBoxHeight = 5 * paddedBrickHeight;
const nextPieceBoxTop = borderOffsetTop;
const nextPieceBoxLeft = 
    (canvas.width + borderOffsetLeft + borderWidth - nextPieceBoxWidth) / 2;

const bricks = [];
for (let c = 0; c < brickColumnCount; c++) {
  bricks[c] = [];
  for (let r = 0; r < brickRowCount; r++) {
    bricks[c][r] = { status: false, color: null };
  }
}

function drawBrick(x, y, color) {
  if (y < 0)
    return;
  let dx = borderOffsetLeft + 2 * brickPadding + x * (brickWidth + 2 * brickPadding);
  let dy = borderOffsetTop + 2 * brickPadding + y * (brickWidth + 2 * brickPadding);
  ctx.fillStyle = color;
  ctx.fillRect(dx, dy, brickWidth, brickHeight);
  //ctx.drawImage(color, dx, dy);
}

function eraseBrick(x, y) {
  if (y < 0)
    return;
  let dx = borderOffsetLeft + 2 * brickPadding + x * (brickWidth + 2 * brickPadding);
  let dy = borderOffsetTop + 2 * brickPadding + y * (brickWidth + 2 * brickPadding);
  ctx.clearRect(dx, dy, brickWidth, brickHeight);
}

function drawBorder() {
  ctx.strokeRect(borderOffsetLeft, borderOffsetTop, borderWidth, borderHeight);
}

function drawNextBoxBorder() {
  ctx.strokeRect(nextPieceBoxLeft, nextPieceBoxTop, nextPieceBoxWidth, nextPieceBoxHeight);
}

function drawScore(score) {
  ctx.save();
  ctx.font = "18px Arial";
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
  ctx.font = "18px Arial";
  ctx.fillStyle = "#0095DD";
  ctx.clearRect(0, 20, borderOffsetLeft - 1, 30);
  ctx.fillText(`Lines: ${lines}`, 8, 50);
  ctx.restore();
}

function drawLogo() {
  ctx.save();
  ctx.font = "24px Courier";
  ctx.fillStyle = "#0095DD";
  ctx.textAlign = "center";
  ctx.fillText(`Dantris 2022`, canvas.width/2, 20);
  ctx.restore();
}

function setupBoard() {
  drawBorder();
  drawNextBoxBorder();
  drawLogo();
  drawScore(0);
  drawLines(0);
}

const pieceTypes = [
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
  
  this.draw = function () {
    const shape = this.type.rotations[this.rotation];
    for (let b = 0; b < shape.length; b++) {
      const brick = shape[b];
      drawBrick(this.x + brick[0], this.y + brick[1], this.type.color);
     //drawBrick(this.x, this.y, this.image);
    }
  }

  this.clear = function () {
    const shape = this.type.rotations[this.rotation];
    for (let b=0; b < shape.length; b++) {
      const brick = shape[b];
      eraseBrick(this.x + brick[0], this.y + brick[1]);
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
      if (nx < 0 || nx >= brickColumnCount || ny >= brickRowCount || bricks[nx][ny].status)
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
      if (nx < 0 || nx >= brickColumnCount || ny >= brickRowCount || bricks[nx][ny].status)
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
      const brick = shape[b]
      const nx = this.x + brick[0];
      const ny = this.y + brick[1];
      bricks[nx][ny].status = true;
      bricks[nx][ny].color = this.type.color;
    }
  }

  this.checkLine = function () {
    var completedLines = 0;
    var linesToCheck = new Set();
    const shape = this.type.rotations[this.rotation];
    for (let b = 0; b < shape.length; b++) {
      const brick = shape[b]
      linesToCheck.add(this.y + brick[1]);
    }

    if (linesToCheck.length == 0) {
      return;
    }

    linesToCheck = Array.from(linesToCheck).sort((a, b) => a - b);

    for (let l = 0; l < linesToCheck.length; l++) {
      const y = linesToCheck[l];
      let count = 0;
      for (let x = 0; x < brickColumnCount; x++) {
        if (bricks[x][y].status) {
          count += 1;
        }
      }

      if (count !== brickColumnCount) {
        continue;
      }
      
      completedLines += 1;
      dropLines(y);
    }
  
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
      case 3:
        increaseScore(1000);
        break;
      }

    lines += completedLines;
    drawLines(lines);    
  }  
}

function dropLines(fromY) {
  for (let x = 0; x < brickColumnCount; x++) {
    eraseBrick(x, fromY);
  }  

  for (let y = fromY; y > 0; y--) {
    for (let x = 0; x < brickColumnCount; x++) {
      bricks[x][y] = bricks[x][y - 1];
      eraseBrick(x, y);
      if (bricks[x][y].status)
        drawBrick(x, y, bricks[x][y].color);
    }
  }
}

function draw() {
  tick += 1;
  if (tick % levels[level].speed == 0) {
    if (!piece.moveDown()) {
      increaseScore(10);
      piece.affix();

      piece.checkLine();

      piece = nextPiece;
      piece.draw();
      nextPiece = new Piece();
    }
  }

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
  }

  requestAnimationFrame(draw);
}

document.addEventListener("keydown", keyDownHandler, false);

setupBoard();
var piece = new Piece();
piece.draw();
var nextPiece = new Piece();
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
  }
}
