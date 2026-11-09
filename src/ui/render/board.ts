import type { Game } from '../../core/types.ts';
import { drawCandies } from './candies.ts';
import { drawTwinkle } from './decor.ts';
import { drawAsteroids, drawBlackHoles } from './obstacles.ts';
import { drawSnake } from './snake.ts';
import type { SnakeStyle } from './snake.ts';
import { drawTrail } from './trail.ts';
import type { TrailPoint } from './trail.ts';

/** Skins choisis pour la partie (identifiants du catalogue). */
export interface BoardStyle extends SnakeStyle {
  trail: string;
  decor: string;
}

/** Ce qui s'ajoute à la partie pour le dessin : décor préparé, skins, traînée et temps d'animation du décor. */
export interface BoardView {
  decor: HTMLCanvasElement;
  style: BoardStyle;
  trail: readonly TrailPoint[];
  /** Temps de jeu passé à animer le décor, en millisecondes : il n'avance ni en pause ni avec le mouvement réduit. */
  animationMs: number;
}

/**
 * Dessine l'aire de jeu, de l'arrière vers l'avant : décor, étoiles qui scintillent, traînée, trous noirs,
 * astéroïdes, bonbons, serpent. Un skin ne cache donc jamais un élément de jeu (RG-61).
 */
export function drawBoard(
  context: CanvasRenderingContext2D,
  view: BoardView,
  game: Game,
  cell: number,
  pixelRatio: number,
): void {
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.drawImage(view.decor, 0, 0);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  drawTwinkle(context, view.style.decor, cell, view.animationMs);
  drawTrail(context, view.style.trail, view.trail, game, cell);
  drawBlackHoles(context, game.holes, cell);
  drawAsteroids(context, game.obstacles, cell);
  drawCandies(context, game.candies, game.special, cell);
  drawSnake(context, game, cell, view.style);
}
