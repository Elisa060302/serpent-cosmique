import { nuance, snakeColorHex } from '../../core/color.ts';
import { DRAW_COLORS, NUANCE } from '../../core/rules.ts';
import type { Cell, Direction, SnakeColor } from '../../core/types.ts';

/** Ce que le dessin du serpent lit de la partie : ses cases, sa direction, sa couleur et le nombre de pas (arc-en-ciel). */
export interface SnakeView {
  snake: readonly Cell[];
  direction: Direction;
  color: SnakeColor;
  steps: number;
}

/** Forme et motif choisis (identifiants du catalogue) ; tout identifiant inconnu donne le skin par défaut. */
export interface SnakeStyle {
  shape: string;
  pattern: string;
}

export const DEFAULT_SNAKE_STYLE: SnakeStyle = { shape: 'shape-rings', pattern: 'pattern-plain' };

/** Position des deux pupilles dans la case de la tête, en fraction de la case, selon la direction (toutes les formes). */
export function pupilPositions(direction: Direction): [[number, number], [number, number]] {
  switch (direction) {
    case 'right':
      return [
        [0.68, 0.3],
        [0.68, 0.7],
      ];
    case 'left':
      return [
        [0.32, 0.3],
        [0.32, 0.7],
      ];
    case 'up':
      return [
        [0.3, 0.32],
        [0.7, 0.32],
      ];
    case 'down':
      return [
        [0.3, 0.68],
        [0.7, 0.68],
      ];
  }
}

