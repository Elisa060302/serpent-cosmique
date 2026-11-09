import { CANDY_COLORS, RAINBOW_COLORS, RAINBOW_EVERY, START_SNAKE_COLOR } from './rules.ts';
import type { CandyColorId, SnakeColor } from './types.ts';

export const START_COLOR: SnakeColor = START_SNAKE_COLOR;

/** Couleur du serpent après un bonbon : arc-en-ciel à chaque dizaine, sinon la couleur du bonbon (RG-17, RG-19). */
export function colorAfterCandy(candiesEaten: number, candyColor: CandyColorId): SnakeColor {
  return candiesEaten % RAINBOW_EVERY === 0 ? 'rainbow' : candyColor;
}

/**
 * Teinte de l'arc-en-ciel d'une case du serpent. Chaque case garde sa teinte pendant toute sa vie :
 * elle est liée au pas qui l'a créée, donc rien ne scintille quand le serpent avance.
 */
export function rainbowColor(steps: number, segmentIndex: number): string {
  const count = RAINBOW_COLORS.length;
  const index = (((steps - segmentIndex) % count) + count) % count;
  return RAINBOW_COLORS[index] ?? RAINBOW_COLORS[0];
}

/** Couleur affichée d'une case du serpent : celle du dernier bonbon, ou la teinte de l'arc-en-ciel de cette case. */
export function snakeColorHex(color: SnakeColor, steps: number, segmentIndex: number): string {
  if (color === 'rainbow') return rainbowColor(steps, segmentIndex);
  return CANDY_COLORS.find((candy) => candy.id === color)?.hex ?? CANDY_COLORS[0].hex;
}

/**
 * Nuance d'une couleur : la couleur mélangée à une part `white` de blanc (0 : inchangée, 1 : blanc).
 * Les motifs et les traînées n'emploient que des nuances de la couleur du serpent (RG-18).
 */
export function nuance(hex: string, white: number): string {
  const channel = (offset: number): string => {
    const value = parseInt(hex.slice(offset, offset + 2), 16);
    return Math.round(value + (255 - value) * white)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${channel(1)}${channel(3)}${channel(5)}`.toUpperCase();
}
