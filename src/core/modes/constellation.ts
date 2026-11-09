import { CANDY_COLORS, CONSTELLATION } from '../rules.ts';
import type { Random } from '../random.ts';
import type { CandyColorId, Game, ModeRules } from '../types.ts';

/** Suite de couleurs toutes différentes, tirée au hasard : tirage sans remise parmi les quatre couleurs (RG-41). */
function drawSequence(random: Random): CandyColorId[] {
  const remaining: CandyColorId[] = CANDY_COLORS.map((color) => color.id);
  const sequence: CandyColorId[] = [];
  while (sequence.length < CONSTELLATION.sequenceLength) {
    const [color] = remaining.splice(random.nextInt(remaining.length), 1);
    if (color !== undefined) sequence.push(color);
  }
  return sequence;
}

/**
 * Constellation : 4 bonbons, un de chaque couleur, à manger dans l'ordre d'une suite de 3 couleurs (RG-41).
 * Une couleur attendue rapporte 1 point ; la suite complétée, 5 de plus ; une autre couleur, 0 point et la
 * progression revient à la première couleur de la même suite (RG-42).
 */
export const CONSTELLATION_MODE: ModeRules = {
  id: 'constellation',
  speed: () => CONSTELLATION.speed,
  candyColors: CANDY_COLORS.map((color) => color.id),
  candyCount: CANDY_COLORS.length,
  setup(game: Game) {
    game.constellation = { sequence: drawSequence(game.random), progress: 0, completed: 0 };
  },
  points(game, candy) {
    const state = game.constellation;
    if (state === null) return 1;
    if (candy.color !== state.sequence[state.progress]) {
      state.progress = 0;
      return 0;
    }
    state.progress += 1;
    if (state.progress < state.sequence.length) return 1;
    state.completed += 1;
    state.progress = 0;
    state.sequence = drawSequence(game.random);
    game.events.push({ kind: 'constellation' });
    return 1 + CONSTELLATION.completionBonus;
  },
};