const VECTORS: Record<Direction, readonly [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

/** Direction de déplacement d'un anneau : de lui vers l'anneau précédent (celui du côté de la tête). */
function segmentDirection(view: SnakeView, index: number): Direction {
  const part = view.snake[index];
  const ahead = view.snake[index - 1];
  if (index === 0 || part === undefined || ahead === undefined) return view.direction;
  // Une traversée du bord (Zen) ou un trou noir : la différence n'est pas d'une case, on garde la direction de la tête.
  const unwrap = (delta: number): number => (Math.abs(delta) > 1 ? -Math.sign(delta) : delta);
  const dx = unwrap(ahead.col - part.col);
  const dy = unwrap(ahead.row - part.row);
  if (Math.abs(dx) + Math.abs(dy) !== 1) return view.direction;
  if (dx === 1) return 'right';
  if (dx === -1) return 'left';
  return dy === 1 ? 'down' : 'up';
}

/** Un anneau à dessiner : sa case (coin haut gauche en pixels), son rang, sa direction et la longueur du serpent. */
interface Piece {
  x: number;
  y: number;
  cell: number;
  index: number;
  length: number;
  direction: Direction;
}

/** Point de la case en coordonnées de l'anneau : `forward` vers l'avant, `side` sur le côté, de -0,5 à 0,5. */
function localPoint(piece: Piece, forward: number, side: number): [number, number] {
  const [dx, dy] = VECTORS[piece.direction];
  return [
    piece.x + piece.cell * (0.5 + forward * dx - side * dy),
    piece.y + piece.cell * (0.5 + forward * dy + side * dx),
  ];
}

function polygon(
  context: CanvasRenderingContext2D,
  piece: Piece,
  points: readonly (readonly [number, number])[],
): void {
  context.beginPath();
  points.forEach(([forward, side], order) => {
    const [px, py] = localPoint(piece, forward, side);
    if (order === 0) context.moveTo(px, py);
    else context.lineTo(px, py);
  });
  context.closePath();
}

/** Forme « Anneaux » : des carrés arrondis, la tête un peu plus grande. */
function ringsPath(context: CanvasRenderingContext2D, piece: Piece): void {
  const inset = piece.index === 0 ? 0.5 : piece.cell * 0.05;
  context.beginPath();
  context.roundRect(
    piece.x + inset,
    piece.y + inset,
    piece.cell - 2 * inset,
    piece.cell - 2 * inset,
    piece.cell * 0.28,
  );
}

/** Forme « Comète » : des disques qui rapetissent de la tête vers la queue. */
function cometPath(context: CanvasRenderingContext2D, piece: Piece): void {
  const bodyLength = Math.max(1, piece.length - 2);
  const radius = piece.index === 0 ? 0.46 : 0.4 - 0.24 * ((piece.index - 1) / bodyLength);
  const [cx, cy] = localPoint(piece, 0, 0);
  context.beginPath();
  context.arc(cx, cy, piece.cell * radius, 0, Math.PI * 2);
}

/** Forme « Fusée » : nez pointu à la tête, fuselage au corps, ailerons à la dernière case. */
function rocketPath(context: CanvasRenderingContext2D, piece: Piece): void {
  if (piece.index === 0) {
    polygon(context, piece, [
      [0.5, 0],
      [0.28, 0.42],
      [-0.46, 0.42],
      [-0.46, -0.42],
      [0.28, -0.42],
    ]);
  } else if (piece.index === piece.length - 1) {
    polygon(context, piece, [
      [0.5, 0.34],
      [0, 0.34],
      [-0.45, 0.5],
      [-0.45, -0.5],
      [0, -0.34],
      [0.5, -0.34],
    ]);
  } else {
    polygon(context, piece, [
      [0.5, 0.34],
      [-0.5, 0.34],
      [-0.5, -0.34],
      [0.5, -0.34],
    ]);
  }
}

/** Forme « Soucoupe » : des ellipses larges, perpendiculaires à la marche. */
function saucerPath(context: CanvasRenderingContext2D, piece: Piece): void {
  const along = piece.index === 0 ? 0.44 : 0.34;
  const across = piece.index === 0 ? 0.46 : 0.48;
  const horizontal = piece.direction === 'left' || piece.direction === 'right';
  const [cx, cy] = localPoint(piece, 0, 0);
  context.beginPath();
  context.ellipse(
    cx,
    cy,
    piece.cell * (horizontal ? along : across),
    piece.cell * (horizontal ? across : along),
    0,
    0,
    Math.PI * 2,
  );
}

const SHAPES: Record<string, (context: CanvasRenderingContext2D, piece: Piece) => void> = {
  'shape-rings': ringsPath,
  'shape-comet': cometPath,
  'shape-rocket': rocketPath,
  'shape-saucer': saucerPath,
};

type PatternDrawer = (context: CanvasRenderingContext2D, piece: Piece, color: string) => void;

/** Point de la case de l'anneau, en fraction de la case (le motif ne dépend pas de la marche). */
function inCell(piece: Piece, u: number, v: number): [number, number] {
  return [piece.x + u * piece.cell, piece.y + v * piece.cell];
}

/**
 * Motifs d'un anneau du corps, dessinés dans la forme (rognée) : nuances de la couleur courante ou blanc seulement.
 */
const PATTERNS: Record<string, PatternDrawer> = {
  'pattern-dots': (context, piece, color) => {
    context.fillStyle = nuance(color, NUANCE.soft);
    context.beginPath();
    context.arc(...inCell(piece, 0.5, 0.5), piece.cell * 0.16, 0, Math.PI * 2);
    context.fill();
  },
  'pattern-stars': (context, piece, color) => {
    context.fillStyle = nuance(color, NUANCE.white);
    context.beginPath();
    for (let point = 0; point < 10; point += 1) {
      const radius = point % 2 === 0 ? 0.3 : 0.13;
      const angle = -Math.PI / 2 + (point * Math.PI) / 5;
      const [px, py] = inCell(
        piece,
        0.5 + radius * Math.cos(angle),
        0.5 + radius * Math.sin(angle),
      );
      if (point === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    }
    context.closePath();
    context.fill();
  },
  'pattern-candy-cane': (context, piece, color) => {
    context.strokeStyle = nuance(color, NUANCE.white);
    context.lineWidth = piece.cell * 0.16;
    context.beginPath();
    for (const offset of [-0.5, 0, 0.5]) {
      context.moveTo(...inCell(piece, offset, 1));
      context.lineTo(...inCell(piece, offset + 1, 0));
    }
    context.stroke();
  },
};

/**
 * Dessine le serpent (RG-18) : la forme et le motif choisis, toujours dans la couleur courante du serpent (une teinte
 * par anneau en arc-en-ciel) ; la tête garde ses deux yeux quelle que soit la forme.
 */
export function drawSnake(
  context: CanvasRenderingContext2D,
  view: SnakeView,
  cell: number,
  style: SnakeStyle = DEFAULT_SNAKE_STYLE,
): void {
  const shape = SHAPES[style.shape] ?? ringsPath;
  // Faux positif : la clé vient d'un habillage validé contre le catalogue, jamais d'une saisie.
  // nosemgrep: semgrep-rules.javascript.lang.security.audit.unsafe-dynamic-method
  const pattern = PATTERNS[style.pattern];
  context.lineWidth = 1;
  context.lineJoin = 'round';
  for (let index = view.snake.length - 1; index >= 0; index -= 1) {
    const part = view.snake[index];
    if (part === undefined) continue;
    const piece: Piece = {
      x: (part.col - 1) * cell,
      y: (part.row - 1) * cell,
      cell,
      index,
      length: view.snake.length,
      direction: segmentDirection(view, index),
    };
    const color = snakeColorHex(view.color, view.steps, index);
    shape(context, piece);
    context.fillStyle = color;
    context.fill();
    if (index > 0 && pattern !== undefined) {
      context.save();
      shape(context, piece);
      context.clip();
      pattern(context, piece, color);
      context.restore();
      shape(context, piece);
    }
    context.strokeStyle = DRAW_COLORS.outline;
    context.stroke();
  }
  const head = view.snake[0];
  if (head === undefined) return;
  for (const [u, v] of pupilPositions(view.direction)) {
    const cx = (head.col - 1 + u) * cell;
    const cy = (head.row - 1 + v) * cell;
    context.beginPath();
    context.arc(cx, cy, cell * 0.13, 0, Math.PI * 2);
    context.fillStyle = DRAW_COLORS.eyeWhite;
    context.fill();
    context.beginPath();
    context.arc(cx, cy, cell * 0.065, 0, Math.PI * 2);
    context.fillStyle = DRAW_COLORS.pupil;
    context.fill();
  }
}
