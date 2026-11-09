import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { move, wrapCell } from '../../src/core/board.ts';
import { createGame, sendCommand, speedOf, step } from '../../src/core/engine.ts';
import { CLASSIC } from '../../src/core/modes/classic.ts';
import { ZEN_MODE } from '../../src/core/modes/zen.ts';
import { DIRECTIONS, GRID, LAYOUT, PX_PER_MM } from '../../src/core/rules.ts';
import type { Cell, Direction, Game } from '../../src/core/types.ts';
import { eatCandies, pathToOwnBody } from '../support/pilote.ts';
import {
  drive,
  eatNextCandy,
  gridCenter,
  openGame,
  read,
  runFor,
  seriousViolations,
  skipCountdown,
  startClassic,
  startModeRunning,
  stepOnce,
  swipe,
  swipeFrom,
  touch,
} from './support/jeu.ts';

/** Millimètres réels par pixel CSS de chaque profil (07 § 1.2). */
const MM_PER_PX: Record<string, number> = { 'Android paysage': 0.18, 'iPhone SE paysage': 0.156 };

const STEP_MS = 1000 / 6;

/** Joue une partie jusqu'au premier pas, serpent à droite en colonne 7. */
async function startRunning(
  page: Page,
  options: { seed?: number; control?: 'swipe' | 'arrows' } = {},
) {
  await openGame(page, { seed: options.seed ?? 1, control: options.control });
  await startClassic(page);
  await runFor(page, 50);
  await skipCountdown(page);
  await stepOnce(page, STEP_MS);
}

/** Moteur de recette synchronisé avec le navigateur après `startRunning` (un premier pas fait). */
function oracleAfterFirstStep(seed = 1): Game {
  const oracle = createGame(CLASSIC, seed);
  step(oracle);
  return oracle;
}

async function pressPause(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Pause', exact: true }).tap();
}

async function waitForEndScreen(page: Page): Promise<number> {
  for (let frame = 0; frame < 200; frame += 1) {
    if ((await page.locator('.end').count()) > 0) return page.evaluate(() => performance.now());
    await runFor(page, 16);
  }
  throw new Error('L’écran de fin ne s’affiche pas.');
}

test('ct_01_menu_deux_touchers : du menu au compte à rebours en exactement 2 touchers', async ({
  page,
}) => {
  await openGame(page, { seed: 1 });
  // Dans le navigateur (jeu non installé), le bandeau d'installation de E1 ajoute « Installer le jeu » (05 § 4.1).
  await expect(page.getByRole('button')).toHaveText([
    'Jouer',
    'Installer le jeu',
    'Records',
    'Skins',
    'Réglages',
    'Sauvegarde',
  ]);
  await page.getByRole('button', { name: 'Jouer' }).tap();
  await expect(page.getByRole('heading', { name: 'Choisissez un mode' })).toBeVisible();
  await page.getByRole('button', { name: 'Classique' }).tap();
  await runFor(page, 50);
  await expect(page.locator('.countdown-number')).toHaveText('3');
});

test('ct_02_liste_modes_regles : Classique et sa règle en deux phrases au plus', async ({
  page,
}) => {
  await openGame(page);
  await page.getByRole('button', { name: 'Jouer' }).tap();
  const mode = page.getByRole('button', { name: /Classique/ });
  await expect(mode.locator('.mode-name')).toHaveText('Classique');
  const rule = (await mode.locator('.mode-rule').textContent()) ?? '';
  expect(rule).toBe(
    'Mangez les bonbons pour grandir. Le serpent accélère peu à peu : ne touchez ni les bords ni votre queue.',
  );
  expect(rule.length).toBeLessThanOrEqual(200);
  expect(rule.split(/[.!?]\s/).length).toBeLessThanOrEqual(2);
  await page.getByRole('button', { name: '‹ Retour' }).tap();
  await expect(page.getByRole('button', { name: 'Jouer' })).toBeFocused();
});

test('ct_04_depart_et_pas : serpent rose de 4 cases, compte à rebours de 3 s, pas réguliers', async ({
  page,
}) => {
  await openGame(page, { seed: 1 });
  await startClassic(page);
  await runFor(page, 50);
  const oracle = createGame(CLASSIC, 1);

  const start = await read(page);
  expect(start.snake.map(({ col, row }) => [col, row])).toEqual(
    expect.arrayContaining([
      [6, 6],
      [5, 6],
      [4, 6],
      [3, 6],
    ]),
  );
  expect(start.snake).toHaveLength(4);
  expect(start.head).toMatchObject({ col: 6, row: 6, direction: 'right', color: 'pink' });
  expect(start.snake.every((part) => part.color === 'pink')).toBe(true);
  const candy = oracle.candies[0]!;
  expect(start.candies).toHaveLength(1);
  expect(start.candies[0]).toMatchObject({ col: candy.cell.col, row: candy.cell.row });

  await expect(page.locator('.countdown-hint')).toHaveText(
    'Glissez le doigt pour diriger le serpent',
  );
  await expect(page.locator('.hud-score')).toHaveText('Score 0');
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await runFor(page, 1000);
  await expect(page.locator('.countdown-number')).toHaveText('2');
  await runFor(page, 1000);
  await expect(page.locator('.countdown-number')).toHaveText('1');
  await runFor(page, 1000);
  await expect(page.locator('.countdown')).toBeHidden();
  expect((await read(page)).head).toMatchObject({ col: 6, row: 6 });

  for (const column of [7, 8, 9]) {
    expect((await stepOnce(page, STEP_MS)).head).toMatchObject({
      col: column,
      row: 6,
      color: 'pink',
    });
  }
});

