import { distance } from '../board.ts';
import { pickFreeCell } from '../engine.ts';
import { ASTEROIDS } from '../rules.ts';
import type { Game, ModeRules } from '../types.ts';

/** Ajoute un astéroïde sur une case libre à `minHeadDistance` cases au moins de la tête (RG-32). */
function addAsteroid(game: Game, atStart: boolean): void {
  const head = game.snake[0];
  if (head === undefined) return;
  const cell = pickFreeCell(
    game,
    (candidate) =>
      distance(candidate, head) >= ASTEROIDS.minHeadDistance &&
      !(atStart && candidate.row === ASTEROIDS.startExcludedRow),
  );
  if (cell !== null) game.obstacles.push(cell);
}

/** Champ d'astéroïdes : 3 au départ, un de plus tous les 5 bonbons, 30 au plus, fixes (RG-31, RG-32). */
export const ASTEROIDS_MODE: ModeRules = {
  id: 'asteroids',
  speed: () => ASTEROIDS.speed,
  candyCount: 1,
  setup(game) {
    for (let count = 0; count < ASTEROIDS.initial; count += 1) addAsteroid(game, true);
  },
  afterEat(game) {
    if (game.candiesEaten % ASTEROIDS.every === 0 && game.obstacles.length < ASTEROIDS.max) {
      addAsteroid(game, false);
    }
  },
};
