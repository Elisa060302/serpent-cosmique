import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createGame, sendCommand, speedOf, step } from '../../src/core/engine.ts';
import { CLASSIC } from '../../src/core/modes/classic.ts';
import { GRID, PX_PER_MM } from '../../src/core/rules.ts';
import type { Cell, Direction, Game } from '../../src/core/types.ts';
import { contrast } from '../support/contraste.ts';
import { findPath } from '../support/pilote.ts';
import { chooseFile } from './support/fichiers.ts';
import {
  openGame,
  read,
  runFor,
  skipCountdown,
  startClassic,
  stepOnce,
  waitForEndScreen,
  watchProblems,
} from './support/jeu.ts';
import { SEED_DATE, progressWith, seedStorage } from './support/sauvegarde.ts';

const MIN_TARGET_PX = 9 * PX_PER_MM;
const MIN_ARROW_PX = 12 * PX_PER_MM;

interface FocusInfo {
  name: string;
  /** Vrai si cet élément avait déjà reçu le focus pendant le parcours. */
  seen: boolean;
  outlineStyle: string;
  outlineWidth: number;
  outlineColor: string;
  background: string;
}

/** Note, dans la page, chaque élément qui reçoit le focus. */
async function watchFocus(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __seen?: WeakSet<Element> };
    w.__seen = new WeakSet();
  });
}

async function focusInfo(page: Page): Promise<FocusInfo | null> {
  return page.evaluate(() => {
    const element = document.activeElement;
    if (element === null || element === document.body) return null;
    const w = window as unknown as { __seen: WeakSet<Element> };
    const seen = w.__seen.has(element);
    w.__seen.add(element);
    const style = getComputedStyle(element);
    let background = '';
    for (
      let node: Element | null = element.parentElement;
      node !== null;
      node = node.parentElement
    ) {
      const color = getComputedStyle(node).backgroundColor;
      if (color !== 'transparent' && !/, 0\)$/.test(color)) {
        background = color;
        break;
      }
    }
    const labels = (element as HTMLInputElement).labels;
    const name = (
      element.getAttribute('aria-label') ??
      labels?.[0]?.textContent ??
      element.textContent ??
      ''
    )
      .replace(/\s+/g, ' ')
      .trim();
    return {
      name,
      seen,
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
      outlineColor: style.outlineColor,
      background,
    };
  });
}

function toHex(color: string): string {
  const parts = /rgba?\((\d+), (\d+), (\d+)/.exec(color);
  if (parts === null) throw new Error(`Couleur illisible : ${color}`);
  return `#${[1, 2, 3].map((index) => Number(parts[index]).toString(16).padStart(2, '0')).join('')}`;
}

/** Tab jusqu'à ce que le parcours boucle ou quitte la page ; contrôle le contour de focus de chaque arrêt. */
async function tabThrough(page: Page, max = 40): Promise<FocusInfo[]> {
  const stops: FocusInfo[] = [];
  for (let press = -1; press < max; press += 1) {
    // Un élément qui a déjà le focus (focus rendu par l'écran) est le premier arrêt.
    if (press >= 0) await page.keyboard.press('Tab');
    const info = await focusInfo(page);
    if (info === null) continue;
    if (info.seen) break;
    stops.push(info);
    expect(info.outlineStyle, `contour de « ${info.name} »`).not.toBe('none');
    expect(info.outlineWidth, `épaisseur du contour de « ${info.name} »`).toBeGreaterThanOrEqual(2);
    const ratio = contrast(toHex(info.outlineColor), toHex(info.background || 'rgb(11, 16, 38)'));
    expect(ratio, `contraste du contour de « ${info.name} »`).toBeGreaterThanOrEqual(3);
  }
  return stops;
}

const SUB_SCREENS = [
  { opener: 'Records', heading: 'Records' },
  { opener: 'Skins', heading: 'Skins' },
  { opener: 'Réglages', heading: 'Réglages' },
  { opener: 'Sauvegarde', heading: 'Sauvegarde' },
  { opener: 'Jouer', heading: 'Choisissez un mode' },
];

test('ct_92_parcours_clavier : langue, titres, ordre de tabulation, contour de focus et retour par Échap sur chaque écran du menu', async ({
  page,
}) => {
  const problems = watchProblems(page);
  await openGame(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page).toHaveTitle('Serpent Cosmique');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);

  // Menu : ordre logique, aucun piège, contour visible et contrasté sur chaque arrêt.
  await watchFocus(page);
  const stops = await tabThrough(page);
  const order = ['Jouer', 'Installer le jeu', 'Records', 'Skins', 'Réglages', 'Sauvegarde'];
  expect(stops.map((stop) => stop.name)).toEqual(order);
  // Maj+Tab remonte dans l'ordre inverse.
  await page.getByRole('button', { name: 'Sauvegarde', exact: true }).focus();
  const back: string[] = [];
  for (let press = 0; press < order.length - 1; press += 1) {
    await page.keyboard.press('Shift+Tab');
    back.push((await focusInfo(page))?.name ?? '');
  }
  expect(back).toEqual([...order].reverse().slice(1));

  for (const { opener, heading } of SUB_SCREENS) {
    const button = page.getByRole('button', { name: opener, exact: true });
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: heading, level: 1 }), opener).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 }), opener).toHaveCount(1);
    await watchFocus(page);
    await tabThrough(page);
    // Tout bouton visible et actif a reçu le focus au moins une fois (un seul arrêt par groupe de choix).
    const unreached = await page.evaluate(() => {
      const w = window as unknown as { __seen: WeakSet<Element> };
      return Array.from(document.querySelectorAll('button, input, a[href]'))
        .filter((element) => {
          const box = element.getBoundingClientRect();
          const control = element as HTMLButtonElement;
          return (
            box.width > 0 &&
            box.height > 0 &&
            !control.disabled &&
            control.tabIndex >= 0 &&
            !w.__seen.has(element)
          );
        })
        .map((element) => element.textContent?.trim() ?? element.tagName);
    });
    expect(unreached, `${heading} : éléments jamais atteints par Tab`).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(
      page.getByRole('heading', { name: 'Serpent Cosmique', level: 1 }),
      opener,
    ).toBeVisible();
    await expect(page.getByRole('button', { name: opener, exact: true }), opener).toBeFocused();
  }
  expect(problems).toEqual([]);
});

