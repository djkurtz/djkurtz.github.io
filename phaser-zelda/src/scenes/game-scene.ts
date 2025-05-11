import * as Phaser from 'phaser';
import { SCENE_KEYS } from './scene-keys';
import { ASSET_KEYS } from '../common/assets';
import { Player } from '../game-objects/player/player';
import { KeyboardComponent } from '../components/input/keyboad-component';
import { Spider } from '../game-objects/enemies/spider';
import { Wisp } from '../game-objects/enemies/wisp';
import { CharacterGameObject } from '../game-objects/common/game-object';
import { DIRECTION } from '../common/common';
import * as CONFIG from '../common/config';
import { Pot } from '../game-objects/objects/pot';
import { Chest } from '../game-objects/objects/chest';
import { GameObject, LevelData } from '../common/types';
import { CUSTOM_EVENTS, EVENT_BUS } from '../common/event-bus';
import { exhaustiveGuard, getDirectionOfObjectFromAnotherObject, isArcadePhysicsBody, isLevelName } from '../common/utils';
import { TiledRoomObject } from '../common/tiled/types';
import { getAllLayerNamesWithPrefix, getTiledChestObjectsFromMap, getTiledDoorObjectsFromMap, getTiledEnemyObjectsFromMap, getTiledPotObjectsFromMap, getTiledRoomObjectsFromMap, getTiledSwitchObjectsFromMap } from '../common/tiled/tiled-utils';
import { Door } from '../game-objects/objects/door';
import { Button } from '../game-objects/objects/button';
import { DOOR_TYPE, SWITCH_ACTION, TILED_LAYER_NAMES, TRAP_TYPE } from '../common/tiled/common';

