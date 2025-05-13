import { ASSET_KEYS, DROW_ANIMATION_KEYS } from "../../../common/assets";
import { ENEMY_BOSS_DROW_SPEED, BOSS_HURT_PUSH_BACK_DELAY, ENEMY_BOSS_DROW_DEATH_ANIMATION_DURATION, ENEMY_BOSS_DROW_START_MAX_HEALTH } from "../../../common/config";
import { flash } from "../../../common/juice-utils";
import { Position } from "../../../common/types";
import { AnimationConfig } from "../../../components/game-object/animation-component";
import { WeaponComponent } from "../../../components/game-object/weapon-component";
import { InputComponent } from "../../../components/input/input-component";
import { CHARACTER_STATES } from "../../../components/state-macine/states/character/character-states";
import { DeathState } from "../../../components/state-macine/states/character/death-state";
import { HurtState } from "../../../components/state-macine/states/character/hurt-state";
import { IdleState } from "../../../components/state-macine/states/character/idle-state";
import { CharacterGameObject } from "../../common/character-game-object";

export type DrowConfig = {
	scene: Phaser.Scene;
	position: Position;
}

export class Drow extends CharacterGameObject {
	#weaponComponent: WeaponComponent;

	constructor(config: DrowConfig) {
		// create animation config for component
		const hurtAnimConfig = { key:  DROW_ANIMATION_KEYS.HIT, repeat: 0, ignoreIfPlaying: true };
		const animationConfig: AnimationConfig = {
			WALK_DOWN: { key: DROW_ANIMATION_KEYS.WALK_DOWN, repeat: -1, ignoreIfPlaying: true },
			WALK_UP: { key: DROW_ANIMATION_KEYS.WALK_UP, repeat: -1, ignoreIfPlaying: true },
			WALK_LEFT: { key: DROW_ANIMATION_KEYS.WALK_LEFT, repeat: -1, ignoreIfPlaying: true },
			WALK_RIGHT: { key: DROW_ANIMATION_KEYS.WALK_RIGHT, repeat: -1, ignoreIfPlaying: true },

			HURT_DOWN: hurtAnimConfig,
			HURT_UP: hurtAnimConfig,
			HURT_LEFT: hurtAnimConfig,
			HURT_RIGHT: hurtAnimConfig,

			IDLE_DOWN: { key: DROW_ANIMATION_KEYS.IDLE_DOWN, repeat: -1, ignoreIfPlaying: true },
			IDLE_UP: { key: DROW_ANIMATION_KEYS.IDLE_UP, repeat: -1, ignoreIfPlaying: true },
			IDLE_LEFT: { key: DROW_ANIMATION_KEYS.IDLE_SIDE, repeat: -1, ignoreIfPlaying: true },
			IDLE_RIGHT: { key: DROW_ANIMATION_KEYS.IDLE_SIDE, repeat: -1, ignoreIfPlaying: true },
		}

		super({
			scene: config.scene,
			position: config.position,
			assetKey: ASSET_KEYS.DROW,
			frame: 0,
			id: `drow-${Phaser.Math.RND.uuid()}`,
			isPlayer: false,
			animationConfig,
			speed: ENEMY_BOSS_DROW_SPEED,
			inputComponent: new InputComponent(),
			isInvulnerable: false,
			maxLife: ENEMY_BOSS_DROW_START_MAX_HEALTH,
		});

		this.#weaponComponent = new WeaponComponent(this);

		// add state machine
		this._stateMachine.addState(new IdleState(this));
		this._stateMachine.addState(new HurtState(this, BOSS_HURT_PUSH_BACK_DELAY));
		this._stateMachine.addState(new DeathState(this, () => {
			this.visible = true;
			flash(this, () => {
				const fx = this.postFX.addWipe(0.1, 0, 1);
				this.scene.add.tween({
					targets: fx,
					progress: 1,
					duration: ENEMY_BOSS_DROW_DEATH_ANIMATION_DURATION,
					onComplete: () => {
						this.visible = false;
					}
				})
			})
		}));
		this._stateMachine.setState(CHARACTER_STATES.IDLE_STATE);

		this.setScale(1.25);
		this.physicsBody.setSize(12, 24, true).setOffset(this.displayWidth / 4, this.displayHeight / 4 - 3);
	}

	get physicsBody(): Phaser.Physics.Arcade.Body {
		return this.body as Phaser.Physics.Arcade.Body;
	}

	public update(): void {
		super.update();
		this.#weaponComponent.update();
	}
}