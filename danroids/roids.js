class Bullet extends Phaser.Physics.Arcade.Sprite {
  constructor (scene, x, y) { super(scene, x, y, 'bullet'); }

  fire (x, y, rotation) {
    this.body.reset(x, y);

    this.setActive(true);
    this.setVisible(true);

    this.setRotation(rotation);
    this.scene.physics.velocityFromRotation(rotation, 200, this.body.velocity);
  }

  preUpdate (time, delta) {
    super.preUpdate(time, delta);

    // if out of world bounds
    if (this.y <= -32) {
      this.setActive(false);
      this.setVisible(false);
    }
  }
}

class Bullets extends Phaser.Physics.Arcade.Group
{
  constructor (scene) {
    super(scene.physics.world, scene);

    this.createMultiple({
        frameQuantity: 100,
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
    }
  }
}

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
    this.load.image('bullet', 'assets/bullets.png');
    this.load.image('ship', 'assets/ship.png');
    this.load.image('muzzle-flash', 'assets/muzzle-flash.png');
  }

  create () {
    this.bullets = new Bullets(this);
  
    this.ship_image = this.add.image(0, 0, 'ship');
    this.muzzle = this.add.image(0, 0, 'muzzle-flash');
    this.muzzle.visible = false;
    this.thrust = this.add.image(-this.ship_image.width/2, 0, 'bullet');
    this.thrust.visible = false;
  
    this.ship = this.add.container(400, 300);
    this.ship.add([this.ship_image, this.muzzle, this.thrust]);
  
    this.physics.world.enable(this.ship);
    this.ship.body.setDamping(true);
    this.ship.body.setDrag(0.99);
    this.ship.body.setMaxVelocity(200);
  
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    //Phaser.Actions.Call(group.getChildren(), function (ball) {
    //    ball.body.onWorldBounds = true;
    //});

    //this.physics.world.on('worldbounds', onWorldBounds);
  }

  update () {
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
      this.muzzle.setVisible(true);
      let off = Phaser.Math.RotateAroundDistance({x: this.ship.x, y: this.ship.y},
          this.ship.x, this.ship.y, this.ship.rotation, this.muzzle.width / 2);
      this.bullets.fireBullet(off.x, off.y, this.ship.rotation);
  
      //let bullet = this.physics.add.image(0, 0, 'bullet');
      //bullet.setPosition(off.x, off.y);
      //bullet.rotation = ship.rotation;
      //this.physics.velocityFromRotation(bullet.rotation, 200, bullet.body.velocity);
    } else {
      this.muzzle.setVisible(false);
    }
  
    this.physics.world.wrap(this.ship, 0);
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
        fps: 60,
        gravity: { y: 0 }
    }
  },
  scene: Main
};

let game = new Phaser.Game(config);