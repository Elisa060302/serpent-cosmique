/** Pilotage du jeu dans le navigateur : horloge simulée, gestes tactiles, lecture du canevas. */
import AxeBuilder from '@axe-core/playwright';
import { expect } from '@playwright/test';
import type { CDPSession, Page } from '@playwright/test';
import { findPath } from '../../support/pilote.ts';
import { createGame, sendCommand, speedOf, step } from '../../../src/core/engine.ts';
import { CANDY_COLORS, DEFAULT_DECOR, GRID, PX_PER_MM } from '../../../src/core/rules.ts';
import { pupilPositions } from '../../../src/ui/render/snake.ts';
import type { Cell, Direction, Game, ModeRules, SnakeColor } from '../../../src/core/types.ts';

export const START_TIME = new Date('2026-11-01T10:00:00');
export const FRAME_MS = 16;

/** Ouvre le jeu avec une horloge simulée, arrêtée juste après le chargement. */
export async function openGame(
  page: Page,
  options: { seed?: number; control?: 'swipe' | 'arrows' } = {},
): Promise<void> {
  await page.clock.install({ time: START_TIME });
  const query = options.seed === undefined ? '' : `?seed=${options.seed}`;
  await page.goto(`/${query}`);
  await page.clock.pauseAt(new Date(START_TIME.getTime() + 1000));
  if (options.control === 'arrows') await chooseArrows(page);
}

/** Réglages → « Flèches » → retour au menu : la commande passe, comme pour le joueur, par l'écran de réglages. */
export async function chooseArrows(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Réglages' }).tap();
  await page.getByRole('radio', { name: 'Flèches' }).tap();
  await page.getByRole('button', { name: '‹ Retour' }).tap();
}

/** Menu → « Jouer » → « Classique » : deux touchers. */
export async function startClassic(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Jouer' }).tap();
  await page.getByRole('button', { name: 'Classique' }).tap();
}

/** Menu → « Jouer » → le mode de ce nom : deux touchers. */
export async function startMode(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name: 'Jouer' }).tap();
  await page.getByRole('button', { name: new RegExp(`^${name}`) }).tap();
}

export async function runFor(page: Page, ms: number): Promise<void> {
  await page.clock.runFor(ms);
}

/** Laisse passer le compte à rebours de 3 secondes (et pas un pas de plus). */
export async function skipCountdown(page: Page): Promise<void> {
  await runFor(page, 3100);
}

const sessions = new WeakMap<Page, CDPSession>();

async function session(page: Page): Promise<CDPSession> {
  let client = sessions.get(page);
  if (client === undefined) {
    client = await page.context().newCDPSession(page);
    sessions.set(page, client);
  }
  return client;
}

const VECTORS: Record<Direction, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

export interface Point {
  x: number;
  y: number;
}

/**
 * Événement tactile brut. Sur Chromium, vrai toucher par le protocole de débogage ; sur les autres
 * navigateurs (WebKit en intégration continue), événements de pointeur de type « toucher » envoyés à la page.
 */
export async function touch(
  page: Page,
  type: 'touchStart' | 'touchMove' | 'touchEnd',
  point: Point | null,
): Promise<void> {
  if (page.context().browser()?.browserType().name() === 'chromium') {
    const client = await session(page);
    await client.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: point === null ? [] : [point],
    });
    return;
  }
  await page.evaluate(
    ({ kind, at }) => {
      const state = window as unknown as {
        __touch?: { target: Element; x: number; y: number };
      };
      if (kind === 'touchStart' && at !== null) {
        const target = document.elementFromPoint(at.x, at.y);
        if (target === null) return;
        state.__touch = { target, x: at.x, y: at.y };
      }
      const current = state.__touch;
      if (current === undefined) return;
      if (at !== null) {
        current.x = at.x;
        current.y = at.y;
      }
      const names = { touchStart: 'pointerdown', touchMove: 'pointermove', touchEnd: 'pointerup' };
      current.target.dispatchEvent(
        new PointerEvent(names[kind], {
          pointerId: 77,
          pointerType: 'touch',
          isPrimary: true,
          bubbles: true,
          cancelable: true,
          clientX: current.x,
          clientY: current.y,
        }),
      );
    },
    { kind: type, at: point },
  );
}

