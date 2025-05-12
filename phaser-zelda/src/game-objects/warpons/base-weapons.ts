export interface Weapon {
  baseDamage: number;
  isAttacking: boolean;
  attackUp(): void;
  attackDown(): void;
  attackRight(): void;
  attackLeft(): void;
  update(): void;
  onCollisionCallback(): void;
}