test('ct_92_parcours_clavier : réglages (flèches, Espace), liste des modes, pause et abandon au clavier', async ({
  page,
}) => {
  const problems = watchProblems(page);
  await openGame(page);
  await page.getByRole('button', { name: 'Réglages', exact: true }).focus();
  await page.keyboard.press('Enter');
  const swipe = page.getByRole('radio', { name: 'Glissement' });
  const arrows = page.getByRole('radio', { name: 'Flèches' });
  await swipe.focus();
  await expect(swipe).toBeChecked();
  await page.keyboard.press('ArrowRight');
  await expect(arrows).toBeChecked();
  await expect(arrows).toBeFocused();
  await expect(swipe).not.toBeChecked();
  const music = page.getByRole('switch', { name: 'Musique' });
  await music.focus();
  await expect(music).toBeChecked();
  await page.keyboard.press('Space');
  await expect(music).not.toBeChecked();
  await page.keyboard.press('Enter');
  await expect(music).toBeChecked();
  await page.keyboard.press('Escape');

  // Liste des modes : six modes jouables, le mode mystère reste focalisable et lu comme désactivé.
  await page.getByRole('button', { name: 'Jouer', exact: true }).focus();
  await page.keyboard.press('Enter');
  await watchFocus(page);
  const stops = await tabThrough(page);
  expect(stops.map((stop) => stop.name).filter((name) => /^Classique/.test(name))).toHaveLength(1);
  const mystery = page.getByRole('button', { name: /^Mode mystère/ });
  await expect(mystery).toHaveAttribute('aria-disabled', 'true');
  expect(stops.some((stop) => /^Mode mystère/.test(stop.name))).toBe(true);

  // Partie : pause, Reprendre, Abandonner, Non, Oui — tous trouvés par leur rôle et leur nom.
  await page.getByRole('button', { name: /^Classique/ }).focus();
  await page.keyboard.press('Enter');
  await runFor(page, 50);
  await skipCountdown(page);
  const pause = page.getByRole('button', { name: 'Pause', exact: true });
  await pause.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Reprendre' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Abandonner' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Non' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Oui' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Reprendre' })).toBeVisible();
  await page.getByRole('button', { name: 'Reprendre' }).focus();
  await page.keyboard.press('Enter');
  await expect(pause).toBeFocused();
  expect(problems).toEqual([]);
});

