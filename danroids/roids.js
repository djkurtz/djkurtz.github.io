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
        frameQuantity: 20,
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

class Main extends Phaser.Scene
{
  constructor ()
  {
    super();

    this.bullets;
    this.ship;
    this.ship_image;
    this.muzzle;
    this.thrust;
    this.cursors;
    this.keySpace;
  }

  preload () {
    this.load.setPath('assets/');

    this.load.image('bullet', 'bullets.png');
    this.load.image('ship', 'ship.png');
    this.load.image('muzzle-flash', 'muzzle-flash.png');
    this.load.image('asteroid1', 'asteroid1.png');
    this.load.image('asteroid2', 'asteroid2.png');

    this.load.audio('death', 'death.mp3');
    this.load.audio('laser', 'laser-45816.mp3');
    this.load.audio('ship-explosion', 'small-explosion-103779.mp3');
    this.load.audio('rock-explosion', 'small-explosion-103931.mp3');
  }

  create () {
    this.bullets = new Bullets(this);
  
    this.ship_image = this.add.image(0, 0, 'ship');
    //this.ship_image.setPosition(this.ship_image.width/2, this.ship_image.height/2);
    this.ship_image.setOrigin(0.5);
//    this.muzzle = this.add.image(this.ship_image.width/2, this.ship_image.height/2, 'muzzle-flash');
    this.muzzle = this.add.image(0, 0, 'muzzle-flash');
    this.muzzle.setOrigin(0.5);
    this.muzzle.visible = false;
    this.thrust = this.add.image(-this.ship_image.width/2, 0, 'bullet');
    //    this.thrust = this.add.image(0, this.ship_image.height/2, 'bullet');
    this.thrust.setOrigin(0.5);
    this.thrust.visible = false;
  
    this.ship = this.add.container(400, 300, [this.ship_image, this.muzzle, this.thrust]);
    this.ship.state = State.alive;
  
    this.physics.world.enable(this.ship);
    this.ship.body.setSize(this.ship_image.width, this.ship_image.height, false);
    this.ship.body.setDamping(true);  
    this.ship.body.setDrag(0.99);
    this.ship.body.setMaxVelocity(200);
  
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.asteroidGroup = this.physics.add.group({
      key: ['asteroid1', 'asteroid2'],
      repeat: 5,
      randomKey: true,
    });

    this.asteroidGroup.children.iterate(this.createAsteroid, this);

    //  When the player sprite hits asteroid
    this.physics.add.overlap(this.ship, this.asteroidGroup, this.shipHitAsteroid, null, this);
    this.physics.add.overlap(this.bullets, this.asteroidGroup, this.bulletHitAsteroid, null, this);

    // Add a new asteroid every 1 sec
    this.timedEvent = this.time.addEvent({ delay: 1000, callback: this.newAsteroid, callbackScope: this, loop: true });

    // UI
    this.health = 30;
    this.score = 0;
    this.score_box = this.add.text(10, 10, 'Score: ' + this.score, { font: '32px Courier', fill: '#ffffff' });
    this.health_box = this.add.text(10, 42, 'Health: ' + this.health, { font: '32px Courier', fill: '#ffffff' });

    // Sounds
    this.sounds = {
        death: this.sound.add('death'),
        laser: this.sound.add('laser'),
        ship_explosion: this.sound.add('ship-explosion'),
        rock_explosion: this.sound.add('rock-explosion'),
    };
  }

  newAsteroid () {
    let exclusion = new Phaser.Geom.Rectangle(
      this.ship.x - 50, this.ship.y - 50, 200, 200);
    let p = Phaser.Geom.Rectangle.RandomOutside(this.physics.world.bounds, exclusion);
    let asteroid = this.asteroidGroup.create(p.x, p.y, 'asteroid1');
    asteroid.setVelocity(Phaser.Math.Between(-150, 150), Phaser.Math.Between(-150, 150));
    asteroid.setAngularVelocity(Phaser.Math.Between(-180, 180));
  }

  createAsteroid (asteroid) {
    let exclusion = new Phaser.Geom.Rectangle(
        this.ship.x - 50, this.ship.y - 50, 200, 200);
    let p = Phaser.Geom.Rectangle.RandomOutside(this.physics.world.bounds, exclusion);
    asteroid.setPosition(p.x, p.y);
    asteroid.setVelocity(Phaser.Math.Between(-150, 150), Phaser.Math.Between(-150, 150));
    asteroid.setAngularVelocity(Phaser.Math.Between(-180, 180));
  }

  shipHitAsteroid (ship, asteroid) {
    //asteroid.disableBody(true, true);
    asteroid.destroy();
    this.sounds.ship_explosion.play();

    this.health = Phaser.Math.MinSub(this.health, 10, 0);
    if (this.health === 0) {
      this.ship.state = State.dead;
      this.sounds.death.play();
      ship.destroy();
    }
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
        this.thrust.visible = true;
      } else {
        this.ship.body.setAcceleration(0);
        this.thrust.visible = false;
      }
    
      if (this.cursors.left.isDown) {
        this.ship.body.setAngularVelocity(-300);
      } else if (this.cursors.right.isDown) {
        this.ship.body.setAngularVelocity(300);
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
    this.physics.world.wrap(this.asteroidGroup, 32);

    this.health_box.setText('Health: ' + this.health);
    this.score_box.setText('Score: ' + this.score);
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#000000',
  parent: 'phaser-example',
  scale: {
    mode: Phaser.Scale.FIT,
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
  scene: Main
};

let game = new Phaser.Game(config);