test('ct_04_depart_et_pas : en « Flèches », le rappel parle des flèches', async ({ page }) => {
  await openGame(page, { seed: 1, control: 'arrows' });
  await startClassic(page);
  await runFor(page, 50);
  await expect(page.locator('.countdown-hint')).toHaveText(
    'Utilisez les flèches pour diriger le serpent',
  );
});

test('ct_05_croissance_et_score : un bonbon mangé fait grandir le serpent de 7 à 8 cases', async ({
  page,
}) => {
  await startRunning(page);
  const oracle = oracleAfterFirstStep();
  expect((await read(page)).head).toMatchObject({ col: 7, row: 6 });
  for (let eaten = 1; eaten <= 4; eaten += 1) {
    await eatNextCandy(page, oracle);
    const reading = await read(page);
    expect(reading.snake).toHaveLength(4 + eaten);
    await expect(page.locator('.hud-score')).toHaveText(`Score ${eaten}`);
    expect(reading.candies).toHaveLength(1);
  }
});

test('ct_06_collision_bord_fin_1s : collision contre le bord droit, écran de fin 1 s après', async ({
  page,
}) => {
  await startRunning(page);
  let head = (await read(page)).head!;
  while (head.col < GRID.columns) head = (await stepOnce(page, STEP_MS)).head!;
  const lastMove = await page.evaluate(() => performance.now());
  const frozen = await read(page);

  const endedAt = await waitForEndScreen(page);
  // La collision a lieu un pas après le dernier déplacement ; l'écran de fin 1 s (± 0,2 s) après.
  const delay = endedAt - lastMove - STEP_MS;
  expect(delay).toBeGreaterThan(800 - FRAME);
  expect(delay).toBeLessThan(1200 + FRAME);
  await expect(page.getByRole('heading', { name: 'Classique' })).toBeVisible();
  await expect(page.locator('.end-reason')).toHaveText('Collision');
  await expect(page.locator('.end-score')).toHaveText('Score 0');
  expect(frozen.head).toMatchObject({ col: GRID.columns, row: 6 });
});

const FRAME = 16;

test('ct_07_case_de_la_queue : une boucle de 4 cases ne provoque aucune collision', async ({
  page,
}) => {
  await openGame(page, { seed: 1 });
  await startClassic(page);
  await runFor(page, 50);
  await skipCountdown(page);
  const oracle = createGame(CLASSIC, 1);
  const loop = [
    'up',
    'left',
    'down',
    'right',
    'up',
    'left',
    'down',
    'right',
    'up',
    'left',
    'down',
  ] as const;
  await drive(page, oracle, [...loop]);
  expect(oracle.end).toBeNull();
  expect((await read(page)).snake).toHaveLength(4);
  await expect(page.locator('.end')).toHaveCount(0);
});

test('ct_10_orientation : le message seul en vertical, pause, retour à l’horizontale', async ({
  page,
}) => {
  await startRunning(page);
  const before = (await read(page)).head!;
  await page.setViewportSize({ width: 360, height: 780 });
  await expect(page.getByText("Tournez votre téléphone à l'horizontale")).toBeVisible();
  await expect(page.locator('#app')).toBeHidden();
  await runFor(page, 2000);
  await page.setViewportSize({ width: 780, height: 360 });
  await expect(page.locator('.rotate-notice')).toBeHidden();
  await expect(page.getByRole('dialog', { name: 'Pause' })).toBeVisible();
  await expect(page.getByText('Partie mise en pause')).toBeVisible();
  await runFor(page, 2000);
  expect((await read(page)).head).toMatchObject({ col: before.col, row: before.row });
});

test('ct_10_orientation : en paysage retourné, l’affichage reste horizontal et « haut » monte', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Émulation de l’orientation par le protocole de Chromium.');
  await startRunning(page);
  const client = await page.context().newCDPSession(page);
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: page.viewportSize()!.width,
    height: page.viewportSize()!.height,
    deviceScaleFactor: 2,
    mobile: true,
    screenOrientation: { type: 'landscapeSecondary', angle: 180 },
  });
  expect(await page.evaluate(() => matchMedia('(orientation: landscape)').matches)).toBe(true);
  await expect(page.locator('.rotate-notice')).toBeHidden();
  await swipe(page, 'up');
  const moved = await stepOnce(page, STEP_MS);
  expect(moved.head).toMatchObject({ col: 7, row: 5, direction: 'up' });
});