/** Glissement tactile réel (protocole de débogage) de `distanceMm` millimètres dans une direction, par `segments` étapes. */
export async function swipeFrom(
  page: Page,
  from: Point,
  vector: [number, number],
  distanceMm: number,
  segments = 4,
): Promise<void> {
  const total = distanceMm * PX_PER_MM;
  const at = (fraction: number): Point => ({
    x: from.x + vector[0] * total * fraction,
    y: from.y + vector[1] * total * fraction,
  });
  await touch(page, 'touchStart', at(0));
  for (let index = 1; index <= segments; index += 1) {
    await touch(page, 'touchMove', at(index / segments));
  }
  await touch(page, 'touchEnd', null);
}

export async function gridCenter(page: Page): Promise<Point> {
  const box = await page.locator('canvas').boundingBox();
  expect(box).not.toBeNull();
  return { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 };
}

/** Glisse de 1 cm au milieu de la grille. */
export async function swipe(page: Page, direction: Direction, distanceMm = 10): Promise<void> {
  await swipeFrom(page, await gridCenter(page), VECTORS[direction], distanceMm);
}

export interface Reading {
  snake: (Cell & { color: SnakeColor | 'inconnue' })[];
  head: (Cell & { direction: Direction; color: SnakeColor | 'inconnue' }) | null;
  candies: (Cell & { color: string })[];
}

const CANDY_BY_HEX = new Map<string, string>(CANDY_COLORS.map((color) => [color.hex, color.id]));

/** Lit les pixels du canevas : cases du serpent, tête et direction, bonbons. */
export async function read(page: Page): Promise<Reading> {
  const cells = await page.evaluate(
    ({ columns, rows, background, pupils }) => {
      const canvas = document.querySelector('canvas');
      const context = canvas?.getContext('2d');
      if (!canvas || !context) return [];
      const size = canvas.width / columns;
      const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
      // Décor : tous ses détails (étoiles, quadrillage, constellations du ciel) sont sombres, aucun élément de jeu ne l'est.
      const isBackground = (color: string): boolean =>
        Math.max(...[0, 2, 4].map((offset) => parseInt(color.slice(offset, offset + 2), 16))) <
        0x90;
      const hex = (u: number, v: number, col: number, row: number): string => {
        const x = Math.floor((col - 1 + u) * size);
        const y = Math.floor((row - 1 + v) * size);
        const index = (y * canvas.width + x) * 4;
        return [0, 1, 2]
          .map((offset) => (data[index + offset] ?? 0).toString(16).padStart(2, '0'))
          .join('')
          .toUpperCase();
      };
      const found: { col: number; row: number; center: string; headDirection: string | null }[] =
        [];
      for (let row = 1; row <= rows; row += 1) {
        for (let col = 1; col <= columns; col += 1) {
          const center = hex(0.5, 0.5, col, row);
          if (isBackground(center)) continue;
          const topLeft = hex(0.15, 0.15, col, row);
          const topRight = hex(0.85, 0.15, col, row);
          const isSnake = !isBackground(topLeft) && !isBackground(topRight);
          let headDirection: string | null = null;
          if (isSnake) {
            for (const [direction, points] of Object.entries(pupils)) {
              if (points.every(([u, v]) => hex(u, v, col, row) === background[0])) {
                headDirection = direction;
              }
            }
          }
          found.push({ col, row, center, headDirection: isSnake ? (headDirection ?? '') : null });
        }
      }
      return found;
    },
    {
      columns: GRID.columns,
      rows: GRID.rows,
      background: [DEFAULT_DECOR.base, DEFAULT_DECOR.star, DEFAULT_DECOR.grid].map((color) =>
        color.slice(1).toUpperCase(),
      ),
      pupils: Object.fromEntries(
        (['up', 'down', 'left', 'right'] as const).map((direction) => [
          direction,
          pupilPositions(direction),
        ]),
      ),
    },
  );
  const reading: Reading = { snake: [], head: null, candies: [] };
  for (const item of cells) {
    const hex = `#${item.center}`;
    const color = (CANDY_BY_HEX.get(hex) as SnakeColor | undefined) ?? 'inconnue';
    if (item.headDirection === null) {
      reading.candies.push({ col: item.col, row: item.row, color });
      continue;
    }
    reading.snake.push({ col: item.col, row: item.row, color });
    if (item.headDirection !== '') {
      reading.head = {
        col: item.col,
        row: item.row,
        direction: item.headDirection as Direction,
        color,
      };
    }
  }
  // Un serpent de plusieurs teintes est arc-en-ciel (certaines teintes sont aussi des couleurs de bonbon).
  if (new Set(reading.snake.map((part) => part.color)).size > 1) {
    for (const part of reading.snake) part.color = 'rainbow';
    if (reading.head !== null) reading.head.color = 'rainbow';
  }
  return reading;
}

