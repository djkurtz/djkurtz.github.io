import * as Phaser from 'phaser';
import { SCENE_KEYS } from './scene-keys';
import { ASSET_KEYS } from '../common/assets';
import { Player } from '../game-objects/player/player';
import { KeyboardComponent } from '../components/input/keyboad-component';
import { Spider } from '../game-objects/enemies/spider';
import { Wisp } from '../game-objects/enemies/wisp';
import { CharacterGameObject } from '../game-objects/common/game-object';
import { CHEST_STATE, DIRECTION } from '../common/common';
import { PLAYER_START_MAX_LIFE } from '../common/config';
import { Pot } from '../game-objects/objects/pot';
import { Chest } from '../game-objects/objects/chest';
import { GameObject } from '../common/types';
import { CUSTOM_EVENTS, EVENT_BUS } from '../common/event-bus';
import { isArcadePhysicsBody } from '../common/utils';

export class GameScene extends Phaser.Scene {
  #controls!: KeyboardComponent;
  #player!: Player;
  #enemyGroup!: Phaser.GameObjects.Group;
  #blockingGroup!: Phaser.GameObjects.Group;
  #potGameObjects!: Pot[];

  constructor() {
    super({
      key: SCENE_KEYS.GAME_SCENE,
    });
  }

  public create(): void {
    if (!this.input.keyboard) {
      console.warn('Phaser keyboard is not setup properly.');
      return;
    }

    this.#controls = new KeyboardComponent(this.input.keyboard);
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'Game Scene', { fontFamily: ASSET_KEYS.FONT_PRESS_START_2P })
      .setOrigin(0.5);
    this.#player = new Player({
      scene: this,
      position: { x: this.scale.width / 2, y: this.scale.height / 2 },
      controls: this.#controls,
      maxLife: PLAYER_START_MAX_LIFE,
      currentLife: PLAYER_START_MAX_LIFE,
    })

    this.#enemyGroup = this.add.group([
      new Spider({
        scene: this,
        position: { x: this.scale.width / 2, y: this.scale.height / 2 + 50 },
      }),
      new Wisp({
        scene: this,
        position: { x: this.scale.width / 2, y: this.scale.height / 2 - 50 },
      }),
    ],
      {
        runChildUpdate: true,
      },
    );

    this.#potGameObjects = [];
    const pot = new Pot({
      scene: this,
      position: { x: this.scale.width / 2 + 90, y: this.scale.height / 2 },
    });
    this.#potGameObjects.push(pot);

    this.#blockingGroup = this.add.group([
      pot,
      new Chest({
        scene: this,
        position: { x: this.scale.width / 2 - 90, y: this.scale.height / 2 },
        requiresBossKey: false,
      }),
      new Chest({
        scene: this,
        position: { x: this.scale.width / 2 - 90, y: this.scale.height / 2 - 80 },
        requiresBossKey: true,
      }),
    ]);

    this.#registerColliders();
    this.#registerCustomEvents();
  }

  #registerColliders(): void {
    this.#enemyGroup.getChildren().forEach((enemy) => {
      const enemyGameObject = enemy as CharacterGameObject;
      enemyGameObject.setCollideWorldBounds(true);
    });

    this.physics.add.overlap(this.#player, this.#enemyGroup, (player, enemy) => {
      this.#player.hit(DIRECTION.DOWN, 1);
      const enemyGameObject = enemy as CharacterGameObject;
      enemyGameObject.hit(this.#player.direction, 1);
    });

    this.physics.add.collider(this.#player, this.#blockingGroup, (player, gameObject) => {
      this.#player.collidedWithGameObject(gameObject as GameObject);
    });

    this.physics.add.collider(this.#enemyGroup, this.#blockingGroup, (enemy, gameObject) => {
      if (gameObject instanceof Pot && isArcadePhysicsBody(gameObject.body) && (gameObject.body.velocity.x !== 0 || gameObject.body.velocity.y !== 0)) {
        const enemyGameObject = enemy as CharacterGameObject;
        if (enemyGameObject instanceof CharacterGameObject) {
          enemyGameObject.hit(this.#player.direction, 1);
          gameObject.break();
        }
      }
    }, (enemy, gameObject) => {
      const body = (gameObject as unknown as GameObject).body;
      if (enemy instanceof Wisp && isArcadePhysicsBody(body) && (body.velocity.x !== 0 || body.velocity.y !== 0)) {
        return false;
      }
      return true;
    });

    if (this.#potGameObjects.length > 0) {
      this.physics.add.collider(this.#potGameObjects, this.#blockingGroup, (pot) => {
        if (!(pot instanceof Pot)) {
          return;
        }
        pot.break();
      })
    }
  }

  #registerCustomEvents(): void {
    EVENT_BUS.on(CUSTOM_EVENTS.OPENED_CHEST, this.#handleOpenChest, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EVENT_BUS.off(CUSTOM_EVENTS.OPENED_CHEST, this.#handleOpenChest, this);
    })
  }

  #handleOpenChest(chest: Chest): void {
    console.log('chest opened');
    // TODO: 
  }
}
