import { CUSTOM_EVENTS, EVENT_BUS } from "../../../../common/event-bus";
import { isArcadePhysicsBody } from "../../../../common/utils";
import { CharacterGameObject } from "../../../../game-objects/common/character-game-object";
import { Chest } from "../../../../game-objects/objects/chest";
import { BaseCharacterState } from "./base-character-state";
import { CHARACTER_STATES } from "./character-states";

export class OpenChestState extends BaseCharacterState {
	constructor(gameObject: CharacterGameObject) {
		super(CHARACTER_STATES.OPEN_CHEST_STATE, gameObject);
	}

	onEnter(args: unknown[]): void {
		const chest = args[0] as Chest;

		this._resetObjectVelocity();

		this._gameObject.animationComponent.playAnimation(`LIFT_${this._gameObject.direction}`, () => {
			EVENT_BUS.emit(CUSTOM_EVENTS.OPENED_CHEST, chest);
			this._stateMachine.setState(CHARACTER_STATES.IDLE_STATE);
		});
	}
}