/**
 * Avance l'horloge jusqu'à ce que la tête change de case. `intervalMs` (intervalle nominal entre deux pas)
 * évite de lire le canevas à chaque image : on avance d'abord presque jusqu'au pas.
 */
export async function stepOnce(page: Page, intervalMs = 0): Promise<Reading> {
  const before = (await read(page)).head;
  if (intervalMs > 4 * FRAME_MS) await runFor(page, intervalMs - 4 * FRAME_MS);
  for (let frame = 0; frame < 40; frame += 1) {
    await runFor(page, FRAME_MS);
    const now = await read(page);
    if (now.head?.col !== before?.col || now.head?.row !== before?.row) return now;
  }
  throw new Error('Le serpent n’a pas avancé.');
}

/**
 * Joue un chemin dans le navigateur et sur le moteur, pas à pas, en vérifiant à chaque pas
 * que la tête affichée est celle du moteur.
 */
export async function drive(page: Page, game: Game, path: Direction[]): Promise<void> {
  for (const direction of path) {
    if (sendCommand(game, direction)) await swipe(page, direction);
    step(game);
    const reading = await stepOnce(page, 1000 / speedOf(game));
    const head = game.snake[0] as Cell;
    expect(reading.head).toMatchObject({ col: head.col, row: head.row });
  }
}

/** Mange un bonbon de plus, dans le navigateur et sur le moteur. */
export async function eatNextCandy(page: Page, game: Game): Promise<void> {
  const path = findPath(game, (cell, state) =>
    state.candies.some((candy) => candy.cell.col === cell.col && candy.cell.row === cell.row),
  );
  if (path === null) throw new Error('Aucun chemin vers le bonbon.');
  await drive(page, game, path);
}

/** Violations d'accessibilité d'impact « serious » ou « critical » (WCAG 2.0, 2.1 et 2.2, niveaux A et AA). */
export async function seriousViolations(page: Page): Promise<string[]> {
  await page.clock.resume();
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  return results.violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map(
      (violation) => `${violation.id} : ${violation.nodes.map((node) => node.target).join(' ')}`,
    );
}

/** Surveille ce que le jeu ne doit jamais produire : exception, erreur de console, boîte de dialogue du navigateur. */
export function watchProblems(page: Page): string[] {
  const problems: string[] = [];
  page.on('pageerror', (error) => problems.push(`exception : ${error.message}`));
  page.on('console', (message) => {
    // L'avertissement sur `getImageData` vient de la lecture des pixels par le pilote de recette, pas du jeu.
    if (message.type() !== 'log' && !message.text().includes('willReadFrequently')) {
      problems.push(`console ${message.type()} : ${message.text()}`);
    }
  });
  page.on('dialog', (dialog) => {
    problems.push(`boîte du navigateur : ${dialog.message()}`);
    void dialog.dismiss();
  });
  return problems;
}

