import { DIRECTION, INTERACTIVE_OBJECT_TYPE } from "../../../../common/common";
import { Direction } from "../../../../common/types";
import { exhaustiveGuard, isArcadePhysicsBody } from "../../../../common/utils";
import { CharacterGameObject } from "../../../../game-objects/common/game-object";
import { CollidingObjectsComponent } from "../../../game-object/colliding-objects-component";
import { InteractiveObjectComponent } from "../../../game-object/interactive-object-component";
import { InputComponent } from "../../../input/input-component";
import { BaseCharacterState } from "./base-character-state";
import { CHARACTER_STATES } from "./character-states";

export class MoveState extends BaseCharacterState {
	constructor(gameObject: CharacterGameObject) {
		super(CHARACTER_STATES.MOVE_STATE, gameObject);
	}

	onUpdate(): void {
		const controls = this._gameObject.controls;

		// if no input is provided, change to idle state
		if (!controls.isUpDown && !controls.isDownDown && !controls.isLeftDown && !controls.isRightDown) {
			this._stateMachine.setState(CHARACTER_STATES.IDLE_STATE);
		}

		if (this.#checkIfObjectWasInteractedWith(controls)) {
			return;
		}

		if (controls.isUpDown) {
			this.#updateVelocity(false, -1);
			this.#updateDirection(DIRECTION.UP);
		} else if (controls.isDownDown) {
			this.#updateVelocity(false, 1);
			this.#updateDirection(DIRECTION.DOWN);
		} else {
			this.#updateVelocity(false, 0);
		}

		const isMovingVertically = controls.isDownDown || controls.isUpDown;
		if (controls.isLeftDown) {
			this._gameObject.setFlipX(true);
			this.#updateVelocity(true, -1);
			if (!isMovingVertically) {
				this.#updateDirection(DIRECTION.LEFT);
			}
		} else if (controls.isRightDown) {
			this._gameObject.setFlipX(false);
			this.#updateVelocity(true, 1);
			if (!isMovingVertically) {
				this.#updateDirection(DIRECTION.RIGHT);
			}
		} else {
			this.#updateVelocity(true, 0);
		}

		this.#normalizeVelocity();
	}

	#updateVelocity(isX: boolean, value: number): void {
		if (!isArcadePhysicsBody(this._gameObject.body)) {
			return;
		}
		if (isX) {
			this._gameObject.body.velocity.x = value;
			return;
		}
		this._gameObject.body.velocity.y = value;
	}

	#normalizeVelocity(): void {
		if (!isArcadePhysicsBody(this._gameObject.body)) {
			return;
		}
		this._gameObject.body.velocity.normalize().scale(this._gameObject.speed);
	}

	#updateDirection(direction: Direction): void {
		this._gameObject.direction = direction;
		this._gameObject.animationComponent.playAnimation(`WALK_${this._gameObject.direction}`);
	}

	#checkIfObjectWasInteractedWith(controls: InputComponent): boolean {
		const collideComponent = CollidingObjectsComponent.getComponent<CollidingObjectsComponent>(this._gameObject);
		if (collideComponent === undefined || collideComponent.objects.length === 0) {
			return false;
		}

		const collisionObject = collideComponent.objects[0];
		const interactiveObjectComponent = InteractiveObjectComponent.getComponent<InteractiveObjectComponent>(collisionObject);
		if (interactiveObjectComponent === undefined) {
			return false;
		}

		if (!controls.isActionJustDown) {
			return false;
		}

		if (interactiveObjectComponent.objectType === INTERACTIVE_OBJECT_TYPE.PICKUP) {
			this._stateMachine.setState(CHARACTER_STATES.LIFT_STATE);
			return true;
		}

		if (interactiveObjectComponent.objectType === INTERACTIVE_OBJECT_TYPE.OPEN) {
			console.log(interactiveObjectComponent.objectType);
			this._stateMachine.setState(CHARACTER_STATES.OPEN_CHEST_STATE);
			return true;
		}

		if (interactiveObjectComponent.objectType === INTERACTIVE_OBJECT_TYPE.AUTO) {
			return false;
		}

		exhaustiveGuard(interactiveObjectComponent.objectType);
	}
}