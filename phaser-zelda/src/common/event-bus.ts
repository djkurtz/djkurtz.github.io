export const EVENT_BUS = new Phaser.Events.EventEmitter();

export const CUSTOM_EVENTS = {
	OPENED_CHEST: 'OPENED_CHEST',
	ENEMY_DESTROYED: 'ENEMY_DESTROYED',
	PLAYER_DEFEATED: 'PLAYER_DEFEATED',
} as const;