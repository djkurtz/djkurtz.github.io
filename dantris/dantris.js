const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");
let rightPressed = false;
let leftPressed = false;
let upPressed = false;
let downPressed = false;
let spacePressed = false;
let score = 0;
let rowsCleared = 0;
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
    bricks[c][r] = { status: 0 };
  }
}

function drawBrick(x, y, color) {
  let dx = borderOffsetLeft + 2 * brickPadding + x * (brickWidth + 2 * brickPadding);
  let dy = borderOffsetTop + 2 * brickPadding + y * (brickWidth + 2 * brickPadding);
  ctx.fillStyle = color;
  ctx.fillRect(dx, dy, brickWidth, brickHeight);
}

function eraseBrick(x, y) {
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

function drawLevel(level) {
  ctx.save();
  ctx.font = "18px Arial";
  ctx.fillStyle = "#0095DD";
  ctx.clearRect(0, 20, borderOffsetLeft - 1, 30);
  ctx.fillText(`Level: ${level + 1}`, 8, 50);
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
  drawLevel(0);
}

function randomColor() {
  const colors = [ 'red', 'orange', 'yellow', 'green', 'blue', 'indigo' , 'violet' ];
  return colors[Math.floor(Math.random() * colors.length)];
}

function Piece() {
  this.x = startColumn;
  this.y = 0;
  this.color = randomColor();

  this.draw = function () {
    drawBrick(this.x, this.y, this.color);
  }

  this.clear = function () {
    eraseBrick(this.x, this.y);
  }

  this.moveLeft = function () {
    if (this.x === 0 || bricks[this.x - 1][this.y].status)
      return;
  
    this.clear();
    this.x -= 1;
    this.draw();
  };
  
  this.moveRight = function () {
    if (this.x === brickColumnCount - 1 || bricks[this.x + 1][this.y].status)
      return;
  
    this.clear();
    this.x += 1;
    this.draw();
  };

  this.moveDown = function () {
    if (this.y === brickRowCount - 1 || bricks[this.x][this.y + 1].status)
      return false;
  
    this.clear();
    this.y += 1;
    this.draw();
    return true;
  };

  this.drop = function () {
    this.clear();

    let z;
    for (z = this.y; z < brickRowCount - 1; z++) {
      if (bricks[this.x][z + 1].status) {
        break;
      }
    }

    this.y = z;
    this.draw();
  }

  this.affix = function () {
    bricks[this.x][this.y].status = 1;
  };
}

function dropLines(fromY) {
  for (let x = 0; x < brickColumnCount; x++) {
    eraseBrick(x, fromY);
  }  

  for (let y = fromY - 1; y >= 0; y--) {
    for (let x = 0; x < brickColumnCount; x++) {
      if (bricks[x][y].status) {
        eraseBrick(x, y);
        drawBrick(x, y + 1);
      }
      bricks[x][y + 1].status = bricks[x][y].status;
    }
  }
}

function checkLine(checkY) {
  let count = 0;
  for (let x = 0; x < brickColumnCount; x++) {
    if (bricks[x][checkY].status) {
      count += 1;
    }
  }

  if (count !== brickColumnCount) {
    return;
  }
  
  increaseScore(100);
  rowsCleared += 1;

  if (level < levels.length) {
    if (rowsCleared > levels[level].maxRows) {
      level += 1;
      drawLevel(level);
    }
  }

  dropLines(checkY);
}

piece = new Piece();

function draw() {
  tick += 1;
  if (tick % levels[level].speed == 0) {
    if (!piece.moveDown()) {
      increaseScore(10);
      piece.affix();

      checkLine(piece.y);

      piece = new Piece();
      piece.draw();
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
    upPressed = false;
  } else if (spacePressed) {
    piece.drop();
    spacePressed = false;
  }

  requestAnimationFrame(draw);
}

document.addEventListener("keydown", keyDownHandler, false);

setupBoard();
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