test('ct_92_parcours_clavier : champ « Votre nom » relié à son étiquette, Entrée valide ; erreur E-01 annoncée et reliée au bouton qui l’a provoquée', async ({
  page,
}) => {
  const problems = watchProblems(page);
  await seedStorage(page, {
    progress: progressWith((progress) => {
      progress.lastName = 'Coco';
    }),
    pending: { mode: 'classic', score: 11, candiesEaten: 11, dateTime: SEED_DATE },
  });
  await openGame(page);
  await page.getByRole('button', { name: 'Continuer' }).focus();
  await page.keyboard.press('Enter');
  const field = page.getByLabel('Votre nom');
  await expect(field).toBeVisible();
  await expect(field).toHaveValue('Coco');
  // Le champ est décrit par son aide, son rappel et son compteur (aria-describedby vers des éléments existants).
  const described = await field.evaluate((input) =>
    (input.getAttribute('aria-describedby') ?? '')
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent ?? ''),
  );
  expect(described).toHaveLength(3);
  expect(described.every((text) => text !== '')).toBe(true);
  await field.fill('Léa');
  await page.keyboard.press('Enter');
  await expect(page.locator('.name-saved')).toHaveText('Nom enregistré : Léa');
  await expect(page.getByRole('button', { name: 'Rejouer' })).toBeFocused();
  await page.getByRole('button', { name: 'Menu', exact: true }).focus();
  await page.keyboard.press('Enter');

  // E-01 : fichier qui n'est pas une sauvegarde.
  await page.getByRole('button', { name: 'Sauvegarde', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Sauvegarde', level: 1 })).toBeVisible();
  await chooseFile(page, { bytes: Buffer.from('ceci n’est pas une sauvegarde') });
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const alert = dialog.getByRole('alert');
  await expect(alert).toContainText('(E-01)');
  await expect(dialog).toHaveAccessibleDescription(/\(E-01\)/);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Restaurer une sauvegarde' })).toBeFocused();
  expect(problems).toEqual([]);
});

/** Éléments actifs visibles de la page : cible tactile (boîte) et nom, pour contrôler leur taille. */
async function targets(page: Page): Promise<{ name: string; width: number; height: number }[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('button, input, [role="radio"], [role="switch"]'))
      .map((element) => ({ element, box: element.getBoundingClientRect() }))
      .filter(({ box }) => box.width > 0 && box.height > 0)
      .map(({ element, box }) => ({
        name: (element.getAttribute('aria-label') ?? element.textContent ?? 'sans nom')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 40),
        width: box.width,
        height: box.height,
      })),
  );
}

/** Tailles de police calculées de tout le texte visible du DOM. */
async function fontSizes(page: Page): Promise<{ text: string; size: number }[]> {
  return page.evaluate(() => {
    const found: { text: string; size: number }[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
      const text = (node.textContent ?? '').trim();
      const parent = node.parentElement;
      if (text === '' || parent === null) continue;
      const box = parent.getBoundingClientRect();
      const style = getComputedStyle(parent);
      if (box.width === 0 || box.height === 0 || style.visibility === 'hidden') continue;
      if (parent.closest('[aria-hidden="true"], .sr-only') !== null) continue;
      found.push({ text: text.slice(0, 40), size: Number.parseFloat(style.fontSize) });
    }
    return found;
  });
}

async function openFrom(page: Page, opener: string, heading: string): Promise<void> {
  await page.getByRole('button', { name: opener, exact: true }).tap();
  await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
}

test('ct_88_zones_tactiles_clignotements : cibles de 9 mm au moins sur chaque écran hors partie, texte de 16 px au moins', async ({
  page,
}) => {
  const problems = watchProblems(page);
  await openGame(page);
  const screens: { opener: string; heading: string }[] = [
    { opener: 'Jouer', heading: 'Choisissez un mode' },
    { opener: 'Records', heading: 'Records' },
    { opener: 'Skins', heading: 'Skins' },
    { opener: 'Réglages', heading: 'Réglages' },
    { opener: 'Sauvegarde', heading: 'Sauvegarde' },
  ];
  const measured: string[] = [];
  const check = async (label: string): Promise<void> => {
    for (const target of await targets(page)) {
      measured.push(label);
      expect(target.height, `${label} : « ${target.name} » en hauteur`).toBeGreaterThanOrEqual(
        MIN_TARGET_PX - 0.5,
      );
      expect(target.width, `${label} : « ${target.name} » en largeur`).toBeGreaterThanOrEqual(
        MIN_TARGET_PX - 0.5,
      );
    }
    for (const item of await fontSizes(page)) {
      expect(item.size, `${label} : texte « ${item.text} »`).toBeGreaterThanOrEqual(16);
    }
  };
  await check('Menu');
  for (const { opener, heading } of screens) {
    await openFrom(page, opener, heading);
    await check(heading);
    await page.getByRole('button', { name: '‹ Retour' }).tap();
    await expect(page.getByRole('heading', { name: 'Serpent Cosmique', level: 1 })).toBeVisible();
  }
  await openFrom(page, 'Réglages', 'Réglages');
  await page.getByRole('button', { name: 'À propos' }).tap();
  await check('À propos');
  expect(measured.length).toBeGreaterThan(25);
  expect(problems).toEqual([]);
});

