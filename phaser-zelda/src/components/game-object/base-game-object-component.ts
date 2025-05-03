import { Game } from "phaser";
import { GameObject } from "../../common/types";

export class BaseGameObjectComponent {
    protected scene: Phaser.Scene;
    protected gameObject: GameObject;
    
    constructor(gameObject: GameObject) {
        this.scene = gameObject.scene;
        this.gameObject = gameObject;
    }

    static getComponent<T>(gameObject: GameObject): T {
        return gameObject[`_${this.name}`] as T;
    }

    static removeComponent(gameObject: GameObject) {
        delete gameObject[`_${this.name}`];
    }

    protected assignComponentToObject(object: GameObject): void {
        object[`_${this.constructor.name}`] = this;
    }
}
