import { nuance, snakeColorHex } from '../../core/color.ts';
import { createRandom } from '../../core/random.ts';
import { NUANCE, TRAIL } from '../../core/rules.ts';
import type { Cell, Game } from '../../core/types.ts';

/** Case que la queue vient de quitter, avec le nombre de pas du serpent à cet instant. */
export interface TrailPoint {
  cell: Cell;
  step: number;
}

export interface Trail {
  /** Cases quittées depuis moins de `TRAIL.steps` pas, de la plus ancienne à la plus récente. */
  readonly points: readonly TrailPoint[];
  /** À appeler à chaque image : repère les cases que le serpent a quittées depuis l'appel précédent. */
  update(game: Pick<Game, 'snake' | 'steps'>): void;
}

const keyOf = (cell: Cell): string => `${cell.col},${cell.row}`;

/** Mémoire de la traînée d'une partie : purement visuelle, elle ne touche jamais à l'état du jeu. */
export function createTrail(): Trail {
  let points: TrailPoint[] = [];
  let previous: Cell[] = [];
  return {
    get points() {
      return points;
    },
    update(game) {
      const present = new Set(game.snake.map(keyOf));
      for (const cell of previous) {
        if (!present.has(keyOf(cell))) points.push({ cell, step: game.steps });
      }
      previous = game.snake.map((part) => ({ col: part.col, row: part.row }));
      points = points.filter((point) => game.steps - point.step < TRAIL.steps);
    },
  };
}

/** Ce que le dessin de la traînée lit de la partie. */
export type TrailView = Pick<Game, 'color' | 'steps'>;

type StarPath = (context: CanvasRenderingContext2D, cx: number, cy: number, radius: number) => void;

/** Étincelle à quatre branches. */
const sparkle: StarPath = (context, cx, cy, radius) => {
  context.beginPath();
  for (let point = 0; point < 8; point += 1) {
    const reach = point % 2 === 0 ? radius : radius * 0.35;
    const angle = (point * Math.PI) / 4 - Math.PI / 2;
    const px = cx + reach * Math.cos(angle);
    const py = cy + reach * Math.sin(angle);
    if (point === 0) context.moveTo(px, py);
    else context.lineTo(px, py);
  }
  context.closePath();
};

/** Cristal de sucre : un petit losange. */
const crystal: StarPath = (context, cx, cy, radius) => {
  context.beginPath();
  context.moveTo(cx, cy - radius);
  context.lineTo(cx + radius, cy);
  context.lineTo(cx, cy + radius);
  context.lineTo(cx - radius, cy);
  context.closePath();
};

/**
 * Dessine la traînée choisie (RG-61) : elle prend la couleur courante du serpent (nuances et blanc seulement), et
 * s'estompe avec l'âge de la case. À dessiner avant les bonbons, les obstacles et le serpent.
 */
export function drawTrail(
  context: CanvasRenderingContext2D,
  trail: string,
  points: readonly TrailPoint[],
  view: TrailView,
  cell: number,
): void {
  if (trail !== 'trail-stardust' && trail !== 'trail-sugar' && trail !== 'trail-aurora') return;
  for (const point of points) {
    const age = view.steps - point.step;
    const fade = 1 - age / TRAIL.steps;
    if (fade <= 0) continue;
    const color = snakeColorHex(view.color, point.step, 0);
    const x = (point.cell.col - 1) * cell;
    const y = (point.cell.row - 1) * cell;
    context.globalAlpha = fade * 0.9;
    if (trail === 'trail-aurora') {
      context.fillStyle = nuance(color, NUANCE.soft);
      context.globalAlpha = fade * 0.5;
      context.beginPath();
      context.roundRect(x + cell * 0.1, y + cell * 0.1, cell * 0.8, cell * 0.8, cell * 0.3);
      context.fill();
      continue;
    }
    const random = createRandom(point.cell.col * 97 + point.cell.row * 31 + point.step * 7);
    const draw = trail === 'trail-stardust' ? sparkle : crystal;
    context.fillStyle = nuance(color, trail === 'trail-stardust' ? NUANCE.white : NUANCE.soft);
    for (let grain = 0; grain < 3; grain += 1) {
      const cx = x + cell * (0.2 + 0.6 * random.next());
      const cy = y + cell * (0.2 + 0.6 * random.next());
      draw(context, cx, cy, cell * 0.16 * (0.5 + 0.5 * fade));
      context.fill();
    }
  }
  context.globalAlpha = 1;
}
