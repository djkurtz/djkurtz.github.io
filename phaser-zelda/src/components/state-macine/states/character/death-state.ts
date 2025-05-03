import { CHARACTER_ANIMATIONS } from "../../../../common/assets";
import { isArcadePhysicsBody } from "../../../../common/utils";
import { CharacterGameObject } from "../../../../game-objects/common/game-object";
import { BaseCharacterState } from "./base-character-state";
import { CHARACTER_STATES } from "./character-states";

export class DeathState extends BaseCharacterState {
	#onDieCallback: () => void;

	constructor(gameObject: CharacterGameObject, onDieCallback: () => void = () => undefined) {
		super(CHARACTER_STATES.DEATH_STATE, gameObject);
		this.#onDieCallback = onDieCallback;
	}

	onEnter(): void {
		if (isArcadePhysicsBody(this._gameObject.body)) {
			this._gameObject.body.velocity.x = 0;
			this._gameObject.body.velocity.y = 0;
		}

		this._gameObject.invulnerableComponent.invulnerable = true;
		(this._gameObject.body as Phaser.Physics.Arcade.Body).enable = false;

		this._gameObject.animationComponent.playAnimation(CHARACTER_ANIMATIONS.DIE_DOWN, () => {
			this.#triggerDefeatedEvent();
		});
	}

	#triggerDefeatedEvent(): void {
		this._gameObject.disableObject();
		this.#onDieCallback();
	}
}