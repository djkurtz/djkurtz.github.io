import { isArcadePhysicsBody } from "../../../../common/utils";
import { CharacterGameObject } from "../../../../game-objects/common/character-game-object";
import { HeldGameObjectComponent } from "../../../game-object/held-game-object-component";
import { ThrowableObjectComponent } from "../../../game-object/throwable-object-component";
import { BaseCharacterState } from "./base-character-state";
import { CHARACTER_STATES } from "./character-states";

export class IdleState extends BaseCharacterState {
	constructor(gameObject: CharacterGameObject) {
		super(CHARACTER_STATES.IDLE_STATE, gameObject);
	}

	onEnter(): void {
		this._gameObject.animationComponent.playAnimation(`IDLE_${this._gameObject.direction}`);
		this._resetObjectVelocity();

		const heldComponent = HeldGameObjectComponent.getComponent<HeldGameObjectComponent>(this._gameObject);
		if (heldComponent !== undefined && heldComponent.object !== undefined) {
			const throwComponent = ThrowableObjectComponent.getComponent<ThrowableObjectComponent>(heldComponent.object);
			if (throwComponent !== undefined) {
				throwComponent.drop();
			}
			heldComponent.drop();
		}
	}

	onUpdate(): void {
		const controls = this._gameObject.controls;
		if (!controls.isUpDown && !controls.isDownDown && !controls.isLeftDown && !controls.isRightDown)
			return;

		this._stateMachine.setState(CHARACTER_STATES.MOVE_STATE);
	}
}