import { DEFAULT_DECOR, SKINS, START_SNAKE_COLOR } from '../../core/rules.ts';
import { defaultSkinOf } from '../../core/skins.ts';
import type { Cell } from '../../core/types.ts';
import { createElement } from '../dom.ts';
import { renderDecor } from './decor.ts';
import { DEFAULT_SNAKE_STYLE, drawSnake } from './snake.ts';
import { drawTrail } from './trail.ts';

/** Taille de l'aperçu d'un skin, en pixels CSS : celle du décor dessiné avec des cases de 4 pixels. */
export const PREVIEW = { width: 96, height: 48, decorCell: 4 } as const;

/** Serpent de quatre anneaux qui va vers la droite, la tête en dernière colonne. */
function miniSnake(columns: number): Cell[] {
  return [0, 1, 2, 3].map((offset) => ({ col: columns - offset, row: 1 }));
}

/**
 * Aperçu d'un skin (RG-59), dessiné dans la couleur rose de départ : sans cela, le skin paraîtrait coloré de lui-même.
 * Une forme ou un motif est montré sur un serpent de départ, une traînée derrière lui, un décor en petit.
 */
export function createSkinPreview(skinId: string, pixelRatio: number): HTMLCanvasElement {
  const canvas = createElement('canvas', {
    className: 'skin-preview',
    attributes: { 'aria-hidden': 'true' },
  });
  canvas.width = Math.round(PREVIEW.width * pixelRatio);
  canvas.height = Math.round(PREVIEW.height * pixelRatio);
  const context = canvas.getContext('2d');
  if (context === null) return canvas;
  const category = SKINS.find((skin) => skin.id === skinId)?.category ?? 'shape';
  if (category === 'decor') {
    context.drawImage(renderDecor(PREVIEW.decorCell, pixelRatio, skinId), 0, 0);
    return canvas;
  }
  context.scale(pixelRatio, pixelRatio);
  context.fillStyle = DEFAULT_DECOR.base;
  context.fillRect(0, 0, PREVIEW.width, PREVIEW.height);
  const view = { direction: 'right', color: START_SNAKE_COLOR, steps: 10 } as const;
  if (category === 'trail') {
    const cell = PREVIEW.width / 6;
    context.translate(0, (PREVIEW.height - cell) / 2);
    const points = [1, 2, 3].map((age) => ({ cell: { col: 4 - age, row: 1 }, step: 10 - age }));
    drawTrail(context, skinId, points, view, cell);
    drawSnake(context, { ...view, snake: miniSnake(6).slice(0, 3) }, cell, DEFAULT_SNAKE_STYLE);
    return canvas;
  }
  const cell = PREVIEW.width / 4;
  context.translate(0, (PREVIEW.height - cell) / 2);
  const style =
    category === 'shape'
      ? { shape: skinId, pattern: defaultSkinOf('pattern') }
      : { shape: defaultSkinOf('shape'), pattern: skinId };
  drawSnake(context, { ...view, snake: miniSnake(4) }, cell, style);
  return canvas;
}
