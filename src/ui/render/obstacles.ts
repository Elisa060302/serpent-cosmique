import { BLACK_HOLES, DRAW_COLORS } from '../../core/rules.ts';
import type { BlackHole, Cell } from '../../core/types.ts';

/** Contour irrégulier de l'astéroïde dans un carré de côté 1 (un seul dessin pour tous). */
const ROCK: readonly (readonly [number, number])[] = [
  [0.5, 0.1],
  [0.78, 0.2],
  [0.9, 0.48],
  [0.8, 0.8],
  [0.5, 0.9],
  [0.2, 0.8],
  [0.1, 0.46],
  [0.22, 0.2],
];

/** Cratères : (u, v, rayon) dans le même carré. Le centre de la case reste de la couleur de la roche. */
const CRATERS: readonly (readonly [number, number, number])[] = [
  [0.34, 0.32, 0.09],
  [0.68, 0.64, 0.11],
  [0.3, 0.7, 0.07],
];

/** Dessine les astéroïdes (RG-31) : roche claire cernée de blanc, cratères sombres. */
export function drawAsteroids(
  context: CanvasRenderingContext2D,
  asteroids: readonly Cell[],
  cell: number,
): void {
  context.lineJoin = 'round';
  context.lineWidth = 1;
  for (const asteroid of asteroids) {
    const x = (asteroid.col - 1) * cell;
    const y = (asteroid.row - 1) * cell;
    context.beginPath();
    ROCK.forEach(([u, v], index) => {
      if (index === 0) context.moveTo(x + u * cell, y + v * cell);
      else context.lineTo(x + u * cell, y + v * cell);
    });
    context.closePath();
    context.fillStyle = DRAW_COLORS.asteroid;
    context.fill();
    context.strokeStyle = DRAW_COLORS.outline;
    context.stroke();
    context.fillStyle = DRAW_COLORS.crater;
    for (const [u, v, radius] of CRATERS) {
      context.beginPath();
      context.arc(x + u * cell, y + v * cell, radius * cell, 0, Math.PI * 2);
      context.fill();
    }
  }
}

/**
 * Dessine les trous noirs (RG-33) : un centre sombre cerné d'un halo. La paire se reconnaît à la fois à sa teinte
 * et à son trait (plein ou pointillé), donc pas à la couleur seule.
 */
export function drawBlackHoles(
  context: CanvasRenderingContext2D,
  holes: readonly BlackHole[],
  cell: number,
): void {
  for (const hole of holes) {
    const halo = BLACK_HOLES.halos[hole.pair];
    if (halo === undefined) continue;
    const cx = (hole.cell.col - 0.5) * cell;
    const cy = (hole.cell.row - 0.5) * cell;
    context.beginPath();
    context.arc(cx, cy, cell * 0.4, 0, Math.PI * 2);
    context.fillStyle = DRAW_COLORS.holeCore;
    context.fill();
    context.beginPath();
    context.arc(cx, cy, cell * 0.4, 0, Math.PI * 2);
    context.lineWidth = Math.max(2, cell * 0.12);
    context.setLineDash(halo.style === 'dotted' ? [cell * 0.12, cell * 0.12] : []);
    context.lineCap = 'butt';
    context.strokeStyle = halo.hex;
    context.stroke();
    context.setLineDash([]);
  }
}
