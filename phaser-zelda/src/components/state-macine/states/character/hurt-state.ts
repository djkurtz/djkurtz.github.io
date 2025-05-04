import { CHARACTER_ANIMATIONS } from "../../../../common/assets";
import { DIRECTION } from "../../../../common/common";
import { HURT_PUSH_BACK_DELAY } from "../../../../common/config";
import { Direction } from "../../../../common/types";
import { exhaustiveGuard, isArcadePhysicsBody } from "../../../../common/utils";
import { CharacterGameObject } from "../../../../game-objects/common/game-object";
import { DirectionComponent } from "../../../game-object/direction-component";
import { HeldGameObjectComponent } from "../../../game-object/held-game-object-component";
import { ThrowableObjectComponent } from "../../../game-object/throwable-object-component";
import { BaseCharacterState } from "./base-character-state";
import { CHARACTER_STATES } from "./character-states";

export class HurtState extends BaseCharacterState {
	#hurtPushBackSpeed: number;
	#onHurtCallback: () => void;
	#nextState: string;

	constructor(gameObject: CharacterGameObject, hurtPushBackSpeed: number, onHurtCallback: () => void = () => undefined, nextState: string = CHARACTER_STATES.IDLE_STATE) {
		super(CHARACTER_STATES.HURT_STATE, gameObject);

		this.#hurtPushBackSpeed = hurtPushBackSpeed;
		this.#onHurtCallback = onHurtCallback;
		this.#nextState = nextState;
	}

	public onEnter(args: unknown[]): void {
		const attackDirection = args[0] as Direction;

		// reset game object velocity
		this._resetObjectVelocity();

		const heldComponent = HeldGameObjectComponent.getComponent<HeldGameObjectComponent>(this._gameObject);
		if (heldComponent !== undefined && heldComponent.object !== undefined) {
			const throwComponent = ThrowableObjectComponent.getComponent<ThrowableObjectComponent>(heldComponent.object);
			if (throwComponent !== undefined) {
				throwComponent.drop();
			}
			heldComponent.drop();
		}

		if (isArcadePhysicsBody(this._gameObject.body)) {
			const body = this._gameObject.body;

			switch (attackDirection) {
				case DIRECTION.DOWN:
					body.velocity.y = this.#hurtPushBackSpeed;
					break;
				case DIRECTION.UP:
					body.velocity.y = this.#hurtPushBackSpeed * -1;
					break;
				case DIRECTION.LEFT:
					body.velocity.x = this.#hurtPushBackSpeed * -1;
					break;
				case DIRECTION.RIGHT:
					body.velocity.x = this.#hurtPushBackSpeed;
					break;
				default:
					exhaustiveGuard(attackDirection);
			}

			this._gameObject.scene.time.delayedCall(HURT_PUSH_BACK_DELAY, () => {
				this._resetObjectVelocity();
			})
		}

		this._gameObject.invulnerableComponent.invulnerable = true;
		this.#onHurtCallback();

		this._gameObject.animationComponent.playAnimation(CHARACTER_ANIMATIONS.HURT_DOWN, () => {
			this.#transition();
		});
	}

	#transition(): void {
		this._gameObject.scene.time.delayedCall(
			this._gameObject.invulnerableComponent.invulnerableAfterHitAnimationDuration,
			() => {
				this._gameObject.invulnerableComponent.invulnerable = false;
			},
		);
		this._stateMachine.setState(this.#nextState);
	}
}