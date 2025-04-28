export class InputComponent {
#up: boolean;
#down: boolean;
#left: boolean;
#right: boolean;
#actionKey: boolean;
#attackKey: boolean;
#selectKey: boolean;
#enterKey: boolean;

constructor() {
    this.#up = false;
    this.#down = false;
    this.#left = false;
    this.#right = false;
    this.#actionKey = false;
    this.#attackKey = false;
    this.#selectKey = false;
    this.#enterKey = false;
}

get isUpDown(): boolean {
    return this.#up;
}

set isUpDown(val: boolean) {
    this.#up = val;
}

get isUpJustDown(): boolean {
    return this.#up;
}

get isDownDown(): boolean {
    return this.#down;
}

set isDownDown(val: boolean) {
    this.#down = val;
}

get isDownJustDown(): boolean {
    return this.#up;
}

get isLeftDown(): boolean {
    return this.#left;
}

set isLeftDown(val: boolean) {
    this.#left = val;
}

get isRightDown(): boolean {
    return this.#right;
}

set isRightDown(val: boolean) {
    this.#right = val;
}

get isActionJustDown(): boolean {
    return this.#actionKey;
}

set isActionJustDown(val: boolean) {
    this.#actionKey = val;
}

get isAttackJustDown(): boolean {
    return this.#attackKey;
}

set isAttackJustDown(val: boolean) {
    this.#attackKey = val;
}

get isSelectJustDown(): boolean {
    return this.#selectKey;
}

set isSelectJustDown(val: boolean) {
    this.#selectKey = val;
}

get isEnterJustDown(): boolean {
    return this.#enterKey;
}

set isEnterJustDown(val: boolean) {
    this.#enterKey = val;
}

public reset(): void {
    this.#up = false;
    this.#down = false;
    this.#left = false;
    this.#right = false;
    this.#actionKey = false;
    this.#attackKey = false;
    this.#selectKey = false;
    this.#enterKey = false;
}
}