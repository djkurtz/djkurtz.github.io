class Bullet extends Phaser.Physics.Arcade.Sprite {
  constructor (scene, x, y) { super(scene, x, y, 'bullet'); }

  fire (x, y, rotation) {
    this.enableBody(true, x, y, true, true);

    this.setRotation(rotation);
    this.scene.physics.velocityFromRotation(rotation, 500, this.body.velocity);
  }

  preUpdate (time, delta) {
    super.preUpdate(time, delta);

    // if out of world bounds
    if (this.body.checkWorldBounds()) {
      this.disableBody(true, true);
    }
  }
}

class Bullets extends Phaser.Physics.Arcade.Group
{
  constructor (scene) {
    // Bullets in the group start disabled
    super(scene.physics.world, scene, { enable: false });

    this.createMultiple({
        frameQuantity: 10,
        key: 'bullet',
        active: false,
        visible: false,
        classType: Bullet
    });
  }

  fireBullet (x, y, rotation) {
    let bullet = this.getFirstDead(false);

    if (bullet) {
      bullet.fire(x, y, rotation);
      return true;
    } else {
      return false;
    }
  }
}

const State = Object.freeze({
  alive: 0,
  dead: 1,
});

class Game extends Phaser.Scene
{
  constructor ()
  {
    super('game');

    this.bullets;
    this.ship;
    this.ship_image;
    this.muzzle;
    this.thrust;
    this.cursors;
    this.keySpace;
  }

  create () {
    this.bullets = new Bullets(this);
  
    this.ship_image = this.add.image(0, 0, 'ship');
    this.muzzle = this.add.image(0, 0, 'muzzle-flash');
    this.muzzle.visible = false;
    this.thrust = this.add.image(-this.ship_image.width/2, 0, 'bullet');
    this.thrust.visible = false;
  
    const x = this.cameras.main.width / 2;
    const y = this.cameras.main.height / 2;

    this.ship = this.add.container(x, y, [this.ship_image, this.muzzle, this.thrust]);
    this.ship.state = State.alive;
    this.ship.setSize(this.ship_image.width, this.ship_image.height, false);
    this.physics.world.enable(this.ship);
    this.ship.body.setDamping(true);  
    this.ship.body.setDrag(0.99);
    this.ship.body.setMaxVelocity(200);
  
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.asteroidGroup = this.physics.add.group({
      createCallback: this.createAsteroid,
    });

    //  When the player sprite hits asteroid
    this.physics.add.overlap(this.ship, this.asteroidGroup, this.shipHitAsteroid, null, this);
    this.physics.add.overlap(this.bullets, this.asteroidGroup, this.bulletHitAsteroid, null, this);

    // Add a new asteroid every 1 sec
    this.timedEvent = this.time.addEvent({ delay: 1000, callback: this.newAsteroid, callbackScope: this, loop: true });

    // UI
    this.health = 3;
    this.score = 0;
    this.score_box = this.add.text(10, 10, 'Score: ' + this.score, { font: '32px Courier', fill: '#ffffff' });
    this.health_box = this.add.text(10, 42, 'Health: ' + this.health, { font: '32px Courier', fill: '#ffffff' });

    // Sounds
    this.sounds = {
        death: this.sound.add('death'),
        laser: this.sound.add('laser'),
        ship_explosion: this.sound.add('ship-explosion'),
        rock_explosion: this.sound.add('rock-explosion'),
        thrust: this.sound.add('thrust', { volume: 0.5, loop: true }),
    };

    this.sounds.thrust.play();
    this.sounds.thrust.pause();

    this.bgMusic = this.sound.add('jazz', { volume: 0.2, loop: true }).play();
  }

  newAsteroid () {
    const gap = 300;
    const exclusion = new Phaser.Geom.Rectangle(
        this.ship.x - gap / 2, this.ship.y - gap / 2, gap, gap);
    const p = Phaser.Geom.Rectangle.RandomOutside(this.physics.world.bounds, exclusion);
    this.asteroidGroup.createFromConfig({ 
      key: ['asteroid1', 'asteroid2'],
      randomKey: true,
      max: 1,
      setXY: p,
    });
  }

  createAsteroid (asteroid) {
    asteroid.setVelocity(Phaser.Math.Between(-150, 150), Phaser.Math.Between(-150, 150));
    asteroid.setAngularVelocity(Phaser.Math.Between(-180, 180));
  }

  shipHitAsteroid (ship, asteroid) {
    asteroid.destroy();
    this.sounds.ship_explosion.play();

    this.health = Phaser.Math.MinSub(this.health, 1, 0);
    if (this.health === 0) {
      ship.state = State.dead;
      this.sounds.death.play();
      this.sounds.thrust.stop();
      ship.destroy();
      this.timedEvent.remove();
      this.gameOver();
    }
  }

  gameOver () {
    this.gameOverText = this.make.text({
      x: this.cameras.main.width / 2,
      y: this.cameras.main.height / 2,
      text: 'Game Over!',
      style: {
          font: '30px monospace',
          fill: '#ffffff'
      }
    }).setOrigin(0.5);

    this.input.on('pointerup', () => {
      this.scene.start('title');
    } );
  }