test('ct_11_glissement : 1 cm vers le haut, commande prise avant la levée du doigt, une par contact', async ({
  page,
}) => {
  await startRunning(page);
  const center = await gridCenter(page);
  const move = (dx: number, dy: number) => ({ x: center.x + dx, y: center.y + dy });
  await touch(page, 'touchStart', move(0, 0));
  await touch(page, 'touchMove', move(0, -10 * PX_PER_MM));
  expect((await stepOnce(page, STEP_MS)).head).toMatchObject({ col: 7, row: 5, direction: 'up' });
  // Le même contact continue vers la gauche : aucune seconde commande.
  await touch(page, 'touchMove', move(-80, -10 * PX_PER_MM));
  await touch(page, 'touchMove', move(-160, -10 * PX_PER_MM));
  expect((await stepOnce(page, STEP_MS)).head).toMatchObject({ col: 7, row: 4, direction: 'up' });
  await touch(page, 'touchEnd', null);
  // Un nouveau contact, loin de la grille, donne une nouvelle commande.
  await swipeFrom(page, { x: 20, y: 20 }, [-1, 0], 10);
  expect((await stepOnce(page, STEP_MS)).head).toMatchObject({ col: 6, row: 4, direction: 'left' });
});

test('ct_12_toucher_bref_et_diagonale : toucher bref et 4 mm ignorés, diagonale = axe dominant', async ({
  page,
}) => {
  await startRunning(page);
  await swipe(page, 'down');
  expect((await stepOnce(page, STEP_MS)).head).toMatchObject({ col: 7, row: 7, direction: 'down' });
  const center = await gridCenter(page);
  await page.touchscreen.tap(center.x, center.y);
  await swipeFrom(page, center, [-1, 0], 4);
  expect((await stepOnce(page, STEP_MS)).head).toMatchObject({ col: 7, row: 8, direction: 'down' });
  // 8 mm à droite, 4 mm vers le haut : « droite ».
  await swipeFrom(page, center, [2, -1], 4);
  expect((await stepOnce(page, STEP_MS)).head).toMatchObject({
    col: 8,
    row: 8,
    direction: 'right',
  });
  await expect(page.locator('.arrow')).toHaveCount(0);
});

test('ct_13_fleches : taille, position et retour visuel', async ({ page }, testInfo) => {
  await startRunning(page, { control: 'arrows' });
  const canvas = (await page.locator('canvas').boundingBox())!;
  for (const name of ['Haut', 'Bas', 'Gauche', 'Droite']) {
    const box = (await page.getByRole('button', { name, exact: true }).boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(12 * PX_PER_MM - 0.5);
    expect(box.height).toBeGreaterThanOrEqual(12 * PX_PER_MM - 0.5);
    const overlapX = box.x < canvas.x + canvas.width && box.x + box.width > canvas.x;
    const overlapY = box.y < canvas.y + canvas.height && box.y + box.height > canvas.y;
    expect(overlapX && overlapY, `la flèche ${name} recouvre la grille`).toBe(false);
  }
  expect(testInfo.project.name in MM_PER_PX).toBe(true);
  // 05 § 6 : texte de 16 px au moins (majuscules de 1,8 mm sur le S22).
  for (const label of await page.locator('.arrow-label').all()) {
    const size = await label.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).fontSize),
    );
    expect(size).toBeGreaterThanOrEqual(16);
  }

  const up = page.getByRole('button', { name: 'Haut', exact: true });
  await up.tap();
  await expect(up).toHaveClass(/is-pressed/);
  expect((await stepOnce(page, STEP_MS)).head).toMatchObject({ col: 7, row: 5, direction: 'up' });
  const left = page.getByRole('button', { name: 'Gauche', exact: true });
  await left.tap();
  await expect(left).toHaveClass(/is-pressed/);
  expect((await stepOnce(page, STEP_MS)).head).toMatchObject({ col: 6, row: 5, direction: 'left' });
  await runFor(page, 200);
  await expect(left).not.toHaveClass(/is-pressed/);
});

test('ct_14_fleches_ignore_glissement : en « Flèches », les glissements ne changent rien', async ({
  page,
}) => {
  await startRunning(page, { control: 'arrows' });
  for (const direction of ['up', 'down', 'left', 'right'] as const)
    await swipe(page, direction, 20);
  for (const column of [8, 9, 10, 11, 12]) {
    expect((await stepOnce(page, STEP_MS)).head).toMatchObject({
      col: column,
      row: 6,
      direction: 'right',
    });
  }
});

test('ct_15_file_de_commandes : deux commandes dans l’ordre, la troisième ignorée', async ({
  page,
}) => {
  await startRunning(page);
  await swipe(page, 'up');
  await swipe(page, 'left');
  await swipe(page, 'down');
  expect((await stepOnce(page, STEP_MS)).head).toMatchObject({ col: 7, row: 5, direction: 'up' });
  expect((await stepOnce(page, STEP_MS)).head).toMatchObject({ col: 6, row: 5, direction: 'left' });
  expect((await stepOnce(page, STEP_MS)).head).toMatchObject({ col: 5, row: 5, direction: 'left' });
});

