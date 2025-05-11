import { CHARACTER_ANIMATIONS } from "../../../../common/assets";
import { CUSTOM_EVENTS, EVENT_BUS } from "../../../../common/event-bus";
import { isArcadePhysicsBody } from "../../../../common/utils";
import { CharacterGameObject } from "../../../../game-objects/common/character-game-object";
import { HeldGameObjectComponent } from "../../../game-object/held-game-object-component";
import { ThrowableObjectComponent } from "../../../game-object/throwable-object-component";
import { BaseCharacterState } from "./base-character-state";
import { CHARACTER_STATES } from "./character-states";

export class DeathState extends BaseCharacterState {
	#onDieCallback: () => void;

	constructor(gameObject: CharacterGameObject, onDieCallback: () => void = () => undefined) {
		super(CHARACTER_STATES.DEATH_STATE, gameObject);
		this.#onDieCallback = onDieCallback;
	}

	onEnter(): void {
		this._resetObjectVelocity();

		const heldComponent = HeldGameObjectComponent.getComponent<HeldGameObjectComponent>(this._gameObject);
		if (heldComponent !== undefined && heldComponent.object !== undefined) {
			const throwComponent = ThrowableObjectComponent.getComponent<ThrowableObjectComponent>(heldComponent.object);
			if (throwComponent !== undefined) {
				throwComponent.drop();
			}
			heldComponent.drop();
		}

		this._gameObject.invulnerableComponent.invulnerable = true;
		(this._gameObject.body as Phaser.Physics.Arcade.Body).enable = false;

		this._gameObject.animationComponent.playAnimation(CHARACTER_ANIMATIONS.DIE_DOWN, () => {
			this.#triggerDefeatedEvent();
		});
	}

	#triggerDefeatedEvent(): void {
		this._gameObject.disableObject();
		if (this._gameObject.isEnemy) {
			EVENT_BUS.emit(CUSTOM_EVENTS.ENEMY_DESTROYED);
		} else {
			EVENT_BUS.emit(CUSTOM_EVENTS.PLAYER_DEFEATED);
		}
		this.#onDieCallback();
	}
}