import { GRID, LAYOUT } from '../core/rules.ts';

export type ControlMode = 'swipe' | 'arrows';

export interface Layout {
  /** Côté d'une case, en pixels CSS. */
  cell: number;
  gridWidth: number;
  gridHeight: number;
  hudHeight: number;
  /** Largeur de chacune des deux colonnes de flèches, marges comprises (0 en « Glissement »). */
  arrowColumn: number;
  /** Marge autour des flèches, dans la colonne (0 quand elle est retirée pour garder la case assez grande). */
  arrowPad: number;
}

/**
 * Taille de case de l'écran de partie (03 § 3.2, 05 § 4.3) : la plus grande taille entière qui laisse
 * la grille entière dans la zone sûre, une fois retirés le bandeau et, en « Flèches », deux colonnes.
 * Les colonnes portent leur propre marge. Si la marge fait passer la case sous le minimum, elle est
 * retirée avant de réduire la case ; les flèches gardent toujours leur taille.
 */
export function computeLayout(width: number, height: number, control: ControlMode): Layout {
  const columnWidth = (margin: number): number =>
    control === 'arrows' ? LAYOUT.arrowPx + 2 * margin : 0;
  // En « Flèches », les marges latérales sont celles des colonnes ; sinon, celles de la grille.
  const sideSpace = (margin: number): number =>
    control === 'arrows' ? 2 * columnWidth(margin) : 2 * margin;
  const fit = (margin: number): number =>
    Math.floor(
      Math.min(
        (width - sideSpace(margin)) / GRID.columns,
        (height - LAYOUT.hudHeightPx - 2 * margin) / GRID.rows,
      ),
    );
  const withMargin = fit(LAYOUT.marginPx);
  const margin = withMargin >= LAYOUT.minCellPx ? LAYOUT.marginPx : 0;
  const cell = margin > 0 ? withMargin : fit(0);
  return {
    cell,
    gridWidth: cell * GRID.columns,
    gridHeight: cell * GRID.rows,
    hudHeight: LAYOUT.hudHeightPx,
    arrowColumn: columnWidth(margin),
    arrowPad: control === 'arrows' ? margin : 0,
  };
}
