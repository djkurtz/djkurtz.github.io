import { ASSET_KEYS } from "../../common/assets";
import { INTERACTIVE_OBJECT_TYPE } from "../../common/common";
import { TiledPotObject } from "../../common/tiled/types";
import { CustomGameObject, Position } from "../../common/types";
import { InteractiveObjectComponent } from "../../components/game-object/interactive-object-component";
import { ThrowableObjectComponent } from "../../components/game-object/throwable-object-component";

export class Pot extends Phaser.Physics.Arcade.Sprite implements CustomGameObject {
	#position: Position;

	constructor(scene: Phaser.Scene, config: TiledPotObject) {
		super(scene, config.x, config.y, ASSET_KEYS.POT, 0);

		scene.add.existing(this);
		scene.physics.add.existing(this);
		this.setOrigin(0,1).setImmovable(true);

		this.#position = { x: config.x, y: config.y };

		console.log(this.#position)

		// add components
		new InteractiveObjectComponent(this, INTERACTIVE_OBJECT_TYPE.PICKUP);
		new ThrowableObjectComponent(this, () => {
			this.break();
		});
	}

	public disableObject(): void {
		(this.body as Phaser.Physics.Arcade.Body).enable = false;
		this.active = false;
		this.visible = false;
	}

	public enableObject(): void {
		(this.body as Phaser.Physics.Arcade.Body).enable = true;
		this.active = true;
		this.visible = true;
	}

	public break(): void {
		(this.body as Phaser.Physics.Arcade.Body).enable = false;
		this.setTexture(ASSET_KEYS.POT_BREAK, 0).play(ASSET_KEYS.POT_BREAK);
		this.once(Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + ASSET_KEYS.POT_BREAK, () => {
			this.setTexture(ASSET_KEYS.POT, 0);
			this.disableObject();
		})
	}
}