export class GameScene extends Phaser.Scene {
  #levelData!: LevelData;
  #controls!: KeyboardComponent;
  #player!: Player;
  #blockingGroup!: Phaser.GameObjects.Group;
  #objectsByRoomId!: {
    [key: number]: {
      chestMap: { [key: number]: Chest },
      doorMap: { [key: number]: Door },
      doors: Door[],
      switches: Button[],
      pots: Pot[],
      chests: Chest[],
      enemyGroup?: Phaser.GameObjects.Group,
      room: TiledRoomObject;
    }
  };
  #collisionLayer!: Phaser.Tilemaps.TilemapLayer;
  #enemyCollisionLayer!: Phaser.Tilemaps.TilemapLayer;
  #doorTransitionGroup!: Phaser.GameObjects.Group;
  #currentRoomId!: number;
  #lockedDoorGroup!: Phaser.GameObjects.Group;
  #switchGroup!: Phaser.GameObjects.Group;

  constructor() {
    super({
      key: SCENE_KEYS.GAME_SCENE,
    });
  }

  public init(data: LevelData): void {
    console.log(data);
    this.#levelData = data;
    this.#currentRoomId = data.roomId;
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

    this.#registerColliders();
    this.#registerCustomEvents();
  }

  #registerColliders(): void {
    this.#collisionLayer.setCollision([this.#collisionLayer.tileset[0].firstgid]);
    this.#enemyCollisionLayer.setCollision([this.#enemyCollisionLayer.tileset[0].firstgid]);

    // collision between player and map walls
    this.physics.add.collider(this.#player, this.#collisionLayer);

    // collision between player and game objects
    this.physics.add.overlap(this.#player, this.#doorTransitionGroup, (playerObj, doorObj) => {
      this.#handleRoomTransition(doorObj as Phaser.Types.Physics.Arcade.GameObjectWithBody);
    });

    // register collisions between player and blocking game objects
    this.physics.add.collider(this.#player, this.#blockingGroup, (player, gameObject) => {
      this.#player.collidedWithGameObject(gameObject as GameObject);
    });

    // collisions between player and switches that can be stepped on
    this.physics.add.overlap(this.#player, this.#switchGroup, (playerObj, switchObj) => {
      this.#handleButtonPress(switchObj as Button);
    });

    Object.keys(this.#objectsByRoomId).forEach((key) => {
      const roomId = parseInt(key, 10);
      if (this.#objectsByRoomId[roomId] === undefined) {
        return;
      }

      if (this.#objectsByRoomId[roomId].enemyGroup !== undefined) {
        // collide with walls, doors, etc.
        this.physics.add.collider(this.#objectsByRoomId[roomId].enemyGroup, this.#enemyCollisionLayer);

        // register collisions between enemies and curent "room"
        this.physics.add.overlap(this.#player, this.#objectsByRoomId[roomId].enemyGroup, (player, enemy) => {
          this.#player.hit(DIRECTION.DOWN, 1);
          const enemyGameObject = enemy as CharacterGameObject;
          enemyGameObject.hit(this.#player.direction, 1);
        });

        this.physics.add.collider(this.#objectsByRoomId[roomId].enemyGroup, this.#blockingGroup, (enemy, gameObject) => {
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

      }

      if (this.#objectsByRoomId[roomId].pots.length > 0) {
        this.physics.add.collider(this.#objectsByRoomId[roomId].pots, this.#blockingGroup, (pot) => {
          if (!(pot instanceof Pot)) {
            return;
          }
          pot.break();
        })

        this.physics.add.collider(this.#objectsByRoomId[roomId].pots, this.#collisionLayer, (pot) => {
          if (!(pot instanceof Pot)) {
            return;
          }
          pot.break();
        })
      }
    })
  }

  #registerCustomEvents(): void {
    EVENT_BUS.on(CUSTOM_EVENTS.OPENED_CHEST, this.#handleOpenChest, this);
    EVENT_BUS.on(CUSTOM_EVENTS.ENEMY_DESTROYED, this.#checkForAllEnemiesAreDefeated, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EVENT_BUS.off(CUSTOM_EVENTS.OPENED_CHEST, this.#handleOpenChest, this);
      EVENT_BUS.off(CUSTOM_EVENTS.ENEMY_DESTROYED, this.#checkForAllEnemiesAreDefeated, this);
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
    this.#collisionLayer.setDepth(2).setAlpha(CONFIG.DEBUG_COLLISION_ALPHA);

    const enemyCollisionLayer = map.createLayer(TILED_LAYER_NAMES.ENEMY_COLLISION, collisionTiles, 0, 0);
    if (enemyCollisionLayer === null) {
      console.log(`encountered error while creating enemyCollisionLayer layer using data from tiled.`);
      return;
    }
    this.#enemyCollisionLayer = enemyCollisionLayer;
    this.#enemyCollisionLayer.setDepth(2).setVisible(false);

    // Initialize objects
    this.#objectsByRoomId = {};
    this.#doorTransitionGroup = this.add.group([]);
    this.#blockingGroup = this.add.group([]);
    this.#lockedDoorGroup = this.add.group([]);
    this.#switchGroup = this.add.group({});

    // Create game objects
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
    const roomSize = this.#objectsByRoomId[this.#levelData.roomId].room;
    this.cameras.main.setBounds(roomSize.x, roomSize.y - roomSize.height, roomSize.width, roomSize.height);
    this.cameras.main.startFollow(this.#player);
  }

  #setupPlayer(): void {
    const startingDoor = this.#objectsByRoomId[this.#levelData.roomId].doorMap[this.#levelData.doorId];
    console.log(startingDoor);
    const playerStartPosition = {
      x: startingDoor.x + startingDoor.doorTransitionZone.width / 2,
      y: startingDoor.y - startingDoor.doorTransitionZone.height / 2,
    };
    console.log(playerStartPosition);
    switch (startingDoor.direction) {
      case DIRECTION.UP:
        playerStartPosition.y += 40;
        break;
      case DIRECTION.DOWN:
        playerStartPosition.y -= 40;
        break;
      case DIRECTION.LEFT:
        playerStartPosition.x += 40;
        break;
      case DIRECTION.RIGHT:
        playerStartPosition.x -= 40;
        break;
      default:
        exhaustiveGuard(startingDoor.direction);
    };
    this.#player = new Player({
      scene: this,
      position: { x: playerStartPosition.x, y: playerStartPosition.y },
      controls: this.#controls,
      maxLife: CONFIG.PLAYER_START_MAX_LIFE,
      currentLife: CONFIG.PLAYER_START_MAX_LIFE,
    })
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
    const validTiledObjects = getTiledDoorObjectsFromMap(map, layerName);
    validTiledObjects.forEach((tileObject) => {
      const door = new Door(this, tileObject, roomId);
      this.#objectsByRoomId[roomId].doors.push(door);
      this.#objectsByRoomId[roomId].doorMap[tileObject.id] = door;
      this.#doorTransitionGroup.add(door.doorTransitionZone);

      if (door.doorObject === undefined) {
        return;
      }

      if (door.doorType === DOOR_TYPE.LOCK || door.doorType === DOOR_TYPE.BOSS) {
        this.#lockedDoorGroup.add(door.doorObject);
        return;
      }
      this.#blockingGroup.add(door.doorObject);
    });

  }

  #createButtons(map: Phaser.Tilemaps.Tilemap, layerName: string, roomId: number): void {
    const validTiledObjects = getTiledSwitchObjectsFromMap(map, layerName);
    validTiledObjects.forEach((tileObject) => {
      const button = new Button(this, tileObject);
      this.#objectsByRoomId[roomId].switches.push(button);
      this.#switchGroup.add(button)
    })
  }

  #createPots(map: Phaser.Tilemaps.Tilemap, layerName: string, roomId: number): void {
    const validTiledObjects = getTiledPotObjectsFromMap(map, layerName);
    validTiledObjects.forEach((tileObject) => {
      const pot = new Pot(this, tileObject);
      this.#objectsByRoomId[roomId].pots.push(pot);
      this.#blockingGroup.add(pot);
    })
  }

  #createChests(map: Phaser.Tilemaps.Tilemap, layerName: string, roomId: number): void {
    const validTiledObjects = getTiledChestObjectsFromMap(map, layerName);
    validTiledObjects.forEach((tileObject) => {
      const chest = new Chest(this, tileObject);
      this.#objectsByRoomId[roomId].chests.push(chest);
      this.#objectsByRoomId[roomId].chestMap[chest.id] = chest;
      this.#blockingGroup.add(chest);
    })
  }

  #createEnemies(map: Phaser.Tilemaps.Tilemap, layerName: string, roomId: number): void {
    const validTiledObjects = getTiledEnemyObjectsFromMap(map, layerName);
    if (this.#objectsByRoomId[roomId].enemyGroup === undefined) {
      this.#objectsByRoomId[roomId].enemyGroup = this.add.group([], {
        runChildUpdate: true,
      });
    }
    for (const tiledObject of validTiledObjects) {
      if (tiledObject.type !== 1 && tiledObject.type !== 2 && tiledObject.type !== 3) {
        continue;
      }
      if (tiledObject.type === 1) {
        const spider = new Spider({
          scene: this,
          position: { x: tiledObject.x, y: tiledObject.y },
        });
        this.#objectsByRoomId[roomId].enemyGroup.add(spider);
        continue;
      }
      if (tiledObject.type === 2) {
        const spider = new Wisp({
          scene: this,
          position: { x: tiledObject.x, y: tiledObject.y },
        });
        this.#objectsByRoomId[roomId].enemyGroup.add(spider);
        continue;
      }
      if (tiledObject.type === 3) {
        // TODO: create boss enemy
        continue;
      }
    }
  }

  #handleRoomTransition(doorTrigger: Phaser.Types.Physics.Arcade.GameObjectWithBody): void {
    console.log(doorTrigger.name);
    this.#controls.isMovingLocked = true;
    const door = this.#objectsByRoomId[this.#currentRoomId].doorMap[doorTrigger.name] as Door;
    const modifiedLevelName = door.targetLevel.toUpperCase();
    if (isLevelName(modifiedLevelName)) {
      const sceneData: LevelData = {
        level: modifiedLevelName,
        roomId: door.targetRoomId,
        doorId: door.targetDoorId,
      };
      this.scene.start(SCENE_KEYS.GAME_SCENE, sceneData);
      return;
    }
    const targetDoor = this.#objectsByRoomId[door.targetRoomId].doorMap[door.targetDoorId];

    door.disableObject();
    targetDoor.disableObject();

    const targetDirection = getDirectionOfObjectFromAnotherObject(door, targetDoor);
    const doorDistance = {
      x: Math.abs((door.doorTransitionZone.x - targetDoor.doorTransitionZone.x) / 2),
      y: Math.abs((door.doorTransitionZone.y - targetDoor.doorTransitionZone.y) / 2),
    };
    if (targetDirection === DIRECTION.UP) {
      doorDistance.y *= -1;
    }
    if (targetDirection === DIRECTION.LEFT) {
      doorDistance.x *= -1;
    }

    const playerTargetPosition = {
      x: door.x + door.doorTransitionZone.width / 2 + doorDistance.x,
      y: door.y - door.doorTransitionZone.height / 2 + doorDistance.y,
    }
    this.tweens.add({
      targets: this.#player,
      y: playerTargetPosition.y,
      x: playerTargetPosition.x,
      duration: CONFIG.ROOM_TRANSITION_PLAYER_INTO_HALL_DURATION,
      delay: CONFIG.ROOM_TRANSITION_PLAYER_INTO_HALL_DELAY,
    });

    const roomSize = this.#objectsByRoomId[targetDoor.roomId].room;
    this.cameras.main.setBounds(
      this.cameras.main.worldView.x,
      this.cameras.main.worldView.y,
      this.cameras.main.worldView.width,
      this.cameras.main.worldView.height,
    );
    this.cameras.main.stopFollow();
    const bounds = this.cameras.main.getBounds();
    this.tweens.add({
      targets: bounds,
      x: roomSize.x,
      y: roomSize.y - roomSize.height,
      duration: CONFIG.ROOM_TRANSITION_CAMERA_ANIMATION_DURATION,
      delay: CONFIG.ROOM_TRANSITION_CAMERA_ANIMATION_DELAY,
      onUpdate: () => {
        this.cameras.main.setBounds(bounds.x, bounds.y, roomSize.width, roomSize.height);
      },
    });

    // animate player into room
    const playerDistanceToMoveIntoRoom = {
      x: doorDistance.x * 2,
      y: doorDistance.y * 2,
    };

    if (targetDirection === DIRECTION.UP || targetDirection === DIRECTION.DOWN) {
      playerDistanceToMoveIntoRoom.y = Math.max(Math.abs(playerDistanceToMoveIntoRoom.y), 32);
      if (targetDirection === DIRECTION.UP) {
        playerDistanceToMoveIntoRoom.y *= -1;
      }
    } else {
      playerDistanceToMoveIntoRoom.x = Math.max(Math.abs(playerDistanceToMoveIntoRoom.x), 32);
      if (targetDirection === DIRECTION.LEFT) {
        playerDistanceToMoveIntoRoom.x *= -1;
      }
    }

    this.tweens.add({
      targets: this.#player,
      y: playerTargetPosition.y + playerDistanceToMoveIntoRoom.y,
      x: playerTargetPosition.x + playerDistanceToMoveIntoRoom.x,
      duration: CONFIG.ROOM_TRANSITION_PLAYER_INTO_NEXT_ROOM_DURATION,
      delay: CONFIG.ROOM_TRANSITION_PLAYER_INTO_NEXT_ROOM_DELAY,
      onComplete: () => {
        targetDoor.enableObject();
        this.#currentRoomId = targetDoor.roomId;
        this.#checkForAllEnemiesAreDefeated();
        // update camera to follow player again
        this.cameras.main.startFollow(this.#player);
        // re-enable player input
        this.#controls.isMovingLocked = false;
      }
    });
  }

  #handleButtonPress(button: Button): void {
    const buttonPressedData = button.press();
    if (buttonPressedData.targetIds.length === 0 || buttonPressedData.action === SWITCH_ACTION.NOTHING) {
      return;
    }

    switch (buttonPressedData.action) {
      case SWITCH_ACTION.OPEN_DOOR:
        buttonPressedData.targetIds.forEach((id) => this.#objectsByRoomId[this.#currentRoomId].doorMap[id].open());
        break;
      case SWITCH_ACTION.REVEAL_CHEST:
        buttonPressedData.targetIds.forEach((id) => this.#objectsByRoomId[this.#currentRoomId].chestMap[id].reveal());
        break;
      case SWITCH_ACTION.REVEAL_KEY:
        break;
      default:
        exhaustiveGuard(buttonPressedData.action);
    }
  }

  #checkForAllEnemiesAreDefeated(): void {
    const enemyGroup = this.#objectsByRoomId[this.#currentRoomId].enemyGroup;
    if (enemyGroup === undefined) {
      return;
    }
    const allRequiredEnemiesDefeated = enemyGroup.getChildren().every((child) => {
      if (!child.active) {
        return true;
      }
      if (child instanceof Wisp) {
        return true;
      }
      return false;
    });
    if (allRequiredEnemiesDefeated) {
      this.#handleAllEnemiesDefeated();
    }
  }

  #handleAllEnemiesDefeated(): void {
    this.#objectsByRoomId[this.#currentRoomId].chests.forEach((chest) => {
      if (chest.revealTrigger === TRAP_TYPE.ENEMIES_DEFEATED) {
        chest.reveal();
      }
    });
    this.#objectsByRoomId[this.#currentRoomId].doors.forEach((door) => {
      if (door.trapDoorTrigger === TRAP_TYPE.ENEMIES_DEFEATED) {
        door.open();
      }
    });
  }
}
