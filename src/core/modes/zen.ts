import { ZEN } from '../rules.ts';
import type { ModeRules } from '../types.ts';

/** Zen : les bords et le corps se traversent, aucune collision, vitesse fixe (RG-39). */
export const ZEN_MODE: ModeRules = {
  id: 'zen',
  speed: () => ZEN.speed,
  candyCount: 1,
  wraps: true,
};
