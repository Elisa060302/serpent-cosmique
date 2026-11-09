import { freeCells, isInside, move, sameCell, wrapCell } from './board.ts';
import { colorAfterCandy, START_COLOR } from './color.ts';
import { enqueueCommand, opposite } from './commands.ts';
import { createRandom } from './random.ts';
import { BONUS, CANDY_COLORS, START } from './rules.ts';
import type { Scheduler } from './scheduler.ts';
import type {
  Candy,
  CandyColorId,
  Cell,
  Direction,
  EndReason,
  Game,
  ModeRules,
  SpecialCandy,
} from './types.ts';

/** Nouvelle partie : serpent de départ, éléments propres au mode, puis les bonbons, tirés avec la graine. */
export function createGame(rules: ModeRules, seed: number): Game {
  const snake: Cell[] = [];
  for (let index = 0; index < START.length; index += 1) {
    snake.push({ col: START.headColumn - index, row: START.headRow });
  }
  const game: Game = {
    rules,
    random: createRandom(seed),
    snake,
    direction: 'right',
    queue: [],
    candies: [],
    score: 0,
    candiesEaten: 0,
    steps: 0,
    color: START_COLOR,
    end: null,
    elapsedMs: 0,
    obstacles: [],
    holes: [],
    special: null,
    effect: null,
    constellation: null,
    events: [],
  };
  rules.setup?.(game);
  // La grille de départ a toujours des cases libres : le remplissage n'échoue pas ici.
  fillCandies(game);
  return game;
}

/** Cases occupées par autre chose qu'un bonbon normal à placer : serpent, bonbons, astéroïdes, trous, bonbon spécial. */
export function occupiedCells(game: Game): (readonly Cell[])[] {
  return [
    game.snake,
    game.candies.map((candy) => candy.cell),
    game.obstacles,
    game.holes.map((hole) => hole.cell),
    game.special === null ? [] : [game.special.cell],
  ];
}

/** Case libre tirée au hasard parmi celles qui vérifient `accept` (toutes par défaut), ou null s'il n'y en a aucune. */
export function pickFreeCell(
  game: Game,
  accept: (cell: Cell) => boolean = () => true,
): Cell | null {
  const free = freeCells(...occupiedCells(game)).filter(accept);
  if (free.length === 0) return null;
  return free[game.random.nextInt(free.length)] ?? null;
}

/**
 * Place un bonbon sur une case libre tirée au hasard (RG-15). Ordre des tirages : la case, puis la couleur
 * (sauf si elle est imposée). Renvoie faux quand il ne reste aucune case libre.
 */
export function placeCandy(game: Game, color?: CandyColorId): boolean {
  const cell = pickFreeCell(game);
  if (cell === null) return false;
  const chosen = color ?? CANDY_COLORS[game.random.nextInt(CANDY_COLORS.length)]?.id;
  if (chosen === undefined) return false;
  game.candies.push({ cell, color: chosen });
  return true;
}

/** Complète les bonbons du mode : une couleur manquante est remplacée par la même (RG-41). Faux si l'aire est pleine. */
function fillCandies(game: Game): boolean {
  while (game.candies.length < game.rules.candyCount) {
    const missing = game.rules.candyColors?.find(
      (color) => !game.candies.some((candy) => candy.color === color),
    );
    if (!placeCandy(game, missing)) return false;
  }
  return true;
}

/** Place un bonbon spécial sur une case libre : case, couleur, puis type (RG-35). */
export function placeSpecial(game: Game, types: readonly SpecialCandy['type'][]): boolean {
  const cell = pickFreeCell(game);
  if (cell === null) return false;
  const color = CANDY_COLORS[game.random.nextInt(CANDY_COLORS.length)]?.id;
  const type = types[game.random.nextInt(types.length)];
  if (color === undefined || type === undefined) return false;
  game.special = { cell, color, type, remainingMs: BONUS.lifeMs };
  return true;
}

/** Vitesse en cases par seconde : celle d'un effet Ralenti ou Turbo en cours, sinon celle du mode (RG-36). */
export function speedOf(game: Game): number {
  if (game.effect?.type === 'slow') return BONUS.slowSpeed;
  if (game.effect?.type === 'turbo') return BONUS.turboSpeed;
  return game.rules.speed(game.candiesEaten);
}

/**
 * Donne une commande au serpent. Pendant l'effet Inversion, la direction demandée est inversée avant la file :
 * le demi-tour et la répétition sont jugés sur la direction effective (RG-26, RG-36).
 */
export function sendCommand(game: Game, direction: Direction): boolean {
  const effective = game.effect?.type === 'invert' ? opposite(direction) : direction;
  return enqueueCommand(game.queue, game.direction, effective);
}

function finish(game: Game, reason: EndReason): void {
  game.end = reason;
}

export function abandon(game: Game): void {
  if (game.end === null) finish(game, 'abandon');
}

/** Case où la tête arrive : traversée des bords en Zen, sortie du trou jumeau, ou null si elle sort de la grille. */
function destination(game: Game, head: Cell): Cell | null {
  const next = move(head, game.direction);
  if (game.rules.wraps === true) return wrapCell(next);
  if (!isInside(next)) return null;
  const hole = game.holes.find((candidate) => sameCell(candidate.cell, next));
  if (hole === undefined) return next;
  // La tête ressort au même pas, sur la case voisine du jumeau, dans la même direction (RG-34).
  const exit = move(hole.twin, game.direction);
  return isInside(exit) ? exit : null;
}