test('ct_16_demi_tour_ignore : demi-tour et répétition ignorés', async ({ page }) => {
  await startRunning(page);
  await swipe(page, 'left');
  expect((await stepOnce(page, STEP_MS)).head).toMatchObject({
    col: 8,
    row: 6,
    direction: 'right',
  });
  await swipe(page, 'right');
  await swipe(page, 'right');
  await swipe(page, 'right');
  await swipe(page, 'up');
  await swipe(page, 'left');
  await swipe(page, 'down');
  expect((await stepOnce(page, STEP_MS)).head).toMatchObject({ col: 8, row: 5, direction: 'up' });
  expect((await stepOnce(page, STEP_MS)).head).toMatchObject({ col: 7, row: 5, direction: 'left' });
});

test('ct_17_commande_pendant_decompte : prise au premier pas ; perdue si la pause survient avant le pas', async ({
  page,
}) => {
  await openGame(page, { seed: 1 });
  await startClassic(page);
  await runFor(page, 50);
  await swipe(page, 'up');
  await skipCountdown(page);
  expect((await stepOnce(page, STEP_MS)).head).toMatchObject({ col: 6, row: 5, direction: 'up' });

  await swipe(page, 'left');
  await pressPause(page);
  await runFor(page, 2000);
  await swipe(page, 'right');
  await page.getByRole('button', { name: 'Reprendre' }).tap();
  await expect(page.locator('.countdown-hint')).toHaveText('Reprise de la partie');
  await skipCountdown(page);
  expect((await stepOnce(page, STEP_MS)).head).toMatchObject({ col: 6, row: 4, direction: 'up' });
});

test('ct_19_couleur_du_serpent : le serpent prend la couleur du dernier bonbon', async ({
  page,
}) => {
  await startRunning(page);
  const oracle = oracleAfterFirstStep();
  const colors = new Set<string>();
  for (let eaten = 1; eaten <= 5; eaten += 1) {
    await eatNextCandy(page, oracle);
    const reading = await read(page);
    expect(reading.head!.color).toBe(oracle.color);
    expect(reading.snake.every((part) => part.color === oracle.color)).toBe(true);
    colors.add(oracle.color);
  }
  expect(colors.size).toBeGreaterThan(1);
});

test('ct_20_arc_en_ciel : arc-en-ciel au 10e bonbon, couleur du bonbon au 11e', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await startRunning(page);
  const oracle = oracleAfterFirstStep();
  for (let eaten = 1; eaten <= 10; eaten += 1) await eatNextCandy(page, oracle);
  const rainbow = await read(page);
  expect(oracle.color).toBe('rainbow');
  expect(rainbow.head!.color).toBe('rainbow');
  expect(rainbow.snake).toHaveLength(14);
  expect(new Set(rainbow.snake.map((part) => part.color)).size).toBe(1);
  await eatNextCandy(page, oracle);
  const after = await read(page);
  expect(oracle.color).not.toBe('rainbow');
  expect(after.head!.color).toBe(oracle.color);
});