/** Joue une partie Classique jusqu'au premier pas, serpent à droite en colonne 7. */
export async function startRunning(
  page: Page,
  options: { seed?: number; control?: 'swipe' | 'arrows' } = {},
): Promise<void> {
  await openGame(page, { seed: options.seed ?? 1, control: options.control });
  await startClassic(page);
  await runFor(page, 50);
  await skipCountdown(page);
  await stepOnce(page, 1000 / 6);
}

/** Avance l'horloge jusqu'à l'écran de fin (au plus une minute de jeu simulé). */
export async function waitForEndScreen(page: Page): Promise<void> {
  for (let tick = 0; tick < 240; tick += 1) {
    if ((await page.locator('.end').count()) > 0) return;
    await runFor(page, 250);
  }
  throw new Error('L’écran de fin ne s’affiche pas.');
}

/**
 * Lance la partie d'un mode et attend son premier pas ; renvoie le moteur de recette (même graine) lui aussi
 * au premier pas, pour suivre le navigateur pas à pas.
 */
export async function startModeRunning(
  page: Page,
  rules: ModeRules,
  name: string,
  options: { seed?: number; control?: 'swipe' | 'arrows' } = {},
): Promise<Game> {
  const seed = options.seed ?? 1;
  await openGame(page, { seed, control: options.control });
  await startMode(page, name);
  await runFor(page, 50);
  await skipCountdown(page);
  const oracle = createGame(rules, seed);
  await stepOnce(page, 1000 / speedOf(oracle));
  step(oracle);
  return oracle;
}

/** Cases dont le pixel central a la couleur donnée (astéroïdes, centres des trous noirs). */
export async function cellsWithCenter(page: Page, hex: string): Promise<Cell[]> {
  return page.evaluate(
    ({ columns, rows, color }) => {
      const canvas = document.querySelector('canvas');
      const context = canvas?.getContext('2d');
      if (!canvas || !context) return [];
      const size = canvas.width / columns;
      const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const wanted = [1, 3, 5].map((offset) => parseInt(color.slice(offset, offset + 2), 16));
      const found: { col: number; row: number }[] = [];
      for (let row = 1; row <= rows; row += 1) {
        for (let col = 1; col <= columns; col += 1) {
          const x = Math.floor((col - 0.5) * size);
          const y = Math.floor((row - 0.5) * size);
          const index = (y * canvas.width + x) * 4;
          if ([0, 1, 2].every((offset) => data[index + offset] === wanted[offset])) {
            found.push({ col, row });
          }
        }
      }
      return found;
    },
    { columns: GRID.columns, rows: GRID.rows, color: hex },
  );
}

/** Nombre de pixels de la couleur donnée dans une case, en retirant `margin` (fraction de la case) de chaque côté. */
export async function countInCell(
  page: Page,
  cell: Cell,
  hex: string,
  margin = 0.25,
): Promise<number> {
  return page.evaluate(
    ({ columns, at, color, inset }) => {
      const canvas = document.querySelector('canvas');
      const context = canvas?.getContext('2d');
      if (!canvas || !context) return 0;
      const size = canvas.width / columns;
      const left = Math.floor((at.col - 1 + inset) * size);
      const top = Math.floor((at.row - 1 + inset) * size);
      const width = Math.floor((1 - 2 * inset) * size);
      const data = context.getImageData(left, top, width, width).data;
      const wanted = [1, 3, 5].map((offset) => parseInt(color.slice(offset, offset + 2), 16));
      let count = 0;
      for (let index = 0; index < data.length; index += 4) {
        if ([0, 1, 2].every((offset) => data[index + offset] === wanted[offset])) count += 1;
      }
      return count;
    },
    { columns: GRID.columns, at: cell, color: hex, inset: margin },
  );
}
