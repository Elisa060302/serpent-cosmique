import { distance } from '../board.ts';
import { pickFreeCell } from '../engine.ts';
import { BLACK_HOLES } from '../rules.ts';
import type { Cell, Game, ModeRules } from '../types.ts';
import { CLASSIC } from './classic.ts';

function isHoleZone(cell: Cell): boolean {
  return (
    cell.col >= BLACK_HOLES.columns.min &&
    cell.col <= BLACK_HOLES.columns.max &&
    cell.row >= BLACK_HOLES.rows.min &&
    cell.row <= BLACK_HOLES.rows.max &&
    cell.row !== BLACK_HOLES.excludedRow
  );
}

/**
 * Place les trous : deux trous consécutifs forment une paire, chacun à `minDistance` cases au moins des autres.
 * Chaque trou est enregistré tout de suite (il compte comme occupé pour le tirage suivant), puis les jumeaux sont liés.
 */
function placeHoles(game: Game): void {
  for (let index = 0; index < BLACK_HOLES.pairs * 2; index += 1) {
    const cell = pickFreeCell(
      game,
      (candidate) =>
        isHoleZone(candidate) &&
        game.holes.every((other) => distance(candidate, other.cell) >= BLACK_HOLES.minDistance),
    );
    if (cell === null) return;
    game.holes.push({ cell, pair: Math.floor(index / 2), twin: cell });
  }
  for (const hole of game.holes) {
    const twin = game.holes.find((other) => other.pair === hole.pair && other !== hole);
    if (twin !== undefined) hole.twin = twin.cell;
  }
}

/** Trou noir : 2 paires de trous fixes, la tête ressort du jumeau ; vitesse du mode Classique (RG-33, RG-34). */
export const BLACK_HOLE_MODE: ModeRules = {
  id: 'black-hole',
  speed: (candiesEaten) => CLASSIC.speed(candiesEaten),
  candyCount: 1,
  setup: placeHoles,
};