  bulletHitAsteroid (bullet, asteroid) {
    asteroid.destroy();
    bullet.disableBody(true, true);
    this.sounds.rock_explosion.play();

    this.score += 10;
  }

  update () {
    if (this.ship.state === State.alive) {
      if (this.cursors.up.isDown) {
        this.physics.velocityFromRotation(this.ship.rotation, 200, this.ship.body.acceleration);
        this.sounds.thrust.resume();
        this.thrust.visible = true;
      } else {
        this.ship.body.setAcceleration(0);
        this.sounds.thrust.pause();
        this.thrust.visible = false;
      }
    
      if (this.cursors.left.isDown) {
        this.ship.body.setAngularVelocity(-250);
      } else if (this.cursors.right.isDown) {
        this.ship.body.setAngularVelocity(250);
      } else {
        this.ship.body.setAngularVelocity(0);
      }
    
      if (this.input.keyboard.checkDown(this.keySpace, 100)) {
        let off = Phaser.Math.RotateAroundDistance({x: this.ship.x, y: this.ship.y},
            this.ship.x, this.ship.y, this.ship.rotation, this.ship_image.width/2);
        if (this.bullets.fireBullet(off.x, off.y, this.ship.rotation)) {
          this.muzzle.setVisible(true);
          this.sounds.laser.play();
        }
      } else {
        this.muzzle.setVisible(false);
      }
    }
  
    this.physics.world.wrap(this.ship, 0);
    this.physics.world.wrap(this.asteroidGroup, 0);

    this.health_box.setText('Health: ' + this.health);
    this.score_box.setText('Score: ' + this.score);
  }
}

class Title extends Phaser.Scene
{
  constructor ()
  {
    super('title');
  }

  preload () {
    this.load.setPath('assets/audio/');
    this.load.audio('blastoff', '361250__japanyoshithegamer__sci-fi-engine-startup.wav'); 
//    this.load.audio('blastoff', '125810__robinhood76__02578-rocket-start.wav'); 
    this.load.audio('death', 'death.mp3');
    this.load.audio('laser', 'laser-45816.mp3');
    //this.load.audio('morph', 'morphed-metal-discharged-cinematic-trailer-sound-effects-124763.mp3');
    this.load.audio('jazz', 'Space Jazz.mp3');
    this.load.audio('rock-explosion', 'small-explosion-103931.mp3');
    this.load.audio('ship-explosion', 'small-explosion-103779.mp3');
    this.load.audio('thrust', '547442__mango777__loopingthrust.ogg');

    this.load.setPath('assets/img/');
    this.load.image('asteroid1', 'asteroid1.png');
    this.load.image('asteroid2', 'asteroid2.png');
    this.load.image('bullet', 'bullets.png');
    this.load.image('muzzle-flash', 'muzzle-flash.png');
    this.load.image('ship', 'ship.png');
  
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    this.progressBar = this.add.graphics();
    this.progressBox = this.add.graphics();
    this.progressBox.fillStyle(0x222222, 0.8);
    this.progressBox.fillRect(cx - 160, cy - 30, 320, 50);
    
    this.loadingText = this.make.text({
        x: cx, y: cy - 50,
        text: 'Loading...',
        style: { font: '20px monospace', fill: '#ffffff' }
    }).setOrigin(0.5, 0.5);
    
    this.percentText = this.make.text({
        x: cx, y: cy - 5,
        text: '0%',
        style: { font: '18px monospace', fill: '#ffffff' }
    }).setOrigin(0.5, 0.5);
    
    this.assetText = this.make.text({
        x: cx, y: cy + 50,
        text: '',
        style: { font: '18px monospace', fill: '#ffffff' }
    }).setOrigin(0.5, 0.5);
    
    this.load.on('progress', function (value) {
        this.percentText.setText(parseInt(value * 100) + '%');
        this.progressBar.clear();
        this.progressBar.fillStyle(0xffffff, 1);
        this.progressBar.fillRect(cx - 150, cy - 20, 300 * value, 30);
    }, this);
    
    this.load.on('fileprogress', function (file) {
      this.assetText.setText('Loading asset: ' + file.key);
    }, this);

    this.titleText = this.make.text({
      x: cx, y: cy - 100, text: 'Dansteroids',
      style: { font: '50px cursive', fill: '#ffffff' }
    }).setOrigin(0.5);

    this.startText = this.make.text({
      x: cx, y: cy, text: 'Click anywhere to launch...',
      style: { font: '20px monospace', fill: '#ffffff' }
    }).setOrigin(0.5);
    this.startText.setVisible(false);
  }

  create () {
    this.progressBar.setVisible(false);
    this.progressBox.setVisible(false);
    this.loadingText.setVisible(false);
    this.percentText.setVisible(false);
    this.assetText.setVisible(false);

    // Sounds
    this.startSound = this.sound.add('blastoff');
    this.startSound.on('complete', this.startGame, this);

    this.startText.setVisible(true);
    this.input.on('pointerdown', () => {
      this.startText.setText(`Blast Off!`);
      this.startSound.play();
    } );

    this.scene.start('game');
  }

  startGame () {
    this.scene.start('game');
  }
}


const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
        //debug: true,
        fps: 60,
        gravity: { y: 0 }
    }
  },
  scene: [ Title, Game ],
};

let game = new Phaser.Game(config);