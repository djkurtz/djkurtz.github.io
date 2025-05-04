import { ASSET_KEYS, WISP_ANIMATION_KEYS } from "../../common/assets";
import { ENEMY_WISP_ANIMATION_DURATION, ENEMY_WISP_ANIMATION_SCALE_X, ENEMY_WISP_ANIMATION_SCALE_Y, ENEMY_WISP_SPEED, ENEMY_WISP_START_MAX_LIFE } from "../../common/config";
import { Position } from "../../common/types";
import { AnimationConfig } from "../../components/game-object/animation-component";
import { InputComponent } from "../../components/input/input-component";
import { BounceMoveState } from "../../components/state-macine/states/character/bounce-move-state";
import { CHARACTER_STATES } from "../../components/state-macine/states/character/character-states";
import { CharacterGameObject } from "../common/game-object";

export type WispConfig = {
    scene: Phaser.Scene;
    position: Position;
}

export class Wisp extends CharacterGameObject {
    constructor(config: WispConfig) {
        // create animation config for component
        const animConfig = { key: WISP_ANIMATION_KEYS.IDLE, repeat: -1, ignoreIfPlaying: true };
        const animationConfig: AnimationConfig = {
            IDLE_DOWN: animConfig,
            IDLE_UP: animConfig,
            IDLE_LEFT: animConfig,
            IDLE_RIGHT: animConfig,
        }

        super({
            scene: config.scene,
            position: config.position,
            assetKey: ASSET_KEYS.WISP,
            frame: 0,
            id: `wisp-${Phaser.Math.RND.uuid()}`,
            isPlayer: false,
            animationConfig,
            speed: ENEMY_WISP_SPEED,
            inputComponent: new InputComponent(),
            isInvulnerable: true,
            maxLife: ENEMY_WISP_START_MAX_LIFE,
        });

        // add state machine
        this._stateMachine.addState(new BounceMoveState(this));
        //this._stateMachine.setState(CHARACTER_STATES.BOUNCE_MOVE_STATE);

        this.scene.tweens.add({
            targets: this,
            scaleX: ENEMY_WISP_ANIMATION_SCALE_X,
            scaleY: ENEMY_WISP_ANIMATION_SCALE_Y,
            yoyo: true,
            repeat: -1,
            duration: ENEMY_WISP_ANIMATION_DURATION,
        })
    }

}