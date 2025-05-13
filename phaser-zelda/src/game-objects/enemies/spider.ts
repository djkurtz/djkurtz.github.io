import { ASSET_KEYS, SPIDER_ANIMATION_KEYS } from "../../common/assets";
import { DIRECTION } from "../../common/common";
import { ENEMY_SPIDER_CHANGE_DIRECTION_DELAY_MAX, ENEMY_SPIDER_CHANGE_DIRECTION_DELAY_MIN, ENEMY_SPIDER_CHANGE_DIRECTION_DELAY_WAIT, ENEMY_SPIDER_HURT_PUSHBACK_SPEED, ENEMY_SPIDER_SPEED, ENEMY_SPIDER_START_MAX_HEALTH } from "../../common/config";
import { Direction, Position } from "../../common/types";
import { exhaustiveGuard } from "../../common/utils";
import { AnimationConfig } from "../../components/game-object/animation-component";
import { InputComponent } from "../../components/input/input-component";
import { CHARACTER_STATES } from "../../components/state-macine/states/character/character-states";
import { DeathState } from "../../components/state-macine/states/character/death-state";
import { HurtState } from "../../components/state-macine/states/character/hurt-state";
import { IdleState } from "../../components/state-macine/states/character/idle-state";
import { MoveState } from "../../components/state-macine/states/character/move-state";
import { CharacterGameObject } from "../common/character-game-object";

export type SpiderConfig = {
	scene: Phaser.Scene;
	position: Position;
}

export class Spider extends CharacterGameObject {
	constructor(config: SpiderConfig) {
		// create animation config for component
		const animConfig = { key: SPIDER_ANIMATION_KEYS.WALK, repeat: -1, ignoreIfPlaying: true };
		const hurtAnimConfig = { key: SPIDER_ANIMATION_KEYS.HIT, repeat: 0, ignoreIfPlaying: true };
		const dieAnimConfig = { key: SPIDER_ANIMATION_KEYS.DEATH, repeat: 0, ignoreIfPlaying: true };
		const animationConfig: AnimationConfig = {
			WALK_DOWN: animConfig,
			WALK_UP: animConfig,
			WALK_LEFT: animConfig,
			WALK_RIGHT: animConfig,
			IDLE_DOWN: animConfig,
			IDLE_UP: animConfig,
			IDLE_LEFT: animConfig,
			IDLE_RIGHT: animConfig,
			HURT_DOWN: hurtAnimConfig,
			HURT_UP: hurtAnimConfig,
			HURT_LEFT: hurtAnimConfig,
			HURT_RIGHT: hurtAnimConfig,
			DIE_DOWN: dieAnimConfig,
			DIE_UP: dieAnimConfig,
			DIE_LEFT: dieAnimConfig,
			DIE_RIGHT: dieAnimConfig,
		}

		super({
			scene: config.scene,
			position: config.position,
			assetKey: ASSET_KEYS.SPIDER,
			frame: 0,
			id: `spider-${Phaser.Math.RND.uuid()}`,
			isPlayer: false,
			animationConfig,
			speed: ENEMY_SPIDER_SPEED,
			inputComponent: new InputComponent(),
			isInvulnerable: false,
			maxLife: ENEMY_SPIDER_START_MAX_HEALTH,
		});

		this._directionComponent.callback = (direction: Direction) => {
			this.#handleDirectionChange(direction);
		}

		// add state machine
		this._stateMachine.addState(new IdleState(this));
		this._stateMachine.addState(new MoveState(this));
		this._stateMachine.addState(new HurtState(this, ENEMY_SPIDER_HURT_PUSHBACK_SPEED));
		this._stateMachine.addState(new DeathState(this));
		this._stateMachine.setState(CHARACTER_STATES.IDLE_STATE);
	}

	public enableObject(): void {
		super.enableObject();

		// start simple ai movement pattern
		this.scene.time.addEvent({
			delay: Phaser.Math.Between(500, 1500),
			callback: this.#changeDirection,
			callbackScope: this,
			loop: false,
		});
	}

	#handleDirectionChange(direction: Direction): void {
		switch (direction) {
			case DIRECTION.DOWN:
				this.setAngle(0);
				break;
			case DIRECTION.UP:
				this.setAngle(180);
				break;
			case DIRECTION.LEFT:
				this.setAngle(90);
				break;
			case DIRECTION.RIGHT:
				this.setAngle(270);
				break;
			default:
				exhaustiveGuard(direction);
		}
	}

	#changeDirection(): void {
		// reset existing enemy input
		this.controls.reset();

		if (!this.active) {
			return;
		}
		
		this.scene.time.delayedCall(ENEMY_SPIDER_CHANGE_DIRECTION_DELAY_WAIT, () => {
			const randomDirection = Phaser.Math.Between(0, 3);
			if (randomDirection === 0) {
				this.controls.isUpDown = true;
			} else if (randomDirection === 1) {
				this.controls.isRightDown = true;
			} else if (randomDirection === 2) {
				this.controls.isDownDown = true;
			} else {
				this.controls.isLeftDown = true;
			}
		});

		this.scene.time.addEvent({
			delay: Phaser.Math.Between(ENEMY_SPIDER_CHANGE_DIRECTION_DELAY_MIN, ENEMY_SPIDER_CHANGE_DIRECTION_DELAY_MAX),
			callback: this.#changeDirection,
			callbackScope: this,
			loop: false,
		});
	}
}