test('ct_88_zones_tactiles_clignotements : en partie, pause et flèches de 9 et 12 mm au moins, texte de 16 px au moins', async ({
  page,
}) => {
  await openGame(page, { seed: 1, control: 'arrows' });
  await startClassic(page);
  await runFor(page, 50);
  const pause = (await page.getByRole('button', { name: 'Pause', exact: true }).boundingBox())!;
  expect(Math.min(pause.width, pause.height)).toBeGreaterThanOrEqual(MIN_TARGET_PX - 0.5);
  for (const name of ['Haut', 'Bas', 'Gauche', 'Droite']) {
    const box = (await page.getByRole('button', { name, exact: true }).boundingBox())!;
    expect(box.width, name).toBeGreaterThanOrEqual(MIN_ARROW_PX - 0.5);
    expect(box.height, name).toBeGreaterThanOrEqual(MIN_ARROW_PX - 0.5);
  }
  for (const item of await fontSizes(page)) {
    expect(item.size, `partie : texte « ${item.text} »`).toBeGreaterThanOrEqual(16);
  }
  await skipCountdown(page);
  await page.getByRole('button', { name: 'Pause', exact: true }).tap();
  for (const name of ['Reprendre', 'Abandonner']) {
    const box = (await page.getByRole('button', { name }).boundingBox())!;
    expect(Math.min(box.width, box.height), name).toBeGreaterThanOrEqual(MIN_TARGET_PX - 0.5);
  }
  for (const item of await fontSizes(page)) {
    expect(item.size, `pause : texte « ${item.text} »`).toBeGreaterThanOrEqual(16);
  }
});

/** Couleur du pixel central de chaque case de la grille (288 valeurs, ligne par ligne). */
async function cellColors(page: Page): Promise<string[]> {
  return page.evaluate(
    ({ columns, rows }) => {
      const canvas = document.querySelector('canvas');
      const context = canvas?.getContext('2d');
      if (!canvas || !context) return [];
      const size = canvas.width / columns;
      const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const colors: string[] = [];
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < columns; col += 1) {
          const index =
            (Math.floor((row + 0.5) * size) * canvas.width + Math.floor((col + 0.5) * size)) * 4;
          colors.push(
            [0, 1, 2]
              .map((offset) => (data[index + offset] ?? 0).toString(16).padStart(2, '0'))
              .join(''),
          );
        }
      }
      return colors;
    },
    { columns: GRID.columns, rows: GRID.rows },
  );
}

