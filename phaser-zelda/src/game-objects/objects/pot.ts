import { ASSET_KEYS } from "../../common/assets";
import { INTERACTIVE_OBJECT_TYPE } from "../../common/common";
import { Position } from "../../common/types";
import { InteractiveObjectComponent } from "../../components/game-object/interactive-object-component";

type PotConfig = {
	scene: Phaser.Scene;
	position: Position;
}

export class Pot extends Phaser.Physics.Arcade.Sprite {
	#position: Position;

	constructor(config: PotConfig) {
		const { scene, position } = config;
		super(scene, position.x, position.y, ASSET_KEYS.POT, 0);

		scene.add.existing(this);
		scene.physics.add.existing(this);
		this.setOrigin(0.1).setImmovable(true);

		this.#position = { x: position.x, y: position.y };

		// add components
		new InteractiveObjectComponent(this, INTERACTIVE_OBJECT_TYPE.PICKUP);
	}
}