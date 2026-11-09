import { GRID } from './rules.ts';
import type { Cell, Direction } from './types.ts';

const DELTAS: Record<Direction, Cell> = {
  up: { col: 0, row: -1 },
  down: { col: 0, row: 1 },
  left: { col: -1, row: 0 },
  right: { col: 1, row: 0 },
};

export function move(cell: Cell, direction: Direction): Cell {
  const delta = DELTAS[direction];
  return { col: cell.col + delta.col, row: cell.row + delta.row };
}

export function isInside(cell: Cell): boolean {
  return cell.col >= 1 && cell.col <= GRID.columns && cell.row >= 1 && cell.row <= GRID.rows;
}

export function sameCell(a: Cell, b: Cell): boolean {
  return a.col === b.col && a.row === b.row;
}

/** Cases de la grille qui ne sont dans aucune des listes données. */
export function freeCells(...occupied: (readonly Cell[])[]): Cell[] {
  const taken = new Set<number>();
  for (const cells of occupied) {
    for (const cell of cells) taken.add((cell.row - 1) * GRID.columns + cell.col - 1);
  }
  const free: Cell[] = [];
  for (let row = 1; row <= GRID.rows; row += 1) {
    for (let col = 1; col <= GRID.columns; col += 1) {
      if (!taken.has((row - 1) * GRID.columns + col - 1)) free.push({ col, row });
    }
  }
  return free;
}

/** Case de l'autre côté de la grille quand la case donnée en sort (Zen : les bords se traversent, RG-39). */
export function wrapCell(cell: Cell): Cell {
  return {
    col: ((cell.col - 1 + GRID.columns) % GRID.columns) + 1,
    row: ((cell.row - 1 + GRID.rows) % GRID.rows) + 1,
  };
}

/** Distance en cases, colonnes plus lignes (RG-32, RG-33). */
export function distance(a: Cell, b: Cell): number {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}
