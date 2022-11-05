let ball;           // Game object for the ball
let paddle;         // Game object for the paddle
let bricks;         // Game object for the bricks
let scoreText;      // Game object for showing score
let livesText;      // Game object for showing lives
let startButton;    // Game object for the start button
let gameOverText;   // Game object for showing "Game Over!"
let wonTheGameText; // Game object for showing "You won the game!"
let rotation;       // Flag will be used to define which direction the ball should rotate

let score = 0;      // Variable holding the number of scores
let lives = 3;      // Variable holding the remaining lives

// We are going to use these styles for texts
const textStyle = { 
    font: 'bold 18px Arial', 
    fill: '#FFF' 
};

function preload() {
  this.load.image('paddle', 'img/paddle.png');
  this.load.image('brick', 'img/brick.png');
  this.load.image('destroyed', 'img/destroyed.png');
  this.load.image('ball', 'img/ball.png');
}

function create() {
  paddle = this.physics.add.image(this.cameras.main.centerX, this.game.config.height - 50, 'paddle')
      .setImmovable();

  ball = this.physics.add.image(this.cameras.main.centerX, this.game.config.height - 100, 'ball')
      .setCollideWorldBounds(true)
      .setBounce(1);

  bricks = this.physics.add.staticGroup({
    key: 'brick',
    frameQuantity: 20,
    gridAlign: { width: 10, cellWidth: 60, cellHeight: 60, x: this.cameras.main.centerX - 277.5, y: 100 }
  });

  scoreText = this.add.text(20, 20, 'Score: 0', textStyle);
  livesText = this.add.text(this.game.config.width - 20, 20,  `Lives: ${lives}`, textStyle).setOrigin(1, 0);

  gameOverText = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, 'Game over!', textStyle)
  .setOrigin(0.5)
  .setPadding(10)
  .setStyle({ backgroundColor: '#111', fill: '#e74c3c' })
  .setVisible(false);

  wonTheGameText = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, 'You won the game!', textStyle)
    .setOrigin(0.5)
    .setPadding(10)
    .setStyle({ backgroundColor: '#111', fill: '#27ae60' })
    .setVisible(false);

  startButton = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, 'Start game', textStyle)
    .setOrigin(0.5)
    .setPadding(10)
    .setStyle({ backgroundColor: '#111' })
    .setInteractive({ useHandCursor: true })
    .on('pointerdown', () => startGame.call(this))
    .on('pointerover', () => startButton.setStyle({ fill: '#f39c12' }))
    .on('pointerout', () => startButton.setStyle({ fill: '#FFF' }));

  this.physics.add.collider(ball, bricks, brickHit, null, this);
  this.physics.add.collider(ball, paddle, paddleHit, null, this);
}

function brickHit(ball, brick) {
  brick.setTexture('destroyed');
 
  score += 5;
  scoreText.setText(`Score: ${score}`);

  this.tweens.add({
      targets: brick,
      ease: 'Power1',
      scaleX: 0,
      scaleY: 0,
      angle: 180,
      duration: 500,
      delay: 250,
      onComplete: () => { 
          brick.destroy();

          if (bricks.countActive() === 0) {
              ball.destroy();

              wonTheGameText.setVisible(true);
          }
      }
  });
}

function paddleHit(ball, paddle) {
  let diff = 0;

  if (ball.x < paddle.x) {
    diff = paddle.x - ball.x;
    ball.setVelocityX(-20 * diff);
    rotation = 'left';
  } else if (ball.x > paddle.x) {
    diff = ball.x - paddle.x;
    ball.setVelocityX(20 * diff);
    rotation = 'right';
  } else {
    ball.setVelocityX(2 + Math.random() * 10);
  }
}

function startGame() {
  startButton.destroy();
  ball.setVelocity(-300, -150);
  rotation = 'left';
  
  this.input.on('pointermove', pointer => {
      paddle.x = Phaser.Math.Clamp(pointer.x, paddle.width / 2, this.game.config.width - paddle.width / 2);
  });
}

function update() {
  if (rotation) {
    ball.rotation = rotation === 'left' ?  ball.rotation - .05 : ball.rotation + .05;
  }

  if (ball.y > paddle.y) {
    lives--;

    if (lives > 0) {
      livesText.setText(`Lives: ${lives}`);

      ball.setPosition(this.cameras.main.centerX, this.game.config.height - 100)
          .setVelocity(300, -150);
    } else {
      ball.destroy();

      gameOverText.setVisible(true);
    }
  }
}

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#222',
    physics: {
        default: 'arcade',
        arcade: {
            //debug: true, // - Set debug: true if you want collision boxes to be drawn
            checkCollision: {
                up: true,
                down: false,
                left: true,
                right: true
            }
        }
    },
    scene: {
        preload,
        create,
        update
    }
};

const game = new Phaser.Game(config);