test('ct_88_zones_tactiles_clignotements : pendant l’arc-en-ciel et le décompte, aucune zone ne change de couleur plus de 3 fois par seconde', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await openGame(page, { seed: 1, control: 'arrows' });
  await startClassic(page);

  // Décompte : couleur du texte, du fond et opacité du panneau, relevées toutes les 33 ms.
  const countdown = page.locator('.countdown');
  await expect(countdown).toBeVisible();
  const samples: string[] = [];
  for (let at = 0; at < 2900; at += 33) {
    samples.push(
      await countdown.evaluate((element) => {
        const style = getComputedStyle(element);
        return `${style.color}|${style.backgroundColor}|${style.opacity}`;
      }),
    );
    await runFor(page, 33);
  }
  expect(changesPerSecond(samples, 33)).toBeLessThanOrEqual(3);

  // Arc-en-ciel : au 10e bonbon, la couleur de la tête est relevée toutes les 33 ms pendant 5 s.
  await runFor(page, 100);
  const first = (await stepOnce(page, 1000 / 6)).head!;
  // Le moteur de recette rejoint la tête affichée (le jeu a déjà pu avancer d'un pas pendant le relevé).
  const oracle = createGame(CLASSIC, 1);
  for (let advanced = 0; advanced < 4; advanced += 1) {
    step(oracle);
    const head = oracle.snake[0] as Cell;
    if (head.col === first.col && head.row === first.row) break;
  }
  for (let eaten = 0; eaten < 10; eaten += 1) await eatOne(page, oracle);
  expect((await read(page)).head?.color).toBe('rainbow');
  const frames: string[][] = [];
  let lastHead = (await read(page)).head!;
  for (let at = 0; at < 5000; at += 33) {
    const head = (await read(page)).head;
    if (head === null) break;
    frames.push(await cellColors(page));
    if (head.col !== lastHead.col || head.row !== lastHead.row) {
      // Un pas a eu lieu : le moteur de recette le suit, puis choisit une direction qui évite la collision.
      lastHead = head;
      step(oracle);
      const at = oracle.snake[0] as Cell;
      expect(head, 'tête affichée et tête du moteur').toMatchObject({ col: at.col, row: at.row });
      const direction = safeDirection(oracle);
      if (direction !== null && sendCommand(oracle, direction)) {
        await page.getByRole('button', { name: ARROW_NAMES[direction], exact: true }).tap();
      }
    }
    await runFor(page, 33);
  }
  expect(frames.length).toBeGreaterThan(100);
  // Chaque case de la grille est une zone : sa couleur change au plus 3 fois par seconde (au passage du serpent).
  const cells = frames[0]!.length;
  expect(cells).toBe(GRID.columns * GRID.rows);
  let worst = 0;
  let worstCell = 0;
  for (let cell = 0; cell < cells; cell += 1) {
    const rate = changesPerSecond(
      frames.map((frame) => frame[cell] ?? ''),
      33,
    );
    if (rate > worst) {
      worst = rate;
      worstCell = cell;
    }
  }
  expect(worst, `case ${worstCell} : changements de couleur par seconde`).toBeLessThanOrEqual(3);
});

const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};
const DELTAS: Record<Direction, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

/** Direction qui évite le bord, le corps et les bonbons, vers la plus grande zone libre ; null si aucune. */
function safeDirection(game: Game): Direction | null {
  const key = (col: number, row: number): string => `${col},${row}`;
  const blocked = new Set<string>(game.snake.slice(0, -1).map((cell) => key(cell.col, cell.row)));
  for (const candy of game.candies) blocked.add(key(candy.cell.col, candy.cell.row));
  const head = game.snake[0] as Cell;
  let best: Direction | null = null;
  let bestArea = 0;
  for (const direction of ['up', 'down', 'left', 'right'] as Direction[]) {
    if (direction === OPPOSITE[game.direction]) continue;
    const [dx, dy] = DELTAS[direction];
    const start = key(head.col + dx, head.row + dy);
    const inside = (col: number, row: number): boolean =>
      col >= 1 && col <= GRID.columns && row >= 1 && row <= GRID.rows;
    if (!inside(head.col + dx, head.row + dy) || blocked.has(start)) continue;
    const seen = new Set<string>([start]);
    const queue: [number, number][] = [[head.col + dx, head.row + dy]];
    while (queue.length > 0) {
      const [col, row] = queue.pop() as [number, number];
      for (const [ex, ey] of Object.values(DELTAS)) {
        const next = key(col + ex, row + ey);
        if (inside(col + ex, row + ey) && !blocked.has(next) && !seen.has(next)) {
          seen.add(next);
          queue.push([col + ex, row + ey]);
        }
      }
    }
    if (seen.size > bestArea) {
      bestArea = seen.size;
      best = direction;
    }
  }
  return best;
}

/** Nombre moyen de changements par seconde sur la fenêtre la plus chargée d'une seconde. */
function changesPerSecond(values: string[], intervalMs: number): number {
  const window = Math.round(1000 / intervalMs);
  let worst = 0;
  for (let start = 0; start + window <= values.length; start += 1) {
    let changes = 0;
    for (let index = start + 1; index < start + window; index += 1) {
      if (values[index] !== values[index - 1]) changes += 1;
    }
    worst = Math.max(worst, changes);
  }
  return worst;
}

/** Mange un bonbon (le test pilote le navigateur par glissements, sur la grille du moteur de recette). */
async function eatOne(page: Page, game: Game): Promise<void> {
  const path = findPath(game, (cell, state) =>
    state.candies.some((candy) => candy.cell.col === cell.col && candy.cell.row === cell.row),
  );
  if (path === null) throw new Error('Aucun chemin vers le bonbon.');
  await driveWithArrows(page, game, path);
}

const ARROW_NAMES: Record<Direction, string> = {
  up: 'Haut',
  down: 'Bas',
  left: 'Gauche',
  right: 'Droite',
};

