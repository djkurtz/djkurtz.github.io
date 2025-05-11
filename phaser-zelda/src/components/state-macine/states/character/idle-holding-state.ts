import { isArcadePhysicsBody } from "../../../../common/utils";
import { CharacterGameObject } from "../../../../game-objects/common/character-game-object";
import { BaseCharacterState } from "./base-character-state";
import { CHARACTER_STATES } from "./character-states";

export class IdleHoldingState extends BaseCharacterState {
	constructor(gameObject: CharacterGameObject) {
		super(CHARACTER_STATES.IDLE_HOLDING_STATE, gameObject);
	}

	onEnter(): void {

		this._gameObject.animationComponent.playAnimation(`IDLE_HOLD_${this._gameObject.direction}`);

		this._resetObjectVelocity();
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