import { isArcadePhysicsBody } from "../../../../common/utils";
import { CharacterGameObject } from "../../../../game-objects/common/game-object";
import { HeldGameObjectComponent } from "../../../game-object/held-game-object-component";
import { ThrowableObjectComponent } from "../../../game-object/throwable-object-component";
import { BaseCharacterState } from "./base-character-state";
import { CHARACTER_STATES } from "./character-states";

export class ThrowState extends BaseCharacterState {
	constructor(gameObject: CharacterGameObject) {
		super(CHARACTER_STATES.THROW_STATE, gameObject);
	}

	onEnter(): void {
		if (isArcadePhysicsBody(this._gameObject.body)) {
			this._gameObject.body.velocity.x = 0;
			this._gameObject.body.velocity.y = 0;
		}

		this._gameObject.animationComponent.playAnimationInReverse(`LIFT_${this._gameObject.direction}`);

		const heldComponent = HeldGameObjectComponent.getComponent<HeldGameObjectComponent>(this._gameObject);
		if (heldComponent === undefined || heldComponent.object === undefined) {
			return;
		}
		const throwComponent = ThrowableObjectComponent.getComponent<ThrowableObjectComponent>(heldComponent.object);
		if (throwComponent !== undefined) {
			throwComponent.throw(this._gameObject.direction);
		}
		heldComponent.drop();
	}

	public onUpdate(): void {
		if (this._gameObject.animationComponent.isAnimationPlaying()) {
			return;
		}

		this._stateMachine.setState(CHARACTER_STATES.IDLE_STATE);
	}
}