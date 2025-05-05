import * as Phaser from 'phaser';
import { SCENE_KEYS } from './scene-keys';
import { ASSET_KEYS } from '../common/assets';
import { Player } from '../game-objects/player/player';
import { KeyboardComponent } from '../components/input/keyboad-component';
import { Spider } from '../game-objects/enemies/spider';
import { Wisp } from '../game-objects/enemies/wisp';
import { CharacterGameObject } from '../game-objects/common/game-object';
import { CHEST_STATE, DIRECTION } from '../common/common';
import { DEBUG_COLLISION_ALPHA, PLAYER_START_MAX_LIFE } from '../common/config';
import { Pot } from '../game-objects/objects/pot';
import { Chest } from '../game-objects/objects/chest';
import { GameObject, LevelData } from '../common/types';
import { CUSTOM_EVENTS, EVENT_BUS } from '../common/event-bus';
import { isArcadePhysicsBody } from '../common/utils';
import { TiledRoomObject } from '../common/tiled/types';
import { getAllLayerNamesWithPrefix, getTiledChestObjectsFromMap, getTiledDoorObjectsFromMap, getTiledEnemyObjectsFromMap, getTiledPotObjectsFromMap, getTiledRoomObjectsFromMap, getTiledSwitchObjectsFromMap } from '../common/tiled/tiled-utils';
import { TILED_LAYER_NAMES } from '../common/tiled/common';