/** Joue un chemin avec les flèches seulement : aucun glissement. */
async function driveWithArrows(page: Page, game: Game, path: Direction[]): Promise<void> {
  for (const direction of path) {
    if (sendCommand(game, direction)) {
      await page.getByRole('button', { name: ARROW_NAMES[direction], exact: true }).tap();
    }
    step(game);
    const reading = await stepOnce(page, 1000 / speedOf(game));
    const head = game.snake[0] as Cell;
    expect(reading.head).toMatchObject({ col: head.col, row: head.row });
  }
}

test('ct_88_zones_tactiles_clignotements : une partie complète se joue aux flèches, sans aucun glissement', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await openGame(page, { seed: 1, control: 'arrows' });
  await startClassic(page);
  await runFor(page, 50);
  await skipCountdown(page);
  await stepOnce(page, 1000 / 6);
  const oracle = createGame(CLASSIC, 1);
  step(oracle);
  for (let eaten = 0; eaten < 3; eaten += 1) await eatOne(page, oracle);
  await expect(page.getByText('Score').first()).toBeVisible();
  // Puis le serpent file droit vers le bord : la partie se termine par une collision.
  await waitForEndScreen(page);
  await expect(page.locator('.end-reason')).toHaveText('Collision');
  await expect(page.locator('.end-score')).toContainText('3');
});

const SMALL_SCREEN_SCREENS: { opener: string; heading: string }[] = [
  { opener: 'Jouer', heading: 'Choisissez un mode' },
  { opener: 'Records', heading: 'Records' },
  { opener: 'Skins', heading: 'Skins' },
  { opener: 'Réglages', heading: 'Réglages' },
  { opener: 'Sauvegarde', heading: 'Sauvegarde' },
];

/** Chaque bouton est atteignable par défilement, entièrement dans l'écran, et son texte n'est pas coupé. */
async function expectEverythingReachable(page: Page, label: string): Promise<void> {
  const viewport = page.viewportSize()!;
  const controls = page.locator('button:visible, input:visible');
  const count = await controls.count();
  expect(count, label).toBeGreaterThan(0);
  for (let index = 0; index < count; index += 1) {
    const control = controls.nth(index);
    await control.scrollIntoViewIfNeeded();
    const box = (await control.boundingBox())!;
    const name = ((await control.textContent()) ?? '').trim().slice(0, 30);
    expect(box.x, `${label} : « ${name} » à gauche`).toBeGreaterThanOrEqual(-0.5);
    expect(box.x + box.width, `${label} : « ${name} » à droite`).toBeLessThanOrEqual(
      viewport.width + 0.5,
    );
    if (box.height <= viewport.height) {
      expect(box.y, `${label} : « ${name} » en haut`).toBeGreaterThanOrEqual(-0.5);
      expect(box.y + box.height, `${label} : « ${name} » en bas`).toBeLessThanOrEqual(
        viewport.height + 0.5,
      );
    } else {
      // Plus haut que l'écran (texte agrandi) : on doit pouvoir amener chacun de ses bords dans l'écran.
      await control.evaluate((element) => element.scrollIntoView({ block: 'start' }));
      expect(
        (await control.boundingBox())!.y,
        `${label} : « ${name} » bord haut`,
      ).toBeGreaterThanOrEqual(-0.5);
      await control.evaluate((element) => element.scrollIntoView({ block: 'end' }));
      const end = (await control.boundingBox())!;
      expect(end.y + end.height, `${label} : « ${name} » bord bas`).toBeLessThanOrEqual(
        viewport.height + 0.5,
      );
    }
    // Texte complet : rien n'est coupé dans le bouton (ni tronqué par des points de suspension).
    const clipped = await control.evaluate((element) => {
      const style = getComputedStyle(element);
      return (
        style.textOverflow === 'ellipsis' ||
        (style.overflow !== 'visible' && element.scrollWidth > element.clientWidth + 1)
      );
    });
    expect(clipped, `${label} : « ${name} » coupé`).toBe(false);
  }
  // La page elle-même ne déborde pas à l'horizontale.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow, `${label} : débordement horizontal`).toBeLessThanOrEqual(1);
}