/** Un pas : applique la plus ancienne commande, avance la tête, mange, grandit, détecte la fin. */
export function step(game: Game): void {
  if (game.end !== null) return;
  const command = game.queue.shift();
  if (command !== undefined) game.direction = command;
  const head = game.snake[0];
  if (head === undefined) return;
  const target = destination(game, head);
  if (target === null || game.obstacles.some((obstacle) => sameCell(obstacle, target))) {
    finish(game, 'collision');
    return;
  }
  const special =
    game.special !== null && sameCell(game.special.cell, target) ? game.special : null;
  const candyIndex = game.candies.findIndex((candy) => sameCell(candy.cell, target));
  const grows = candyIndex >= 0 || (special !== null && special.type !== 'shrink');
  // La case que la queue quitte à ce pas est libre, sauf si le serpent grandit (RG-08).
  const body = grows ? game.snake : game.snake.slice(0, -1);
  if (game.rules.wraps !== true && body.some((part) => sameCell(part, target))) {
    finish(game, 'collision');
    return;
  }
  game.snake.unshift(target);
  if (!grows) game.snake.pop();
  game.steps += 1;
  if (special !== null) eatSpecial(game, special);
  else if (candyIndex >= 0) eatCandy(game, candyIndex);
}

/** Points, bonbon compté, couleur du serpent (RG-07, RG-17, RG-19). */
function score(game: Game, candy: Candy): void {
  game.score += game.rules.points?.(game, candy) ?? 1;
  game.candiesEaten += 1;
  game.color = colorAfterCandy(game.candiesEaten, candy.color);
}

function eatCandy(game: Game, candyIndex: number): void {
  const [candy] = game.candies.splice(candyIndex, 1);
  if (candy === undefined) return;
  const signaled = game.events.length;
  score(game, candy);
  // Le mode a pu signaler lui-même ce repas (constellation complétée) : un seul événement par bonbon.
  if (game.events.length === signaled) game.events.push({ kind: 'eat' });
  if (!fillCandies(game)) {
    finish(game, 'victory');
    return;
  }
  game.rules.afterEat?.(game);
}

/** Bonbon spécial mangé (RG-36, RG-37, RG-38) : 1 point, arc-en-ciel et couleur comme un bonbon normal. */
function eatSpecial(game: Game, special: SpecialCandy): void {
  game.special = null;
  score(game, special);
  game.events.push({ kind: 'special', type: special.type });
  if (special.type === 'shrink') {
    // Le serpent ne grandit pas et perd des anneaux depuis la queue, sans passer sous la longueur minimale.
    const length = Math.max(BONUS.minLength, game.snake.length - BONUS.shrinkBy);
    game.snake.length = Math.min(game.snake.length, length);
  } else {
    // Un nouvel effet remplace celui en cours et dure sa durée entière (RG-37).
    game.effect = { type: special.type, remainingMs: BONUS.effectMs };
  }
  game.rules.afterEat?.(game);
}

/**
 * Temps de jeu écoulé : fait vieillir le bonbon spécial et l'effet en cours, et compte le chrono, qui démarre au
 * premier pas (RG-29). L'appelant ne l'appelle ni en pause ni pendant un compte à rebours (RG-30, RG-75).
 */
export function tick(game: Game, elapsedMs: number): void {
  if (game.end !== null || game.steps === 0 || elapsedMs <= 0) return;
  game.elapsedMs += elapsedMs;
  if (game.special !== null) {
    game.special.remainingMs -= elapsedMs;
    if (game.special.remainingMs <= 0) game.special = null;
  }
  if (game.effect !== null) {
    game.effect.remainingMs -= elapsedMs;
    if (game.effect.remainingMs <= 0) {
      game.effect = null;
      game.events.push({ kind: 'effect-end' });
    }
  }
  const limit = game.rules.timeLimitMs;
  if (limit !== undefined && game.elapsedMs >= limit) finish(game, 'time');
}

/**
 * Une image de jeu : les pas dus selon l'ordonnanceur, puis le temps de jeu écoulé depuis l'image précédente.
 * Un pas qui termine la partie arrête la suite. Si le temps de cette image atteint la limite du mode, aucun pas
 * n'a lieu : la partie finit sur la position de l'image précédente.
 */
export function playFrame(
  game: Game,
  scheduler: Scheduler,
  nowMs: number,
  previousMs: number,
): void {
  const limit = game.rules.timeLimitMs;
  const timeIsUp =
    limit !== undefined && game.steps > 0 && game.elapsedMs + (nowMs - previousMs) >= limit;
  if (!timeIsUp) {
    const steps = scheduler.advance(nowMs, 1000 / speedOf(game));
    for (let index = 0; index < steps && game.end === null; index += 1) step(game);
  }
  tick(game, nowMs - previousMs);
}

/** Secondes entières restantes, arrondies à l'unité supérieure (RG-29, RG-37). */
export function secondsLeft(remainingMs: number): number {
  return Math.ceil(Math.max(0, remainingMs) / 1000);
}

/** Retire et renvoie les événements signalés depuis la dernière lecture. */
export function takeEvents(game: Game): Game['events'] {
  return game.events.splice(0);
}