export class GameScene extends Phaser.Scene {
  #levelData!: LevelData;
  #controls!: KeyboardComponent;
  #player!: Player;
  #enemyGroup!: Phaser.GameObjects.Group;
  #blockingGroup!: Phaser.GameObjects.Group;
  #potGameObjects!: Pot[];
  #objectsByRoomId!: {
    [key: number]: {
      chestMap: { [key: number]: Chest },
      doorMap: { [key: number]: unknown },
      doors: unknown[],
      switches: unknown[],
      pots: Pot[],
      chests: Chest[],
      enemyGroup?: Phaser.GameObjects.Group,
      room: TiledRoomObject;
    }
  };
  #collisionLayer!: Phaser.Tilemaps.TilemapLayer;
  #enemyCollisionLayer!: Phaser.Tilemaps.TilemapLayer;

  constructor() {
    super({
      key: SCENE_KEYS.GAME_SCENE,
    });
  }

  public init(data: LevelData): void {
    console.log(data);
    this.#levelData = data;
  }

  public create(): void {
    if (!this.input.keyboard) {
      console.warn('Phaser keyboard is not setup properly.');
      return;
    }

    this.#controls = new KeyboardComponent(this.input.keyboard);

    this.#createLevel();
    if (this.#collisionLayer === undefined || this.#enemyCollisionLayer === undefined) {
      console.warn(`Missing required collisions layers for game.`);
      return;
    }
    this.#setupPlayer();
    this.#setupCamera();

    // TODO update from tile data
    this.#tempCode();

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

    this.#collisionLayer.setCollision([this.#collisionLayer.tileset[0].firstgid]);
    this.physics.add.collider(this.#player, this.#collisionLayer);

    this.#enemyCollisionLayer.setCollision([this.#enemyCollisionLayer.tileset[0].firstgid]);
    this.physics.add.collider(this.#enemyGroup, this.#enemyCollisionLayer);
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

  #createLevel(): void {
    this.add.image(0, 0, ASSET_KEYS[`${this.#levelData.level}_BACKGROUND`], 0).setOrigin(0);
    this.add.image(0, 0, ASSET_KEYS[`${this.#levelData.level}_FOREGROUND`], 0).setOrigin(0).setDepth(2);

    const map = this.make.tilemap({ key: ASSET_KEYS[`${this.#levelData.level}_LEVEL`] });

    const collisionTiles = map.addTilesetImage(TILED_LAYER_NAMES.COLLISION, ASSET_KEYS.COLLISION);
    if (collisionTiles === null) {
      console.log(`encountered error while creating collision tiles from tiled.`);
      return;
    }

    const collisionLayer = map.createLayer(TILED_LAYER_NAMES.COLLISION, collisionTiles, 0, 0);
    if (collisionLayer === null) {
      console.log(`encountered error while creating collision layer using data from tiled.`);
      return;
    }
    console.log(collisionLayer);
    this.#collisionLayer = collisionLayer;
    this.#collisionLayer.setDepth(2).setAlpha(DEBUG_COLLISION_ALPHA);

    const enemyCollisionLayer = map.createLayer(TILED_LAYER_NAMES.ENEMY_COLLISION, collisionTiles, 0, 0);
    if (enemyCollisionLayer === null) {
      console.log(`encountered error while creating enemyCollisionLayer layer using data from tiled.`);
      return;
    }
    this.#enemyCollisionLayer = enemyCollisionLayer;
    this.#enemyCollisionLayer.setDepth(2).setVisible(false);

    this.#objectsByRoomId = {};
    this.#createRooms(map, TILED_LAYER_NAMES.ROOMS);

    const rooms = getAllLayerNamesWithPrefix(map, TILED_LAYER_NAMES.ROOMS).map((layerName: string) => {
      return {
        name: layerName,
        roomId: parseInt(layerName.split('/')[1], 10),
      }
    });
    const switchLayerNames = rooms.filter((layer) => layer.name.endsWith(`/${TILED_LAYER_NAMES.SWITCHES}`));
    const potLayerNames = rooms.filter((layer) => layer.name.endsWith(`/${TILED_LAYER_NAMES.POTS}`));
    const doorLayerNames = rooms.filter((layer) => layer.name.endsWith(`/${TILED_LAYER_NAMES.DOORS}`));
    const chestLayerNames = rooms.filter((layer) => layer.name.endsWith(`/${TILED_LAYER_NAMES.CHESTS}`));
    const enemyLayerNames = rooms.filter((layer) => layer.name.endsWith(`/${TILED_LAYER_NAMES.ENEMIES}`));

    doorLayerNames.forEach((layer) => this.#createDoors(map, layer.name, layer.roomId));
    switchLayerNames.forEach((layer) => this.#createButtons(map, layer.name, layer.roomId));
    potLayerNames.forEach((layer) => this.#createPots(map, layer.name, layer.roomId));
    chestLayerNames.forEach((layer) => this.#createChests(map, layer.name, layer.roomId));
    enemyLayerNames.forEach((layer) => this.#createEnemies(map, layer.name, layer.roomId));
  }

  #setupCamera(): void {
    this.cameras.main.startFollow(this.#player);
  }

  #setupPlayer(): void {
    this.#player = new Player({
      scene: this,
      position: { x: this.scale.width / 2, y: this.scale.height / 2 },
      controls: this.#controls,
      maxLife: PLAYER_START_MAX_LIFE,
      currentLife: PLAYER_START_MAX_LIFE,
    })
  }

  #tempCode(): void {
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'Game Scene', { fontFamily: ASSET_KEYS.FONT_PRESS_START_2P })
      .setOrigin(0.5);

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
  }

  #createRooms(map: Phaser.Tilemaps.Tilemap, layerName: string): void {
    const validTiledObjects = getTiledRoomObjectsFromMap(map, layerName);
    validTiledObjects.forEach((tiledObject) => {
      this.#objectsByRoomId[tiledObject.id] = {
        switches: [],
        pots: [],
        doors: [],
        chests: [],
        room: tiledObject,
        chestMap: {},
        doorMap: {},
      }
    });
  }

  #createDoors(map: Phaser.Tilemaps.Tilemap, layerName: string, roomId: number): void {
    console.log(layerName, roomId);
    const validTiledObjects = getTiledDoorObjectsFromMap(map, layerName);
    console.log(validTiledObjects);
  }

  #createButtons(map: Phaser.Tilemaps.Tilemap, layerName: string, roomId: number): void {
    console.log(layerName, roomId);
    const validTiledObjects = getTiledSwitchObjectsFromMap(map, layerName);
    console.log(validTiledObjects);
  }

  #createPots(map: Phaser.Tilemaps.Tilemap, layerName: string, roomId: number): void {
    console.log(layerName, roomId);
    const validTiledObjects = getTiledPotObjectsFromMap(map, layerName);
    console.log(validTiledObjects);
  }

  #createChests(map: Phaser.Tilemaps.Tilemap, layerName: string, roomId: number): void {
    console.log(layerName, roomId);
    const validTiledObjects = getTiledChestObjectsFromMap(map, layerName);
    console.log(validTiledObjects);
  }

  #createEnemies(map: Phaser.Tilemaps.Tilemap, layerName: string, roomId: number): void {
    console.log(layerName, roomId);
    const validTiledObjects = getTiledEnemyObjectsFromMap(map, layerName);
    console.log(validTiledObjects);
  }

}
