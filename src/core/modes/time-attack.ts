import { TIME_ATTACK } from '../rules.ts';
import type { ModeRules } from '../types.ts';

/** Contre la montre : 60 secondes de jeu, vitesse fixe, 3 bonbons en permanence, bords et corps mortels (RG-29). */
export const TIME_ATTACK_MODE: ModeRules = {
  id: 'time-attack',
  speed: () => TIME_ATTACK.speed,
  candyCount: TIME_ATTACK.candyCount,
  timeLimitMs: TIME_ATTACK.durationMs,
};