test.describe('ct_111_defilement_et_zoom', () => {
  for (const zoom of ['100 %', '200 %']) {
    test(`écrans hors partie à une taille de texte de ${zoom} : tout est atteignable par défilement, rien n’est coupé`, async ({
      page,
    }) => {
      const problems = watchProblems(page);
      await openGame(page);
      if (zoom === '200 %') {
        await page.evaluate(() => {
          document.documentElement.style.fontSize = '200%';
        });
      }
      await expectEverythingReachable(page, `Menu à ${zoom}`);
      for (const { opener, heading } of SMALL_SCREEN_SCREENS) {
        await openFrom(page, opener, heading);
        await expectEverythingReachable(page, `${heading} à ${zoom}`);
        await page.getByRole('button', { name: '‹ Retour' }).tap();
      }
      await openFrom(page, 'Réglages', 'Réglages');
      await page.getByRole('button', { name: 'À propos' }).tap();
      await expectEverythingReachable(page, `À propos à ${zoom}`);
      expect(problems).toEqual([]);
    });
  }

  test('la liste des modes se fait défiler et laisse voir une ligne entamée (indice de défilement)', async ({
    page,
  }) => {
    await openGame(page);
    await openFrom(page, 'Jouer', 'Choisissez un mode');
    // La liste dépasse l'écran : la page défile verticalement.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollHeight - window.innerHeight,
    );
    expect(overflow).toBeGreaterThan(0);
    await page.mouse.wheel(0, 120);
    const viewportHeight = page.viewportSize()!.height;
    const rows = await page
      .getByRole('button', {
        name: /^(Classique|Contre la montre|Champ|Trou noir|Bonus|Zen|Mode mystère)/,
      })
      .evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect()));
    expect(
      rows.some((box) => box.top < viewportHeight - 4 && box.bottom > viewportHeight + 4),
      'une ligne de la liste est entamée par le bas de l’écran',
    ).toBe(true);
  });

  test('écran de fin à une taille de texte de 200 % : champ, « Valider » et boutons atteignables, rien n’est coupé', async ({
    page,
  }) => {
    await seedStorage(page, {
      progress: progressWith((progress) => {
        progress.lastName = 'Coco';
      }),
      pending: { mode: 'classic', score: 11, candiesEaten: 11, dateTime: SEED_DATE },
    });
    await openGame(page);
    await page.getByRole('button', { name: 'Continuer' }).tap();
    await expect(page.getByLabel('Votre nom')).toBeVisible();
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    await expectEverythingReachable(page, 'Écran de fin à 200 %');
  });

  test('écran de fin avec le clavier du téléphone simulé (hauteur réduite à 180 px) : champ « Votre nom » et « Valider » restent visibles', async ({
    page,
  }) => {
    await seedStorage(page, {
      progress: progressWith((progress) => {
        progress.lastName = 'Coco';
      }),
      pending: { mode: 'classic', score: 11, candiesEaten: 11, dateTime: SEED_DATE },
    });
    await openGame(page);
    await page.getByRole('button', { name: 'Continuer' }).tap();
    await expect(page.getByLabel('Votre nom')).toBeVisible();
    await page.setViewportSize({ width: page.viewportSize()!.width, height: 180 });
    await page.getByLabel('Votre nom').focus();
    await expect(page.getByLabel('Votre nom')).toBeInViewport({ ratio: 1 });
    // Résultat attendu de 07 : « Valider » est visible en même temps que le champ, sans défilement.
    await expect(page.getByRole('button', { name: 'Valider' })).toBeInViewport({ ratio: 1 });
    // Le reste de l'écran reste atteignable par défilement.
    for (const name of ['Valider', 'Rejouer', 'Menu']) {
      const button = page.getByRole('button', { name, exact: true });
      await button.scrollIntoViewIfNeeded();
      await expect(button).toBeInViewport({ ratio: 1 });
    }
  });
  test('écran de fin avec le clavier simulé : « Valider » est visible en même temps que le champ (HYP-36)', async ({
    page,
  }) => {
    await seedStorage(page, {
      progress: progressWith((progress) => {
        progress.lastName = 'Coco';
      }),
      pending: { mode: 'classic', score: 11, candiesEaten: 11, dateTime: SEED_DATE },
    });
    await openGame(page);
    await page.getByRole('button', { name: 'Continuer' }).tap();
    await page.setViewportSize({ width: page.viewportSize()!.width, height: 180 });
    await page.getByLabel('Votre nom').focus();
    await expect(page.getByLabel('Votre nom')).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole('button', { name: 'Valider' })).toBeInViewport({
      ratio: 1,
      timeout: 1000,
    });
  });
});

/** Valeurs de la charte de couleurs (texte, fonds, bordures, focus, erreur). */
const CHARTER = new Set([
  '#0b1026',
  '#1b2250',
  '#f5f7ff',
  '#b8c0e8',
  '#ffd84d',
  '#7c8ae6',
  '#ffffff',
  '#ffa3a3',
]);