test('ct_23_classique_collision_queue : 11 bonbons puis la queue, écran de fin', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const requests: string[] = [];
  const errors: string[] = [];
  await page.addInitScript(() => {
    const violations: string[] = [];
    Object.defineProperty(window, '__violations', { value: violations });
    document.addEventListener('securitypolicyviolation', (event) => {
      violations.push(`${event.violatedDirective} ${event.blockedURI}`);
    });
  });
  page.on('request', (request) => requests.push(request.url()));
  page.on('pageerror', (error) => errors.push(error.message));
  await startRunning(page);
  const oracle = oracleAfterFirstStep();
  for (let eaten = 1; eaten <= 11; eaten += 1) await eatNextCandy(page, oracle);
  await expect(page.locator('.hud-score')).toHaveText('Score 11');
  const path = pathToOwnBody(oracle)!;
  expect(path).not.toBeNull();
  await drive(page, oracle, path.slice(0, -1));
  for (const direction of path.slice(-1)) await swipe(page, direction);
  await waitForEndScreen(page);
  await expect(page.getByRole('heading', { name: 'Classique' })).toBeVisible();
  await expect(page.locator('.end-reason')).toHaveText('Collision');
  await expect(page.locator('.end-score')).toHaveText('Score 11');
  await expect(page.getByRole('button', { name: 'Rejouer' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
  // CT-70 : le jeu n'émet aucune requête une fois chargé.
  const origin = new URL(page.url()).origin;
  expect(requests.filter((url) => !url.startsWith(`${origin}/`))).toEqual([]);
  expect(requests.filter((url) => url.includes('.json') || url.includes('api'))).toEqual([]);
  expect(errors).toEqual([]);
  // CT-72 : aucune violation de la politique de sécurité du contenu pendant toute la partie.
  expect(
    await page.evaluate(() => (window as unknown as { __violations: string[] }).__violations),
  ).toEqual([]);
});

/** Première graine dont le premier bonbon mangé n'est pas rose (le serpent change de couleur). */
function seedWithNonPinkFirstCandy(): number {
  for (let seed = 1; seed < 200; seed += 1) {
    const oracle = createGame(CLASSIC, seed);
    step(oracle);
    eatCandies(oracle, 1);
    if (oracle.color !== 'pink' && oracle.end === null) return seed;
  }
  throw new Error('Aucune graine ne donne un premier bonbon d’une autre couleur que le rose.');
}

async function abandonGame(page: Page): Promise<void> {
  await pressPause(page);
  await page.getByRole('button', { name: 'Abandonner' }).tap();
  await page.getByRole('button', { name: 'Oui' }).tap();
}

test('ct_35_ecran_de_fin : « Rejouer » repart d’un serpent rose de 4 cases et de 0 point, « Menu » revient au menu', async ({
  page,
}) => {
  const seed = seedWithNonPinkFirstCandy();
  await startRunning(page, { seed });
  const oracle = oracleAfterFirstStep(seed);
  await eatNextCandy(page, oracle);
  // EF-16 CA-2 : la partie se termine avec un serpent qui n'est plus rose.
  expect(oracle.color).not.toBe('pink');
  const colored = await read(page);
  expect(colored.head!.color).toBe(oracle.color);
  await expect(page.locator('.hud-score')).toHaveText('Score 1');
  await abandonGame(page);
  await expect(page.locator('.end-reason')).toHaveText('Partie abandonnée');
  await page.getByRole('button', { name: 'Rejouer' }).tap();
  await runFor(page, 50);
  await expect(page.locator('.hud-score')).toHaveText('Score 0');
  const restarted = await read(page);
  expect(restarted.head).toMatchObject({ col: 6, row: 6, color: 'pink' });
  expect(restarted.snake).toHaveLength(4);
  expect(restarted.snake.every((part) => part.color === 'pink')).toBe(true);
  await abandonGame(page);
  await page.getByRole('button', { name: 'Menu' }).tap();
  await expect(page.getByRole('button', { name: 'Jouer' })).toBeVisible();
});

test('ct_04_score : le score n’est réécrit dans la page que lorsqu’il change', async ({ page }) => {
  await startRunning(page);
  const oracle = oracleAfterFirstStep();
  await page.evaluate(() => {
    const state = window as unknown as { __scoreWrites: number };
    state.__scoreWrites = 0;
    const score = document.querySelector('.hud-score');
    if (score === null) throw new Error('Score introuvable.');
    new MutationObserver((records) => {
      state.__scoreWrites += records.length;
    }).observe(score, { childList: true, characterData: true, subtree: true });
  });
  const writes = (): Promise<number> =>
    page.evaluate(() => (window as unknown as { __scoreWrites: number }).__scoreWrites);
  // Plusieurs pas sans bonbon : le texte du score n'est pas touché.
  const before = await writes();
  await drive(page, oracle, ['up', 'up']);
  expect(await writes()).toBe(before);
  await eatNextCandy(page, oracle);
  await expect(page.locator('.hud-score')).toHaveText('Score 1');
  const afterCandy = await writes();
  expect(afterCandy).toBeGreaterThan(before);
  await runFor(page, 300);
  expect(await writes()).toBe(afterCandy);
});

test('ct_59_pause_reprise_abandon : pause figée, reprise après 3 s, abandon confirmé', async ({
  page,
}) => {
  await startRunning(page);
  const oracle = oracleAfterFirstStep();
  await eatNextCandy(page, oracle);
  await eatNextCandy(page, oracle);
  const before = await read(page);
  await pressPause(page);
  await expect(page.getByRole('dialog', { name: 'Pause' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reprendre' })).toBeFocused();
  await runFor(page, 5000);
  expect((await read(page)).snake).toEqual(before.snake);

  await page.getByRole('button', { name: 'Reprendre' }).tap();
  await expect(page.locator('.countdown-number')).toHaveText('3');
  await runFor(page, 2050);
  expect((await read(page)).snake).toEqual(before.snake);
  await runFor(page, 1000);
  const after = await stepOnce(page, 1000 / speedOf(oracle));
  expect(after.snake).toHaveLength(before.snake.length);
  expect(after.head!.direction).toBe(before.head!.direction);

  await pressPause(page);
  await page.getByRole('button', { name: 'Abandonner' }).tap();
  await expect(page.getByText('Votre score de 2 points sera conservé.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Non' })).toBeFocused();
  await page.getByRole('button', { name: 'Non' }).tap();
  await expect(page.getByRole('dialog', { name: 'Pause' })).toBeVisible();
  await page.getByRole('button', { name: 'Abandonner' }).tap();
  await page.getByRole('button', { name: 'Oui' }).tap();
  await expect(page.locator('.end-reason')).toHaveText('Partie abandonnée');
  await expect(page.locator('.end-score')).toHaveText('Score 2');
});

test('ct_108_focus_dialogues_echap : Échap équivaut à « Reprendre » puis à « Non »', async ({
  page,
}) => {
  await startRunning(page);
  await pressPause(page);
  await page.getByRole('button', { name: 'Abandonner' }).tap();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Pause' })).toBeVisible();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Reprendre' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.countdown-hint')).toHaveText('Reprise de la partie');
  // 05 § 6 : le focus revient au bouton qui a ouvert la boîte.
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeFocused();
});

test('ct_108_focus_dialogues_echap : « Reprendre » rend le focus au bouton pause', async ({
  page,
}) => {
  await startRunning(page);
  await page.getByRole('button', { name: 'Pause', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Reprendre' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeFocused();
});

test('ct_60_bouton_retour : pause sans fermer le jeu, aussi la seconde fois', async ({ page }) => {
  await startRunning(page);
  const url = page.url();
  await page.goBack();
  await expect(page.getByRole('dialog', { name: 'Pause' })).toBeVisible();
  expect(page.url()).toBe(url);
  await page.getByRole('button', { name: 'Reprendre' }).tap();
  await skipCountdown(page);
  await stepOnce(page, STEP_MS);
  await page.goBack();
  await expect(page.getByRole('dialog', { name: 'Pause' })).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
});

test('ct_04_depart_et_pas : la zone d’annonce existe dès le démarrage et annonce chaque seconde', async ({
  page,
}) => {
  await openGame(page, { seed: 1 });
  const region = page.locator('div.sr-only[aria-live="polite"]');
  await expect(region).toHaveCount(1);
  await expect(region).toHaveText('');
  await startClassic(page);
  await runFor(page, 50);
  await expect(region).toHaveText('3');
  await runFor(page, 1000);
  await expect(region).toHaveText('2');
});

test('ct_60_bouton_retour : hors partie, il agit comme « ‹ Retour » puis quitte le jeu sur le menu', async ({
  page,
}) => {
  await page.goto('about:blank');
  await openGame(page);
  await page.getByRole('button', { name: 'Jouer' }).tap();
  await expect(page.getByRole('heading', { name: 'Choisissez un mode' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('button', { name: 'Jouer' })).toBeFocused();
  await expect(page.getByRole('heading', { name: 'Choisissez un mode' })).toHaveCount(0);
  // Sur le menu, le retour quitte le jeu.
  await page.goBack();
  expect(page.url()).toBe('about:blank');

  // « ‹ Retour » et le retour du téléphone suivent le même chemin : un seul niveau d'historique.
  await openGame(page);
  await page.getByRole('button', { name: 'Jouer' }).tap();
  await page.getByRole('button', { name: '‹ Retour' }).tap();
  await expect(page.getByRole('button', { name: 'Jouer' })).toBeFocused();
  await page.goBack();
  expect(page.url()).toBe('about:blank');
});

test('ct_60_bouton_retour : EF-01 CA-4, depuis « Records » le retour ramène au menu, un second retour quitte le jeu', async ({
  page,
}) => {
  await page.goto('about:blank');
  await openGame(page);
  await page.getByRole('button', { name: 'Records' }).tap();
  await expect(page.getByRole('heading', { name: 'Records' })).toBeAttached();
  await page.goBack();
  await expect(page.getByRole('button', { name: 'Records' })).toBeFocused();
  await expect(page.getByRole('heading', { name: 'Records' })).toHaveCount(0);
  await page.goBack();
  expect(page.url()).toBe('about:blank');

  // « ‹ Retour » suit le même chemin.
  await openGame(page);
  await page.getByRole('button', { name: 'Records' }).tap();
  await page.getByRole('button', { name: '‹ Retour' }).tap();
  await expect(page.getByRole('button', { name: 'Records' })).toBeFocused();
  await page.goBack();
  expect(page.url()).toBe('about:blank');
});

test('ct_60_bouton_retour : après une partie, « Menu » retire le niveau ; « Rejouer » garde la pause', async ({
  page,
}) => {
  await page.goto('about:blank');
  await startRunning(page);
  await abandonGame(page);
  await page.getByRole('button', { name: 'Rejouer' }).tap();
  await runFor(page, 50);
  // Après « Rejouer », le retour du téléphone met en pause sans quitter.
  await page.goBack();
  await expect(page.getByRole('dialog', { name: 'Pause' })).toBeVisible();
  await page.getByRole('button', { name: 'Abandonner' }).tap();
  await page.getByRole('button', { name: 'Oui' }).tap();
  await page.getByRole('button', { name: 'Menu' }).tap();
  await expect(page.getByRole('button', { name: 'Jouer' })).toBeVisible();
  // Après « Menu », un seul retour quitte le jeu (aucun niveau d'historique oublié).
  await page.goBack();
  expect(page.url()).toBe('about:blank');
});

test('ct_60_bouton_retour : sur l’écran de fin, le retour du téléphone ramène au menu', async ({
  page,
}) => {
  await page.goto('about:blank');
  await startRunning(page);
  await abandonGame(page);
  await expect(page.locator('.end')).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('button', { name: 'Jouer' })).toBeVisible();
  await page.goBack();
  expect(page.url()).toBe('about:blank');
});

test('ct_82_grille_entiere_et_cases : grille entière dans la zone sûre, cases à la taille minimale', async ({
  page,
}, testInfo) => {
  for (const control of ['swipe', 'arrows'] as const) {
    await page.goto('about:blank');
    await openGame(page, { seed: 1, control });
    await startClassic(page);
    await runFor(page, 50);
    const viewport = page.viewportSize()!;
    const canvas = (await page.locator('canvas').boundingBox())!;
    expect(canvas.x).toBeGreaterThanOrEqual(0);
    expect(canvas.y).toBeGreaterThanOrEqual(LAYOUT.hudHeightPx - 1);
    expect(canvas.x + canvas.width).toBeLessThanOrEqual(viewport.width);
    expect(canvas.y + canvas.height).toBeLessThanOrEqual(viewport.height);
    const cell = canvas.width / GRID.columns;
    expect(Number.isInteger(cell)).toBe(true);
    expect(canvas.height).toBe(cell * GRID.rows);
    const minMm = testInfo.project.name === 'Android paysage' ? 4 : 3;
    expect(cell * MM_PER_PX[testInfo.project.name]!).toBeGreaterThanOrEqual(minMm);
    const pause = (await page.getByRole('button', { name: 'Pause', exact: true }).boundingBox())!;
    expect(pause.width).toBeGreaterThanOrEqual(9 * PX_PER_MM);
    expect(pause.height).toBeGreaterThanOrEqual(9 * PX_PER_MM);
    // 05 § 7.3 : marge d'écran de 8 px en haut et à droite du bandeau (coins arrondis du téléphone).
    expect(pause.y).toBeGreaterThanOrEqual(LAYOUT.marginPx);
    expect(viewport.width - (pause.x + pause.width)).toBeGreaterThanOrEqual(LAYOUT.marginPx);
    if (control === 'arrows') {
      for (const name of ['Haut', 'Bas', 'Gauche', 'Droite']) {
        const arrow = (await page.getByRole('button', { name, exact: true }).boundingBox())!;
        expect(arrow.x).toBeGreaterThanOrEqual(LAYOUT.marginPx);
        expect(viewport.width - (arrow.x + arrow.width)).toBeGreaterThanOrEqual(LAYOUT.marginPx);
        expect(arrow.y).toBeGreaterThanOrEqual(LAYOUT.marginPx);
        expect(viewport.height - (arrow.y + arrow.height)).toBeGreaterThanOrEqual(LAYOUT.marginPx);
        expect(arrow.width).toBeGreaterThanOrEqual(12 * PX_PER_MM - 0.5);
        expect(arrow.height).toBeGreaterThanOrEqual(12 * PX_PER_MM - 0.5);
      }
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    expect(overflow).toBeLessThanOrEqual(0);
  }
});

test('ct_119_parametre_seed : ?seed=42 rejoue la même partie, une autre graine une autre partie', async ({
  page,
}) => {
  const candiesFor = async (seed: number): Promise<unknown> => {
    await page.goto('about:blank');
    await openGame(page, { seed });
    await startClassic(page);
    await runFor(page, 50);
    return (await read(page)).candies;
  };
  const expected = createGame(CLASSIC, 42).candies.map((candy) => ({
    col: candy.cell.col,
    row: candy.cell.row,
    color: candy.color,
  }));
  const first = await candiesFor(42);
  expect(first).toEqual(expected);
  expect(await candiesFor(42)).toEqual(first);
  expect(await candiesFor(43)).not.toEqual(first);
});

test('ct_83_temps_de_navigation : lancement d’une partie en 1 s, changement d’écran en 0,5 s', async ({
  page,
}) => {
  await page.goto('/');
  const play = page.getByRole('button', { name: 'Jouer' });
  const started = Date.now();
  await play.tap();
  await page.getByRole('heading', { name: 'Choisissez un mode' }).waitFor();
  expect(Date.now() - started).toBeLessThan(500);
  const launched = Date.now();
  await page.getByRole('button', { name: 'Classique' }).tap();
  await page.locator('.countdown-number').waitFor();
  expect(Date.now() - launched).toBeLessThan(1000);
});

test.describe('ct_117_analyse_axe : écrans de la partie', () => {
  test('E2 Choix du mode', async ({ page }) => {
    await openGame(page);
    await page.getByRole('button', { name: 'Jouer' }).tap();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('E4 Compte à rebours (départ)', async ({ page }) => {
    await openGame(page, { seed: 1 });
    await startClassic(page);
    await runFor(page, 50);
    await expect(page.locator('.countdown')).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });

  for (const control of ['swipe', 'arrows'] as const) {
    test(`E3 Partie (bandeau, bouton pause${control === 'arrows' ? ', flèches' : ''})`, async ({
      page,
    }) => {
      await startRunning(page, { control });
      expect(await seriousViolations(page)).toEqual([]);
    });
  }

  test('E5 Pause et abandon', async ({ page }) => {
    await startRunning(page);
    await pressPause(page);
    expect(await seriousViolations(page)).toEqual([]);
    await page.getByRole('button', { name: 'Abandonner' }).tap();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('E6 Fin de partie', async ({ page }) => {
    await startRunning(page);
    await pressPause(page);
    await page.getByRole('button', { name: 'Abandonner' }).tap();
    await page.getByRole('button', { name: 'Oui' }).tap();
    await expect(page.locator('.end')).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('E12 Tournez votre téléphone', async ({ page }) => {
    await openGame(page);
    await page.setViewportSize({ width: 360, height: 780 });
    await expect(page.locator('.rotate-notice')).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });
});

const ARROW_NAMES: Record<Direction, string> = {
  up: 'Haut',
  down: 'Bas',
  left: 'Gauche',
  right: 'Droite',
};

const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

/** Distance en cases jusqu'à une autre case, bords traversés (Zen). */
function wrappedDistance(a: Cell, b: Cell): number {
  const columns = Math.abs(a.col - b.col);
  const rows = Math.abs(a.row - b.row);
  return Math.min(columns, GRID.columns - columns) + Math.min(rows, GRID.rows - rows);
}

/** Direction du prochain pas vers `target` en Zen : jamais de demi-tour, tout droit tant que cela rapproche. */
function directionToward(game: Game, target: Cell): Direction {
  const head = game.snake[0] as Cell;
  const here = wrappedDistance(head, target);
  const options = DIRECTIONS.filter((direction) => direction !== OPPOSITE[game.direction])
    .map((direction) => {
      const distance = wrappedDistance(wrapCell(move(head, direction)), target);
      return {
        direction,
        distance,
        straightWithoutGain: direction === game.direction && distance >= here,
      };
    })
    .sort(
      (a, b) =>
        a.distance - b.distance || Number(a.straightWithoutGain) - Number(b.straightWithoutGain),
    );
  return (options[0] as { direction: Direction }).direction;
}

/** Action à faire dans le navigateur à un instant de la partie (en pas depuis la synchronisation). */
type Action =
  | { at: number; kind: 'turn'; direction: Direction }
  | { at: number; kind: 'check'; head: Cell; score: number };

/**
 * Joue toute la partie sur le moteur seul et relève les commandes à envoyer, chacune juste avant le pas où elle
 * s'applique, ainsi que des points de contrôle (tête et score) tous les 20 bonbons.
 */
function planSweep(game: Game): { actions: Action[]; steps: number } {
  const actions: Action[] = [];
  let steps = 0;
  while (game.end === null) {
    const candy = game.candies[0];
    if (candy === undefined) throw new Error('Aucun bonbon à rejoindre.');
    const direction = directionToward(game, candy.cell);
    steps += 1;
    if (direction !== game.direction) actions.push({ at: steps, kind: 'turn', direction });
    sendCommand(game, direction);
    const eaten = game.candiesEaten;
    step(game);
    if (game.candiesEaten > eaten && game.candiesEaten % 20 === 0 && game.end === null) {
      actions.push({
        at: steps,
        kind: 'check',
        head: { ...(game.snake[0] as Cell) },
        score: game.score,
      });
    }
  }
  return { actions, steps };
}

test.describe('ct_08_victoire_aire_pleine : partie Zen menée jusqu’à l’aire pleine, dans le navigateur', () => {
  // Une définition d'écran basse accélère le rendu des quelque milliers de pas de cette partie.
  test.use({ deviceScaleFactor: 1 });

  test('les 288 cases occupées : « Victoire ! L’aire de jeu est pleine. », score affiché et retenu dans le tableau Zen', async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName !== 'chromium',
      'Test long : un seul navigateur suffit à cette variante.',
    );
    test.setTimeout(900_000);
    const oracle = await startModeRunning(page, ZEN_MODE, 'Zen', {
      seed: 1,
      control: 'arrows',
    });
    // Synchronisation sur un deuxième pas : ensuite, la phase de l'horloge est connue à une image près.
    await stepOnce(page, 0);
    step(oracle);
    const { actions, steps } = planSweep(oracle);

    // Le pas n du plan survient à n × STEP_MS ; une commande part 60 ms avant, un contrôle 60 ms après. L'horloge
    // n'avance que par millisecondes entières : on compte le temps depuis la synchronisation pour que l'arrondi
    // ne s'accumule pas.
    let elapsed = 0;
    const advanceTo = async (ms: number): Promise<void> => {
      const target = Math.round(ms);
      await runFor(page, target - elapsed);
      elapsed = target;
    };
    for (const action of actions) {
      if (action.kind === 'turn') {
        await advanceTo(action.at * STEP_MS - 60);
        await page.getByRole('button', { name: ARROW_NAMES[action.direction], exact: true }).tap();
      } else {
        await advanceTo(action.at * STEP_MS + 60);
        expect((await read(page)).head, `après le pas ${action.at}`).toMatchObject({
          col: action.head.col,
          row: action.head.row,
        });
        await expect(page.locator('.hud-score')).toHaveText(`Score ${action.score}`);
      }
    }
    await advanceTo(steps * STEP_MS);

    expect(oracle.end).toBe('victory');
    // En Zen le corps se traverse : le serpent peut compter plus de 288 anneaux, mais toutes les cases sont occupées.
    expect(new Set(oracle.snake.map((part) => `${part.col},${part.row}`)).size).toBe(
      GRID.columns * GRID.rows,
    );
    expect(oracle.score).toBe(oracle.snake.length - 4);

    await waitForEndScreen(page);
    await expect(page.locator('.end-reason')).toHaveText("Victoire ! L'aire de jeu est pleine.");
    await expect(page.locator('.end-score')).toHaveText(new RegExp(`^Score\\s+${oracle.score}$`));
    await expect(page.locator('.end-record')).toContainText('Nouveau record');
    await page.getByRole('button', { name: 'Menu' }).tap();
    await page.getByRole('button', { name: 'Records' }).tap();
    for (let index = 0; index < 5; index += 1) {
      await page.getByRole('button', { name: 'Mode suivant' }).tap();
    }
    await expect(page.locator('.records-mode')).toHaveText('Zen');
    await expect(page.locator('.records-row .record-score')).toHaveText([String(oracle.score)]);
  });
});
