import { isArcadePhysicsBody } from "../../../../common/utils";
import { CharacterGameObject } from "../../../../game-objects/common/game-object";
import { BaseCharacterState } from "./base-character-state";
import { CHARACTER_STATES } from "./character-states";

export class LiftState extends BaseCharacterState {
	constructor(gameObject: CharacterGameObject) {
		super(CHARACTER_STATES.LIFT_STATE, gameObject);
	}

	onEnter(): void {
		// reset game object velocity
		if (isArcadePhysicsBody(this._gameObject.body)) {
			this._gameObject.body.velocity.x = 0;
			this._gameObject.body.velocity.y = 0;
		}

		this._gameObject.animationComponent.playAnimation(`LIFT_${this._gameObject.direction}`);
	}

	onUpdate(): void {
		if (this._gameObject.animationComponent.isAnimationPlaying()) {
			return;
		}

		this._stateMachine.setState(CHARACTER_STATES.IDLE_HOLDING_STATE);
	}
}