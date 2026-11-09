/**
 * Aides de test des modes de jeu : horloge de jeu simulée, pilote qui évite les collisions et repas forcés.
 * Elles utilisent le moteur du projet comme oracle, sans code réservé à la recette.
 */
import { isInside, move, sameCell, wrapCell } from '../../src/core/board.ts';
import { enqueueCommand, opposite } from '../../src/core/commands.ts';
import { playFrame, step } from '../../src/core/engine.ts';
import { createScheduler } from '../../src/core/scheduler.ts';
import { DIRECTIONS, GRID } from '../../src/core/rules.ts';
import type { CandyColorId, Cell, Direction, Game } from '../../src/core/types.ts';

export const FRAME_MS = 16;

export interface GameClock {
  /** Temps de jeu simulé depuis le départ, pauses comprises. */
  readonly now: number;
  /** Joue `ms` millisecondes d'images de 16 ms ; `before` choisit les commandes avant chaque image. */
  run(ms: number, before?: (game: Game) => void): void;
  /** Pause de `ms` millisecondes : rien n'avance ; la reprise repart sans rattraper (RG-75, RG-76). */
  pause(ms: number): void;
}

export function createClock(game: Game): GameClock {
  const scheduler = createScheduler();
  let now = 0;
  scheduler.reset(now);
  return {
    get now() {
      return now;
    },
    run(ms, before) {
      const end = now + ms;
      while (now < end && game.end === null) {
        before?.(game);
        const next = Math.min(end, now + FRAME_MS);
        playFrame(game, scheduler, next, now);
        now = next;
      }
    },
    pause(ms) {
      now += ms;
      scheduler.reset(now);
    },
  };
}

function nextCell(game: Game, direction: Direction): Cell | null {
  const head = game.snake[0];
  if (head === undefined) return null;
  const target = move(head, direction);
  if (game.rules.wraps === true) return wrapCell(target);
  return isInside(target) ? target : null;
}

/** Une direction qui ne mène ni hors de la grille, ni sur un anneau, un astéroïde ou un trou : la courante si possible. */
export function safeDirection(game: Game): Direction {
  const order = [game.direction, ...DIRECTIONS.filter((direction) => direction !== game.direction)];
  const body = game.snake.slice(0, -1);
  for (const direction of order) {
    if (direction === opposite(game.direction)) continue;
    const target = nextCell(game, direction);
    if (target === null) continue;
    if (game.obstacles.some((cell) => sameCell(cell, target))) continue;
    if (game.holes.some((hole) => sameCell(hole.cell, target))) continue;
    if (game.rules.wraps !== true && body.some((part) => sameCell(part, target))) continue;
    return direction;
  }
  return game.direction;
}

/** Pilote prudent : vers le bonbon le plus proche si la case est sûre, sinon une direction sûre. */
export function robot(game: Game): void {
  const head = game.snake[0];
  if (head === undefined) return;
  const goals = [...game.candies.map((candy) => candy.cell)];
  if (game.special !== null) goals.push(game.special.cell);
  const body = game.snake.slice(0, -1);
  let best: Direction | null = null;
  let bestDistance = Infinity;
  for (const direction of DIRECTIONS) {
    if (direction === opposite(game.direction)) continue;
    const target = nextCell(game, direction);
    if (target === null) continue;
    if (game.obstacles.some((cell) => sameCell(cell, target))) continue;
    if (game.holes.some((hole) => sameCell(hole.cell, target))) continue;
    if (game.rules.wraps !== true && body.some((part) => sameCell(part, target))) continue;
    const toGoal = Math.min(
      ...goals.map((goal) => Math.abs(goal.col - target.col) + Math.abs(goal.row - target.row)),
    );
    if (toGoal < bestDistance) {
      best = direction;
      bestDistance = toGoal;
    }
  }
  if (best !== null && best !== game.direction) enqueueCommand(game.queue, game.direction, best);
}

/**
 * Fait manger un bonbon au prochain pas : un bonbon (de la couleur demandée si le mode en a de plusieurs)
 * est posé sur la case devant la tête, puis le pas est fait. `short` ramène le serpent à 4 cases ensuite.
 */
export function feed(game: Game, options: { color?: CandyColorId; short?: boolean } = {}): void {
  let direction = safeDirection(game);
  if (nextCell(game, direction) === null) {
    // Serpent coincé contre un bord ou un astéroïde : on le retourne (la tête devient la queue).
    game.snake.reverse();
    const [head, neck] = game.snake;
    const turned = DIRECTIONS.find(
      (candidate) => head && neck && sameCell(move(neck, candidate), head),
    );
    if (turned !== undefined) game.direction = turned;
    game.queue.length = 0;
    direction = safeDirection(game);
  }
  enqueueCommand(game.queue, game.direction, direction);
  const front = nextCell(game, direction);
  if (front === null) throw new Error('Aucune case devant la tête.');
  const index = Math.max(
    0,
    game.candies.findIndex((candy) => options.color === undefined || candy.color === options.color),
  );
  const moved = game.candies[index];
  if (moved === undefined) throw new Error('Aucun bonbon à déplacer.');
  const blocker = game.candies.find(
    (candy, other) => other !== index && sameCell(candy.cell, front),
  );
  if (blocker !== undefined) blocker.cell = moved.cell;
  moved.cell = front;
  if (options.color !== undefined) moved.color = options.color;
  step(game);
  if (options.short === true && game.snake.length > 4) game.snake.length = 4;
}

/**
 * Cycle qui passe une seule fois par chacune des 288 cases, orienté pour que le serpent de départ (ligne 6,
 * vers la droite) le suive. Un pilote qui le suit ne se heurte jamais (sans astéroïde ni trou noir) et mange
 * tous les bonbons qu'il croise.
 */
const CYCLE_NEXT: Map<number, Cell> = (() => {
  const cycle: Cell[] = [];
  for (let col = 1; col <= GRID.columns; col += 1) cycle.push({ col, row: 1 });
  for (let row = 2; row <= GRID.rows; row += 1) {
    for (let index = 0; index < GRID.columns - 1; index += 1) {
      const col = row % 2 === 0 ? GRID.columns - index : index + 2;
      cycle.push({ col, row });
    }
  }
  for (let row = GRID.rows; row >= 2; row -= 1) cycle.push({ col: 1, row });
  cycle.reverse();
  const next = new Map<number, Cell>();
  cycle.forEach((cell, index) => {
    next.set(cell.row * 100 + cell.col, cycle[(index + 1) % cycle.length] ?? cell);
  });
  return next;
})();

/** Suit le cycle : ne s'arrête jamais de vivre tant que le serpent a moins de 288 cases. */
export function follow(game: Game): void {
  const head = game.snake[0];
  const target = head === undefined ? undefined : CYCLE_NEXT.get(head.row * 100 + head.col);
  if (head === undefined || target === undefined) return;
  const direction = DIRECTIONS.find((candidate) => sameCell(move(head, candidate), target));
  if (direction !== undefined && direction !== game.direction) {
    enqueueCommand(game.queue, game.direction, direction);
  }
}
