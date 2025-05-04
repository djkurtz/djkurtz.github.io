import { isArcadePhysicsBody } from "../../../../common/utils";
import { CharacterGameObject } from "../../../../game-objects/common/game-object";
import { BaseCharacterState } from "./base-character-state";
import { CHARACTER_STATES } from "./character-states";

export class IdleHoldingState extends BaseCharacterState {
	constructor(gameObject: CharacterGameObject) {
		super(CHARACTER_STATES.IDLE_HOLDING_STATE, gameObject);
	}

	onEnter(): void {

		this._gameObject.animationComponent.playAnimation(`IDLE_HOLD_${this._gameObject.direction}`);

		if (isArcadePhysicsBody(this._gameObject.body)) {
			this._gameObject.body.velocity.x = 0;
			this._gameObject.body.velocity.y = 0;
		}
	}

	onUpdate(): void {
		const controls = this._gameObject.controls;

		if (controls.isActionJustDown) {
			this._stateMachine.setState(CHARACTER_STATES.THROW_STATE);
			return;
		}

		if (!controls.isUpDown && !controls.isDownDown && !controls.isLeftDown && !controls.isRightDown)
			return;

		this._stateMachine.setState(CHARACTER_STATES.MOVE_HOLDING_STATE);
	}
}