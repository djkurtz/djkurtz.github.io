import { ASSET_KEYS, CHEST_FRAME_KEYS } from "../../common/assets";
import { CHEST_STATE, INTERACTIVE_OBJECT_TYPE } from "../../common/common";
import { TRAP_TYPE } from "../../common/tiled/common";
import { ChestReward, TiledChestObject, TrapType } from "../../common/tiled/types";
import { ChestState, CustomGameObject, Position } from "../../common/types";
import { InteractiveObjectComponent } from "../../components/game-object/interactive-object-component";

export class Chest extends Phaser.Physics.Arcade.Image implements CustomGameObject {
	#state: ChestState;
	#isBossKeyChest: boolean;
	#id: number;
	#revealTrigger: TrapType;
	#contents: ChestReward;

	constructor(scene: Phaser.Scene, config: TiledChestObject, chestState = CHEST_STATE.HIDDEN) {
		const frameKey = config.requiresBossKey ? CHEST_FRAME_KEYS.BIG_CHEST_CLOSED : CHEST_FRAME_KEYS.SMALL_CHEST_CLOSED;
		super(scene, config.x, config.y, ASSET_KEYS.DUNGEON_OBJECTS, frameKey);

		scene.add.existing(this);
		scene.physics.add.existing(this);
		this.setOrigin(0, 1).setImmovable(true);

		this.#state = chestState;
		this.#isBossKeyChest = config.requiresBossKey;
		this.#id = config.id;
		this.#revealTrigger = config.revealChestTrigger;
		this.#contents = config.contents;

		if (this.#isBossKeyChest) {
			(this.body as Phaser.Physics.Arcade.Body).setSize(32, 24).setOffset(0, 8);
		}

		// add components
		new InteractiveObjectComponent(
			this,
			INTERACTIVE_OBJECT_TYPE.OPEN,
			() => {
				if (!this.#isBossKeyChest) {
					return true;
				}
				// TODO: make sure player has boss key
				return false;
			},
			() => {
				this.open();
			});

		if (this.#revealTrigger === TRAP_TYPE.NONE) {
			if (this.#state === CHEST_STATE.HIDDEN) {
				this.#state = CHEST_STATE.REVEALED;
			}
			return;
		}

		this.disableObject();
	}

	get revealTrigger(): TrapType {
		return this.#revealTrigger;
	}

	get id(): number {
		return this.#id;
	}

	get contents(): ChestReward {
		return this.#contents;
	}

	public open(): void {
		if (this.#state !== CHEST_STATE.REVEALED) {
			return;
		}

		this.#state = CHEST_STATE.OPEN;
		const frameKey = this.#isBossKeyChest ? CHEST_FRAME_KEYS.BIG_CHEST_OPEN : CHEST_FRAME_KEYS.SMALL_CHEST_OPEN;
		this.setFrame(frameKey);
		InteractiveObjectComponent.removeComponent(this);
	}

	public disableObject(): void {
		(this.body as Phaser.Physics.Arcade.Body).enable = false;
		this.active = false;
		this.visible = false;
	}

	public enableObject(): void {
		if (this.#state === CHEST_STATE.HIDDEN) {
			return;
		}

		(this.body as Phaser.Physics.Arcade.Body).enable = true;
		this.active = true;
		this.visible = true;
	}

	public reveal(): void {
		if (this.#state !== CHEST_STATE.HIDDEN) {
			return;
		}
		this.#state = CHEST_STATE.REVEALED;
		this.enableObject();
	}
}