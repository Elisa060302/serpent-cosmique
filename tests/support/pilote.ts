/**
 * Pilote de recette : utilise le moteur du projet comme oracle pour trouver les commandes
 * qui mènent le serpent à un endroit précis. Il ne s'appuie sur aucun code réservé à la recette.
 */
import { move } from '../../src/core/board.ts';
import { sendCommand, step } from '../../src/core/engine.ts';
import { DIRECTIONS, GRID } from '../../src/core/rules.ts';
import type { Cell, Direction, Game } from '../../src/core/types.ts';

function key(cell: Cell): number {
  return (cell.row - 1) * GRID.columns + (cell.col - 1);
}

/**
 * Plus court chemin de la tête jusqu'à une case qui vérifie `goal`, sous forme de directions.
 * Le corps est un obstacle tant qu'il n'a pas libéré sa case ; les bonbons, les astéroïdes et les trous noirs
 * aussi, sauf s'ils sont le but. Les bords ne se traversent pas (Zen non pris en charge).
 */
export function findPath(
  game: Game,
  goal: (cell: Cell, game: Game) => boolean,
): Direction[] | null {
  const head = game.snake[0];
  if (head === undefined) return null;
  const length = game.snake.length;
  const bodyIndex = new Map<number, number>();
  game.snake.forEach((cell, index) => bodyIndex.set(key(cell), index));
  const candyKeys = new Set([
    ...game.candies.map((candy) => key(candy.cell)),
    ...(game.special === null ? [] : [key(game.special.cell)]),
    ...game.obstacles.map(key),
    ...game.holes.map((hole) => key(hole.cell)),
  ]);
  const previous = new Map<number, { from: number; direction: Direction }>();
  const distance = new Map<number, number>([[key(head), 0]]);
  const cells = new Map<number, Cell>([[key(head), head]]);
  const queue: Cell[] = [head];
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (current === undefined) break;
    const currentDistance = distance.get(key(current)) ?? 0;
    for (const direction of DIRECTIONS) {
      const next = move(current, direction);
      if (next.col < 1 || next.col > GRID.columns || next.row < 1 || next.row > GRID.rows) continue;
      const nextKey = key(next);
      if (distance.has(nextKey)) continue;
      const nextDistance = currentDistance + 1;
      const isGoal = goal(next, game);
      const segment = bodyIndex.get(nextKey);
      if (!isGoal) {
        if (segment !== undefined && nextDistance <= length - 1 - segment) continue;
        if (candyKeys.has(nextKey)) continue;
      }
      distance.set(nextKey, nextDistance);
      previous.set(nextKey, { from: key(current), direction });
      cells.set(nextKey, next);
      if (isGoal) return rebuild(previous, nextKey);
      queue.push(next);
    }
  }
  return null;
}

function rebuild(
  previous: Map<number, { from: number; direction: Direction }>,
  last: number,
): Direction[] {
  const path: Direction[] = [];
  let current = last;
  for (let link = previous.get(current); link !== undefined; link = previous.get(current)) {
    path.unshift(link.direction);
    current = link.from;
  }
  return path;
}

/** Chemin vers le premier bonbon. */
export function pathToCandy(game: Game): Direction[] | null {
  return findPath(game, (cell, state) =>
    state.candies.some((candy) => candy.cell.col === cell.col && candy.cell.row === cell.row),
  );
}

/** Chemin vers une case du corps (sauf le cou et les dernières cases) : la tête s'y heurtera. */
export function pathToOwnBody(game: Game): Direction[] | null {
  return findPath(game, (cell, state) => {
    const index = state.snake.findIndex((part) => part.col === cell.col && part.row === cell.row);
    return index >= 2 && index <= state.snake.length - 3;
  });
}

/** Joue les directions sur le moteur, une commande puis un pas chacune. */
export function play(game: Game, path: Direction[]): void {
  for (const direction of path) {
    sendCommand(game, direction);
    step(game);
  }
}

/** Mange `count` bonbons de plus, par le plus court chemin à chaque fois. */
export function eatCandies(game: Game, count: number): void {
  const target = game.candiesEaten + count;
  while (game.candiesEaten < target && game.end === null) {
    const path = pathToCandy(game);
    if (path === null) throw new Error('Aucun chemin vers le bonbon.');
    play(game, path);
  }
}
