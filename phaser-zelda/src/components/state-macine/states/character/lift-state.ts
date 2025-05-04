import { GameObject } from "../../../../common/types";
import { isArcadePhysicsBody } from "../../../../common/utils";
import { CharacterGameObject } from "../../../../game-objects/common/game-object";
import { HeldGameObjectComponent } from "../../../game-object/held-game-object-component";
import { BaseCharacterState } from "./base-character-state";
import { CHARACTER_STATES } from "./character-states";

export class LiftState extends BaseCharacterState {
	constructor(gameObject: CharacterGameObject) {
		super(CHARACTER_STATES.LIFT_STATE, gameObject);
	}

	onEnter(args: unknown[]): void {
		const gameObjectBeingPickedUp = args[0] as GameObject;

		// reset game object velocity
		if (isArcadePhysicsBody(this._gameObject.body)) {
			this._gameObject.body.velocity.x = 0;
			this._gameObject.body.velocity.y = 0;
		}

		const heldComponent = HeldGameObjectComponent.getComponent<HeldGameObjectComponent>(this._gameObject);
		if (heldComponent === undefined) {
			this._stateMachine.setState(CHARACTER_STATES.IDLE_STATE);
			return;
		}
		heldComponent.object = gameObjectBeingPickedUp;
		if (isArcadePhysicsBody(gameObjectBeingPickedUp.body)) {
			gameObjectBeingPickedUp.body.enable = false;
		}
		gameObjectBeingPickedUp.setDepth(2).setOrigin(0.5, 0.5);

		this._gameObject.animationComponent.playAnimation(`LIFT_${this._gameObject.direction}`);
	}

	onUpdate(): void {
		if (this._gameObject.animationComponent.isAnimationPlaying()) {
			return;
		}

		this._stateMachine.setState(CHARACTER_STATES.IDLE_HOLDING_STATE);
	}
}