interface Painted {
  text: string;
  color: string;
  background: string;
  border: string;
  large: boolean;
}

/** Couleur de chaque texte visible, du fond sur lequel il est posé et de la bordure de son contrôle. */
async function paintedTexts(page: Page): Promise<Painted[]> {
  return page.evaluate(() => {
    const found: Painted[] = [];
    const toHex = (color: string): string => {
      const parts = /rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)/.exec(color);
      if (parts === null) return color;
      if (parts[4] !== undefined && Number(parts[4]) === 0) return 'transparent';
      return `#${[1, 2, 3].map((index) => Number(parts[index]).toString(16).padStart(2, '0')).join('')}`;
    };
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
      const text = (node.textContent ?? '').trim();
      const parent = node.parentElement;
      if (text === '' || parent === null) continue;
      const box = parent.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      if (parent.closest('[aria-hidden="true"], .sr-only, canvas') !== null) continue;
      const style = getComputedStyle(parent);
      let background = 'transparent';
      let border = '';
      for (let up: Element | null = parent; up !== null; up = up.parentElement) {
        const current = getComputedStyle(up);
        if (border === '' && up.tagName === 'BUTTON') border = toHex(current.borderTopColor);
        const color = toHex(current.backgroundColor);
        if (color !== 'transparent') {
          background = color;
          break;
        }
      }
      const size = Number.parseFloat(style.fontSize);
      const bold = Number(style.fontWeight) >= 700;
      found.push({
        text: text.slice(0, 40),
        color: toHex(style.color),
        background: background === 'transparent' ? '#0b1026' : background,
        border,
        large: size >= 24 || (bold && size >= 18.66),
      });
    }
    return found;
  });
}

test('ct_107_contrastes_charte : sur chaque écran, textes à 4,5:1 (3:1 si grands), bordures à 3:1, couleurs issues de la charte', async ({
  page,
}) => {
  const problems = watchProblems(page);
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'vibrate', { value: undefined, configurable: true });
  });
  await seedStorage(page, {
    progress: progressWith((progress) => {
      progress.records.classic = [{ name: 'Coco', score: 12, dateTime: SEED_DATE }];
    }),
  });
  await openGame(page);
  const seen = new Map<string, Painted[]>();
  const take = async (label: string): Promise<void> => {
    seen.set(label, await paintedTexts(page));
  };
  await take('Menu');
  for (const { opener, heading } of SMALL_SCREEN_SCREENS) {
    await openFrom(page, opener, heading);
    await take(heading);
    if (heading === 'Réglages') {
      await page.getByRole('button', { name: 'À propos' }).tap();
      await take('À propos');
      await page.getByRole('button', { name: '‹ Retour' }).tap();
    }
    await page.getByRole('button', { name: '‹ Retour' }).tap();
  }
  await page.getByRole('button', { name: 'Installer le jeu' }).tap();
  await take('Installer le jeu');
  await page.getByRole('button', { name: '‹ Retour' }).tap();
  await startClassic(page);
  await runFor(page, 50);
  await take('Compte à rebours');
  await skipCountdown(page);
  await page.getByRole('button', { name: 'Pause', exact: true }).tap();
  await take('Pause');
  expect(seen.size).toBeGreaterThanOrEqual(10);

  let count = 0;
  for (const [screen, items] of seen) {
    for (const item of items) {
      count += 1;
      const where = `${screen} : « ${item.text} » (${item.color} sur ${item.background})`;
      expect(CHARTER.has(item.color), `${where} : couleur hors charte`).toBe(true);
      expect(CHARTER.has(item.background), `${where} : fond hors charte`).toBe(true);
      expect(contrast(item.color, item.background), where).toBeGreaterThanOrEqual(
        item.large ? 3 : 4.5,
      );
      if (item.border !== '' && item.border !== item.background) {
        expect(CHARTER.has(item.border), `${where} : bordure hors charte`).toBe(true);
        expect(contrast(item.border, item.background), `${where} : bordure`).toBeGreaterThanOrEqual(
          3,
        );
      }
    }
  }
  expect(count).toBeGreaterThan(100);
  // Texte désactivé : « Non disponible sur ce téléphone » garde 4,5:1.
  const disabled = (seen.get('Réglages') ?? []).find((item) => /Non disponible/.test(item.text));
  expect(disabled, 'texte désactivé des vibrations').toBeDefined();
  expect(contrast(disabled!.color, disabled!.background)).toBeGreaterThanOrEqual(4.5);
  expect(problems).toEqual([]);
});
