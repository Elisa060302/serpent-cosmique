import { placeSpecial } from '../engine.ts';
import { BONUS, SPECIAL_TYPES } from '../rules.ts';
import type { ModeRules } from '../types.ts';

/**
 * Bonus et pièges : tous les 3 bonbons, un bonbon spécial apparaît s'il n'y en a pas déjà un (RG-35). Les effets
 * (Ralenti, Turbo, Inversion, Rétrécissement) sont appliqués par le moteur quand il est mangé (RG-36).
 */
export const BONUS_TRAPS: ModeRules = {
  id: 'bonus-traps',
  speed: () => BONUS.speed,
  candyCount: 1,
  afterEat(game) {
    if (game.candiesEaten % BONUS.every === 0 && game.special === null) {
      placeSpecial(game, SPECIAL_TYPES);
    }
  },
};
