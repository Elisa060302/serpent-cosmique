import { CLASSIC_SPEED } from '../rules.ts';
import type { ModeRules } from '../types.ts';

/** Mode Classique : le serpent accélère à chaque bonbon, bords et corps mortels, un seul bonbon (RG-28). */
export const CLASSIC: ModeRules = {
  id: 'classic',
  speed: (candiesEaten) =>
    Math.min(CLASSIC_SPEED.max, CLASSIC_SPEED.start + CLASSIC_SPEED.perCandy * candiesEaten),
  candyCount: 1,
};
