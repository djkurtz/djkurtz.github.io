import { Curves } from "phaser";
import { GameObject } from "../../../../common/types";
import { isArcadePhysicsBody } from "../../../../common/utils";
import { CharacterGameObject } from "../../../../game-objects/common/character-game-object";
import { HeldGameObjectComponent } from "../../../game-object/held-game-object-component";
import { BaseCharacterState } from "./base-character-state";
import { CHARACTER_STATES } from "./character-states";
import { LIFT_ITEM_ANIMATION_DELAY, LIFT_ITEM_DURATION, LIFT_ITEM_ENABLE_DEBUGGING } from "../../../../common/config";

export class LiftState extends BaseCharacterState {
	constructor(gameObject: CharacterGameObject) {
		super(CHARACTER_STATES.LIFT_STATE, gameObject);
	}

	onEnter(args: unknown[]): void {
		const gameObjectBeingPickedUp = args[0] as GameObject;

		this._resetObjectVelocity();

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

		const startPoint = new Phaser.Math.Vector2(gameObjectBeingPickedUp.x + 8, gameObjectBeingPickedUp.y - 8);
		const controlPoint1 = new Phaser.Math.Vector2(gameObjectBeingPickedUp.x + 8, gameObjectBeingPickedUp.y - 16);
		const controlPoint2 = new Phaser.Math.Vector2(gameObjectBeingPickedUp.x + 8, gameObjectBeingPickedUp.y - 24);
		const endPoint = new Phaser.Math.Vector2(this._gameObject.x, this._gameObject.y - 8);
		const curve = new Phaser.Curves.CubicBezier(startPoint, controlPoint1, controlPoint2, endPoint);
		const curvePath = new Phaser.Curves.Path(startPoint.x, startPoint.y).add(curve);

		let g: Phaser.GameObjects.Graphics | undefined;
		if (LIFT_ITEM_ENABLE_DEBUGGING) {
			g = this._gameObject.scene.add.graphics();
			g.clear();
			g.lineStyle(4, 0x00ff00, 1);
			curvePath.draw(g);
		}
		gameObjectBeingPickedUp.setAlpha(0);

		const follower = this._gameObject.scene.add
			.follower(curvePath, startPoint.x, startPoint.y, gameObjectBeingPickedUp.texture)
			.setAlpha(1);
		follower.startFollow({
			delay: LIFT_ITEM_ANIMATION_DELAY,
			duration: LIFT_ITEM_DURATION,
			onComplete: () => {
				follower.destroy();
				if (g !== undefined) {
					g.destroy();
				}
				
				gameObjectBeingPickedUp.setPosition(follower.x, follower.y).setAlpha(1);
			}
		});

		this._gameObject.animationComponent.playAnimation(`LIFT_${this._gameObject.direction}`);
	}

	onUpdate(): void {
		if (this._gameObject.animationComponent.isAnimationPlaying()) {
			return;
		}

		this._stateMachine.setState(CHARACTER_STATES.IDLE_HOLDING_STATE);
	}
}