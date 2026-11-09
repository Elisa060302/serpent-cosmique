import { CANDY_COLORS, DRAW_COLORS } from '../../core/rules.ts';
import type { SpecialType } from '../../core/rules.ts';
import type { Candy, CandyColorId, SpecialCandy } from '../../core/types.ts';

type Silhouette = (typeof CANDY_COLORS)[number]['silhouette'];

/** Chemin de la silhouette dans un carré de côté `size` dont le coin haut gauche est en (x, y). */
function silhouettePath(
  context: CanvasRenderingContext2D,
  silhouette: Silhouette,
  x: number,
  y: number,
  size: number,
): void {
  const at = (u: number, v: number): [number, number] => [x + u * size, y + v * size];
  context.beginPath();
  switch (silhouette) {
    case 'wrapped-round': {
      // Rond enveloppé : un disque et deux languettes de papier.
      context.arc(...at(0.5, 0.5), size * 0.28, 0, Math.PI * 2);
      context.moveTo(...at(0.22, 0.5));
      context.lineTo(...at(0.06, 0.28));
      context.lineTo(...at(0.06, 0.72));
      context.closePath();
      context.moveTo(...at(0.78, 0.5));
      context.lineTo(...at(0.94, 0.28));
      context.lineTo(...at(0.94, 0.72));
      break;
    }
    case 'berlingot': {
      context.moveTo(...at(0.5, 0.1));
      context.lineTo(...at(0.92, 0.86));
      context.lineTo(...at(0.08, 0.86));
      break;
    }
    case 'marshmallow': {
      context.roundRect(...at(0.14, 0.14), size * 0.72, size * 0.72, size * 0.2);
      break;
    }
    case 'sugar-star': {
      for (let point = 0; point < 10; point += 1) {
        const radius = point % 2 === 0 ? 0.42 : 0.18;
        const angle = -Math.PI / 2 + (point * Math.PI) / 5;
        const [px, py] = at(0.5 + radius * Math.cos(angle), 0.52 + radius * Math.sin(angle));
        if (point === 0) context.moveTo(px, py);
        else context.lineTo(px, py);
      }
      break;
    }
  }
  context.closePath();
}

/** Dessine un bonbon de la couleur donnée, dans le carré de côté `size` dont le coin haut gauche est en (x, y). */
export function drawCandy(
  context: CanvasRenderingContext2D,
  color: CandyColorId,
  x: number,
  y: number,
  size: number,
): void {
  const style = CANDY_COLORS.find((candidate) => candidate.id === color);
  if (style === undefined) return;
  context.lineJoin = 'round';
  context.lineWidth = 1;
  silhouettePath(context, style.silhouette, x, y, size);
  context.fillStyle = style.hex;
  context.fill();
  context.strokeStyle = DRAW_COLORS.outline;
  context.stroke();
}

type Polygon = readonly (readonly [number, number])[];

/** Polygones du pictogramme de chaque type de bonbon spécial, dans un carré de côté 1. */
const PICTOGRAMS: Record<SpecialType, readonly Polygon[]> = {
  // Sablier : deux triangles pointe contre pointe.
  slow: [
    [
      [0.28, 0.18],
      [0.72, 0.18],
      [0.5, 0.5],
      [0.72, 0.82],
      [0.28, 0.82],
      [0.5, 0.5],
    ],
  ],
  // Éclair.
  turbo: [
    [
      [0.58, 0.1],
      [0.28, 0.54],
      [0.46, 0.54],
      [0.4, 0.9],
      [0.72, 0.44],
      [0.54, 0.44],
    ],
  ],
  // Deux pointes qui se rejoignent.
  shrink: [
    [
      [0.1, 0.25],
      [0.46, 0.5],
      [0.1, 0.75],
    ],
    [
      [0.9, 0.25],
      [0.54, 0.5],
      [0.9, 0.75],
    ],
  ],
  // Deux flèches de sens contraires : celle du haut va à droite, celle du bas à gauche.
  invert: [
    [
      [0.12, 0.22],
      [0.58, 0.22],
      [0.58, 0.1],
      [0.88, 0.3],
      [0.58, 0.5],
      [0.58, 0.38],
      [0.12, 0.38],
    ],
    [
      [0.88, 0.62],
      [0.42, 0.62],
      [0.42, 0.5],
      [0.12, 0.7],
      [0.42, 0.9],
      [0.42, 0.78],
      [0.88, 0.78],
    ],
  ],
};

/**
 * Pictogramme blanc du type de bonbon spécial (RG-35), cerné de sombre : il reste lisible sur les quatre
 * couleurs de bonbon, les plus claires comprises. Même dessin dans le bandeau (effet en cours).
 */
export function drawPictogram(
  context: CanvasRenderingContext2D,
  type: SpecialType,
  x: number,
  y: number,
  size: number,
): void {
  context.beginPath();
  for (const polygon of PICTOGRAMS[type]) {
    polygon.forEach(([u, v], index) => {
      if (index === 0) context.moveTo(x + u * size, y + v * size);
      else context.lineTo(x + u * size, y + v * size);
    });
    context.closePath();
  }
  context.lineJoin = 'round';
  context.lineWidth = Math.max(2, size * 0.1);
  context.strokeStyle = DRAW_COLORS.pictogramOutline;
  context.stroke();
  context.fillStyle = DRAW_COLORS.pictogram;
  context.fill();
}

/** Dessine les bonbons : chaque couleur a sa silhouette (RG-12) et un contour clair ; le bonbon spécial porte son pictogramme. */
export function drawCandies(
  context: CanvasRenderingContext2D,
  candies: readonly Candy[],
  special: SpecialCandy | null,
  cell: number,
): void {
  for (const candy of candies) {
    drawCandy(context, candy.color, (candy.cell.col - 1) * cell, (candy.cell.row - 1) * cell, cell);
  }
  if (special === null) return;
  const x = (special.cell.col - 1) * cell;
  const y = (special.cell.row - 1) * cell;
  drawCandy(context, special.color, x, y, cell);
  drawPictogram(context, special.type, x + cell * 0.15, y + cell * 0.15, cell * 0.7);
}
