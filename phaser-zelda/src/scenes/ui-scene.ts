import * as Phaser from 'phaser';
import { SCENE_KEYS } from './scene-keys';
import { ASSET_KEYS, ASSET_PACK_KEYS, HEART_ANIMATIONS, HEART_TEXTURE_FRAME } from '../common/assets';
import { LEVEL_NAME } from '../common/common';
import { DataManager } from '../common/data-manager';
import { LevelData } from '../common/types';
import { Player } from '../game-objects/player/player';
import { CUSTOM_EVENTS, EVENT_BUS, PLAYER_HEALTH_UPDATE_TYPE, PlayerHealthUpdated } from '../common/event-bus';

export class UiScene extends Phaser.Scene {
  #hudContainer: Phaser.GameObjects.Container;
  #hearts: Phaser.GameObjects.Sprite[];

  constructor() {
    super({
      key: SCENE_KEYS.UI_SCENE,
    });
  }

  public create(): void {
    this.#hudContainer = this.add.container(0, 0, []);
    this.#hearts = [];

    const numberOfHearts = Math.floor(DataManager.instance.data.maxHealth / 2);
    const numberOfFullHearts = Math.floor(DataManager.instance.data.currentHealth / 2);
    const hasHalfHeart = DataManager.instance.data.currentHealth % 2 === 1;
    for (let i = 0; i < 20; i += 1) {
      let x = 157 + 8 * i;
      let y = 25;
      if (i >= 10) {
        x = 157 + 8 * (i - 10);
        y = 33;
      }
      let frame: string = HEART_TEXTURE_FRAME.NONE;
      if (i < numberOfFullHearts) {
        frame = HEART_TEXTURE_FRAME.FULL;
      } else if (i < numberOfHearts) {
        frame = HEART_TEXTURE_FRAME.EMPTY;
      }
      if (hasHalfHeart && i === numberOfFullHearts) {
        frame = HEART_TEXTURE_FRAME.HALF;
      }
      this.#hearts.push(this.add.sprite(x, y, ASSET_KEYS.HUD_NUMBERS, frame).setOrigin(0));
    }
    this.#hudContainer.add(this.#hearts);

    EVENT_BUS.on(CUSTOM_EVENTS.PLAYER_HEALTH_UPDATED, this.updateHealthInHud, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EVENT_BUS.off(CUSTOM_EVENTS.PLAYER_HEALTH_UPDATED, this.updateHealthInHud, this);
    });
  }

  public async updateHealthInHud(data: PlayerHealthUpdated): Promise<void> {
    if (data.type === PLAYER_HEALTH_UPDATE_TYPE.INCREASE) {
      return;
    }

    const healthDifference = data.previousHealth - data.currentHealth;
    let health = data.previousHealth;
    for (let i = 0; i < healthDifference; i += 1) {
      const heartIndex = Math.round(health / 2) - 1;
      const isHalfHeart = health % 2 === 1;
      let animationName = HEART_ANIMATIONS.LOSE_LAST_HALF;
      if (!isHalfHeart) {
        animationName = HEART_ANIMATIONS.LOSE_FIRST_HALF;
      }
      await new Promise((resolve) => {
        this.#hearts[heartIndex].play(animationName);
        this.#hearts[heartIndex].once(Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + animationName, () => {
          resolve(undefined);
        });
      });
      health -= 1;
    }
  }
}
