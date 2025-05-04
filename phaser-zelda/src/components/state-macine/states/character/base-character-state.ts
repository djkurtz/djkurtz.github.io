import { isArcadePhysicsBody } from "../../../../common/utils";
import { CharacterGameObject } from "../../../../game-objects/common/game-object";
import { State, StateMachine } from "../../state-machine";

export class BaseCharacterState implements State {
	protected _gameObject: CharacterGameObject;
	protected _stateMachine!: StateMachine;
	#name: string;


	constructor(name: string, gameObject: CharacterGameObject) {
		this.#name = name;
		this._gameObject = gameObject;
	}

	get name(): string {
		return this.#name;
	}

	set stateMachine(stateMachine: StateMachine) {
		this._stateMachine = stateMachine;
	}

	protected _resetObjectVelocity(): void {
		if (isArcadePhysicsBody(this._gameObject.body)) {
			this._gameObject.body.velocity.x = 0;
			this._gameObject.body.velocity.y = 0;
		}
	}
}