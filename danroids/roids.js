var config = {
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
  scene: {
      preload: preload,
      create: create,
      update: update
  }
};

var ship, ship_container, ship_image, muzzle, thrust;
var cursors;
var keySpace;
var text;

var game = new Phaser.Game(config);

function preload ()
{
  this.load.image('bullet', 'assets/bullets.png');
  this.load.image('ship', 'assets/ship.png');
  this.load.image('muzzle-flash', 'assets/muzzle-flash.png');
}

function create ()
{
  ship = this.add.container(400, 300);

  ship_image = this.add.image(0, 0, 'ship');
  muzzle = this.add.image(0, 0, 'muzzle-flash');
  muzzle.visible = false;
  bullet = this.add.image(-ship_image.width/2, 0, 'bullet');
  bullet.visible = false;

  ship.add([ship_image, muzzle, bullet]);

  this.physics.world.enable(ship);
  ship.body.setDamping(true);
  ship.body.setDrag(0.99);
  ship.body.setMaxVelocity(200);

  cursors = this.input.keyboard.createCursorKeys();
  keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

  text = this.add.text(10, 10, '', { font: '16px Courier', fill: '#00ff00' });
}

function update ()
{
  if (cursors.up.isDown) {
    this.physics.velocityFromRotation(ship.rotation, 200, ship.body.acceleration);
    bullet.visible = true;
  } else {
    ship.body.setAcceleration(0);
    bullet.visible = false;
  }

  if (cursors.left.isDown) {
    ship.body.setAngularVelocity(-300);
  } else if (cursors.right.isDown) {
    ship.body.setAngularVelocity(300);
  } else {
    ship.body.setAngularVelocity(0);
  }

  //text.setText('Speed: ' + ship.body.speed);

  if (this.input.keyboard.checkDown(keySpace, 100)) {
    muzzle.setVisible(true);
  } else {
    muzzle.setVisible(false);
  }

  this.physics.world.wrap(ship, 32);

  // bullets.forEachExists(screenWrap, this);
}

class Bullet extends Phaser.Physics.Arcade.Sprite {
  constructor (scene, x, y) { super(scene, x, y, 'bullet'); }

  fire (x, y)
  {
    this.body.reset(x, y);

    this.setActive(true);
    this.setVisible(true);

    this.setVelocityY(-300);
  }

  preUpdate (time, delta)
  {
    super.preUpdate(time, delta);

    if (this.y <= -32)
    {
      this.setActive(false);
      this.setVisible(false);
    }
  }
}

class Bullets extends Phaser.Physics.Arcade.Group
{
    constructor (scene)
    {
        super(scene.physics.world, scene);

        this.createMultiple({
            frameQuantity: 5,
            key: 'bullet',
            active: false,
            visible: false,
            classType: Bullet
        });
    }

    fireBullet (x, y)
    {
        let bullet = this.getFirstDead(false);

        if (bullet)
        {
            bullet.fire(x, y);
        }
    }
}
