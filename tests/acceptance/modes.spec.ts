import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { sameCell } from '../../src/core/board.ts';
import { opposite } from '../../src/core/commands.ts';
import { createGame, secondsLeft, sendCommand, step } from '../../src/core/engine.ts';
import { ASTEROIDS_MODE } from '../../src/core/modes/asteroids.ts';
import { BLACK_HOLE_MODE } from '../../src/core/modes/black-hole.ts';
import { BONUS_TRAPS } from '../../src/core/modes/bonus-traps.ts';
import { CONSTELLATION_MODE } from '../../src/core/modes/constellation.ts';
import { TIME_ATTACK_MODE } from '../../src/core/modes/time-attack.ts';
import { ZEN_MODE } from '../../src/core/modes/zen.ts';
import {
  AUDIO,
  BLACK_HOLES,
  DRAW_COLORS,
  TIME_ATTACK,
  VIBRATION_MS,
} from '../../src/core/rules.ts';
import type { SpecialType } from '../../src/core/rules.ts';
import type { CandyColorId, Game } from '../../src/core/types.ts';
import { TEXTS, sequenceLabel } from '../../src/ui/texts.ts';
import { eatCandies, findPath } from '../support/pilote.ts';
import {
  cellsWithCenter,
  countInCell,
  drive,
  eatNextCandy,
  openGame,
  read,
  runFor,
  seriousViolations,
  skipCountdown,
  startMode,
  startModeRunning,
  stepOnce,
  swipe,
  watchProblems,
} from './support/jeu.ts';
import {
  progressWith,
  readProgress,
  readStorage,
  removeProfileDirectories,
  seedStorage,
} from './support/sauvegarde.ts';
import {
  audioReport,
  installAudioProbe,
  installVibrationProbe,
  installWakeLockProbe,
  setVisibility,
  vibrations,
  wakeLockReport,
} from './support/sondes.ts';

test.afterEach(() => {
  removeProfileDirectories();
});

const MODE_ORDER = [
  'Classique',
  'Contre la montre',
  "Champ d'astéroïdes",
  'Trou noir',
  'Bonus et pièges',
  'Zen',
  'Mode mystère',
];

const hudTime = (page: Page) => page.locator('.hud-time');
const pauseDialog = (page: Page) => page.getByRole('dialog', { name: 'Pause' });

/** Progression d'un téléphone où `games` parties ont déjà été terminées. */
function afterGames(games: number) {
  return progressWith((progress) => {
    progress.counters.gamesByMode.classic = games;
  });
}

test.describe('ct_02_liste_modes_regles : les sept emplacements de la liste, dans l’ordre de RG-02', () => {
  test('six modes et le mode mystère, chaque règle en deux phrases et 200 caractères au plus', async ({
    page,
  }) => {
    await openGame(page);
    await page.getByRole('button', { name: 'Jouer' }).tap();
    await expect(page.locator('.mode-name')).toHaveText(MODE_ORDER);
    const rules = await page.locator('.mode-rule').allTextContents();
    expect(rules).toHaveLength(7);
    expect(rules.slice(0, 6)).toEqual([
      TEXTS.modes.rules.classic,
      'Mangez un maximum de bonbons en 60 secondes. Attention aux bords et à votre queue !',
      'Un nouvel astéroïde apparaît tous les 5 bonbons. Évitez-les, ainsi que les bords et votre queue.',
      'Entrez dans un trou noir pour ressortir par son jumeau. Ne touchez ni les bords ni votre queue.',
      'Des bonbons spéciaux ralentissent, accélèrent, rétrécissent le serpent ou inversent les commandes pendant quelques secondes. Ne touchez ni les bords ni votre queue.',
      'Impossible de perdre : traversez les bords et votre propre corps. Quittez quand vous voulez avec le bouton pause.',
    ]);
    for (const rule of rules.slice(0, 6)) {
      expect(rule.length).toBeLessThanOrEqual(200);
      expect(rule.split(/[.!?]\s/).length).toBeLessThanOrEqual(2);
    }
  });
});

test.describe('ct_03_mode_mystere_verrouille : aucune partie ne démarre', () => {
  for (const [games, message] of [
    [0, 'Jouez encore 3 parties pour le découvrir'],
    [1, 'Jouez encore 2 parties pour le découvrir'],
    [2, 'Jouez encore 1 partie pour le découvrir'],
  ] as const) {
    test(`${games} partie(s) terminée(s) : « ${message} », un toucher n’ouvre aucune partie`, async ({
      page,
    }) => {
      const problems = watchProblems(page);
      await seedStorage(page, { progress: afterGames(games) });
      await openGame(page);
      await page.getByRole('button', { name: 'Jouer' }).tap();
      const locked = page.getByRole('button', { name: /^Mode mystère/ });
      // Focalisable et lu comme désactivé (aria-disabled), avec son message en clair.
      await expect(locked).toHaveAttribute('aria-disabled', 'true');
      await expect(locked.locator('.mode-rule')).toHaveText(message);
      await expect(locked.locator('.mode-lock')).toHaveAttribute('aria-hidden', 'true');
      await locked.focus();
      await expect(locked).toBeFocused();
      // Playwright tient un bouton aria-disabled pour inactif : le toucher est forcé, comme celui du joueur.
      await locked.tap({ force: true });
      await expect(page.locator('.toast')).toHaveText(message);
      await runFor(page, 4000);
      await expect(page.locator('.countdown')).toHaveCount(0);
      await expect(page.getByRole('heading', { name: 'Choisissez un mode' })).toBeVisible();
      expect(problems).toEqual([]);
    });
  }

  test('une fois découvert, le mode est le 7e de la liste, avec sa règle, et se lance', async ({
    page,
  }) => {
    await seedStorage(page, { progress: afterGames(3) });
    await openGame(page);
    await page.getByRole('button', { name: 'Jouer' }).tap();
    await expect(page.locator('.mode-name')).toHaveText([
      ...MODE_ORDER.slice(0, 6),
      'Constellation',
    ]);
    await expect(page.locator('.mode-locked')).toHaveCount(0);
    await page.getByRole('button', { name: /^Constellation/ }).tap();
    await runFor(page, 50);
    await expect(page.locator('.countdown-number')).toHaveText('3');
  });
});

test.describe('ct_25_contre_la_montre_chrono : le chrono du bandeau (EF-10 CA-1, RG-29)', () => {
  test('60 s pendant le compte à rebours et jusqu’au premier pas, secondes entières, « Temps écoulé » à 0', async ({
    page,
  }) => {
    const problems = watchProblems(page);
    await openGame(page, { seed: 1 });
    await startMode(page, 'Contre la montre');
    await runFor(page, 50);
    await expect(hudTime(page)).toHaveText('Temps 60 s');
    // Le chrono ne démarre pas pendant le compte à rebours.
    await runFor(page, 2500);
    await expect(hudTime(page)).toHaveText('Temps 60 s');
    await runFor(page, 550);
    await stepOnce(page, 1000 / 8);
    await expect(hudTime(page)).toHaveText('Temps 60 s');

    // 10 s de jeu : le chrono affiche les secondes entières restantes, arrondies à l'unité supérieure.
    await page.clock.fastForward(10_000);
    await runFor(page, 50);
    await expect(hudTime(page)).toHaveText(/^Temps (50|49) s$/);
    // Le temps écoulé de la partie est celui du moteur : au plus une image de plus que 10 s.
    const expected = secondsLeft(TIME_ATTACK.durationMs - 10_050);
    await expect(hudTime(page)).toHaveText(`Temps ${expected} s`);

    // Les 50 dernières secondes : la partie se termine par « Temps écoulé », sans collision.
    await page.clock.fastForward(49_000);
    await runFor(page, 50);
    await expect(hudTime(page)).toHaveText('Temps 1 s');
    // Le temps s'écoule en moins d'une seconde ; l'écran de fin s'affiche 1 s après, comme pour toute fin (RG-08).
    await runFor(page, 800);
    await expect(page.locator('.end')).toHaveCount(0);
    await runFor(page, 1500);
    await expect(page.locator('.end')).toBeVisible();
    await expect(page.locator('.end-reason')).toHaveText('Temps écoulé');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Contre la montre');
    expect(problems).toEqual([]);
  });

  test('trois bonbons sur l’aire, le même nombre à chaque pas, aux positions du moteur', async ({
    page,
  }) => {
    const oracle = await startModeRunning(page, TIME_ATTACK_MODE, 'Contre la montre');
    expect(oracle.candies).toHaveLength(3);
    for (let index = 0; index < 4; index += 1) {
      const reading = await read(page);
      expect(reading.candies).toHaveLength(3);
      await stepOnce(page, 1000 / 8);
    }
    const reading = await read(page);
    expect(reading.candies.map((candy) => `${candy.col},${candy.row}`).sort()).toEqual(
      oracle.candies.map((candy) => `${candy.cell.col},${candy.cell.row}`).sort(),
    );
  });
});

test.describe('ct_26_contre_la_montre_pause : appel, reprise et collision (EF-10 CA-2, CA-3, RG-30)', () => {
  test('35 s restantes, interruption de 2 minutes, la reprise affiche 35 et la partie dure encore 35 s de jeu', async ({
    page,
  }) => {
    const problems = watchProblems(page);
    await startModeRunning(page, TIME_ATTACK_MODE, 'Contre la montre', { seed: 1 });
    await page.clock.fastForward(24_900);
    await runFor(page, 50);
    await expect(hudTime(page)).toHaveText('Temps 35 s');

    await setVisibility(page, false);
    await page.clock.fastForward(120_000);
    await setVisibility(page, true);
    await expect(pauseDialog(page)).toBeVisible();
    await expect(hudTime(page)).toHaveText('Temps 35 s');

    await page.getByRole('button', { name: 'Reprendre' }).tap();
    // Le compte à rebours de reprise ne fait pas avancer le chrono.
    await runFor(page, 1500);
    await expect(page.locator('.countdown-number')).toBeVisible();
    await expect(hudTime(page)).toHaveText('Temps 35 s');
    // Le serpent repart après 3 s : à peine 0,1 s de jeu plus tard, le chrono n'a pas perdu une seconde.
    await runFor(page, 1600);
    await expect(hudTime(page)).toHaveText('Temps 35 s');

    // La partie dure encore 35 s de jeu : à 34 s, elle continue ; ensuite, elle se termine par « Temps écoulé ».
    await page.clock.fastForward(33_800);
    await runFor(page, 50);
    await expect(hudTime(page)).toHaveText('Temps 1 s');
    await expect(page.locator('.end')).toHaveCount(0);
    await runFor(page, 2500);
    await expect(page.locator('.end-reason')).toHaveText('Temps écoulé');
    expect(problems).toEqual([]);
  });

  test('à 20 s restantes, le serpent qui touche un bord termine la partie par « Collision » avec le score atteint', async ({
    page,
  }) => {
    await startModeRunning(page, TIME_ATTACK_MODE, 'Contre la montre', { seed: 1 });
    await page.clock.fastForward(39_900);
    await runFor(page, 50);
    await expect(hudTime(page)).toHaveText('Temps 20 s');
    // Le serpent va tout droit vers la droite : il rejoint le bord en moins de 3 secondes.
    await runFor(page, 4000);
    await expect(page.locator('.end')).toBeVisible();
    await expect(page.locator('.end-reason')).toHaveText('Collision');
    await expect(page.locator('.end-score')).toHaveText(/^Score\s+\d+$/);
  });
});

test.describe('ct_28_asteroides_placement_collision : astéroïdes dessinés et collision (EF-11)', () => {
  test('les trois astéroïdes de départ sont dessinés aux cases du moteur, aucun sur la ligne 6', async ({
    page,
  }) => {
    await openGame(page, { seed: 1 });
    await startMode(page, "Champ d'astéroïdes");
    await runFor(page, 50);
    const oracle = createGame(ASTEROIDS_MODE, 1);
    const drawn = await cellsWithCenter(page, DRAW_COLORS.asteroid);
    expect(drawn).toHaveLength(3);
    expect(drawn.map((cell) => `${cell.col},${cell.row}`).sort()).toEqual(
      oracle.obstacles.map((cell) => `${cell.col},${cell.row}`).sort(),
    );
    expect(drawn.every((cell) => cell.row !== 6)).toBe(true);
  });
});

test.describe('ct_28_asteroides_collision : le contact avec un astéroïde termine la partie (EF-11 CA-3)', () => {
  test('le serpent mené contre un astéroïde : « Collision » avec le score atteint', async ({
    page,
  }) => {
    const problems = watchProblems(page);
    const oracle = await startModeRunning(page, ASTEROIDS_MODE, "Champ d'astéroïdes", { seed: 1 });
    const path = findPath(oracle, (cell, game) =>
      game.obstacles.some((obstacle) => sameCell(obstacle, cell)),
    );
    expect(path).not.toBeNull();
    const route = path ?? [];
    await drive(page, oracle, route.slice(0, -1));
    expect(oracle.end).toBeNull();
    const last = route.at(-1);
    expect(last).toBeDefined();
    if (last !== undefined && sendCommand(oracle, last)) await swipe(page, last);
    await runFor(page, 400);
    await expect(page.locator('.end')).toHaveCount(0);
    await runFor(page, 1500);
    await expect(page.locator('.end-reason')).toHaveText('Collision');
    await expect(page.locator('.end-score')).toHaveText(/^Score\s+0$/);
    expect(problems).toEqual([]);
  });
});

test.describe('ct_29_trou_noir : halos, téléportation et anneaux dans le navigateur (EF-12)', () => {
  test('quatre trous aux cases du moteur, deux halos distincts, aucun anneau sur un trou, sortie du jumeau', async ({
    page,
  }) => {
    const problems = watchProblems(page);
    const oracle = await startModeRunning(page, BLACK_HOLE_MODE, 'Trou noir', { seed: 1 });
    const keys = (cells: { col: number; row: number }[]): string[] =>
      cells.map((cell) => `${cell.col},${cell.row}`).sort();
    expect(keys(await cellsWithCenter(page, DRAW_COLORS.holeCore))).toEqual(
      keys(oracle.holes.map((hole) => hole.cell)),
    );

    // Chaque paire a son halo : la teinte de sa paire, et seulement elle ; le trait pointillé est plus léger que le plein.
    const counts: number[] = [];
    for (const hole of oracle.holes) {
      const own = BLACK_HOLES.halos[hole.pair];
      const other = BLACK_HOLES.halos[1 - hole.pair];
      expect(own).toBeDefined();
      expect(other).toBeDefined();
      const ownCount = await countInCell(page, hole.cell, own?.hex ?? '', 0);
      expect(ownCount).toBeGreaterThan(40);
      expect(await countInCell(page, hole.cell, other?.hex ?? '', 0)).toBe(0);
      counts[hole.pair] = ownCount;
    }
    expect(counts[1]).toBeLessThan(counts[0] ?? 0);

    // Le serpent entre dans un trou : la tête ressort du jumeau au même pas, les anneaux suivent.
    const path = findPath(oracle, (cell, game) =>
      game.holes.some((hole) => sameCell(hole.cell, cell)),
    );
    expect(path).not.toBeNull();
    await drive(page, oracle, path ?? []);
    expect(oracle.end).toBeNull();
    const reading = await read(page);
    const head = oracle.snake[0];
    expect(reading.head).toMatchObject({ col: head?.col, row: head?.row });
    for (const hole of oracle.holes) {
      expect(reading.snake.some((part) => sameCell(part, hole.cell))).toBe(false);
    }
    expect(reading.snake).toHaveLength(oracle.snake.length);
    expect(problems).toEqual([]);
  });
});

test.describe('ct_32_zen : traversée des bords, abandon et tableau du mode (EF-14)', () => {
  test('la tête qui sort par le bord droit réapparaît sur le bord gauche, même ligne', async ({
    page,
  }) => {
    const problems = watchProblems(page);
    const oracle = await startModeRunning(page, ZEN_MODE, 'Zen', { seed: 1 });
    // Le bonbon est hors de la ligne 6 : la tête traverse toute la ligne sans rien manger.
    oracle.candies = [];
    for (let column = 8; column <= 24; column += 1) await drive(page, oracle, ['right']);
    expect(oracle.snake[0]).toEqual({ col: 24, row: 6 });
    await drive(page, oracle, ['right']);
    expect(oracle.snake[0]).toEqual({ col: 1, row: 6 });
    const reading = await read(page);
    expect(reading.head).toMatchObject({ col: 1, row: 6 });
    await expect(page.locator('.end')).toHaveCount(0);
    expect(problems).toEqual([]);
  });

  test('abandon à 3 points : « Partie abandonnée », le score va au tableau Zen et pas au tableau Classique', async ({
    page,
  }) => {
    const problems = watchProblems(page);
    const oracle = await startModeRunning(page, ZEN_MODE, 'Zen', { seed: 2 });
    for (let candy = 0; candy < 3; candy += 1) await eatNextCandy(page, oracle);
    expect(oracle.score).toBe(3);
    await expect(page.locator('.hud-score')).toHaveText('Score 3');
    await page.getByRole('button', { name: 'Pause', exact: true }).tap();
    await page.getByRole('button', { name: 'Abandonner' }).tap();
    await page.getByRole('button', { name: 'Oui' }).tap();
    await expect(page.locator('.end-reason')).toHaveText('Partie abandonnée');
    await expect(page.locator('.end-score')).toHaveText(/^Score\s+3$/);
    await expect(page.locator('.end-record')).toContainText('Nouveau record');
    await page.getByRole('button', { name: 'Menu' }).tap();

    await page.getByRole('button', { name: 'Records' }).tap();
    await expect(page.locator('.records-mode')).toHaveText('Classique');
    await expect(page.locator('.records-empty')).toHaveText("Aucun record pour l'instant");
    for (let index = 0; index < 5; index += 1) {
      await page.getByRole('button', { name: 'Mode suivant' }).tap();
    }
    await expect(page.locator('.records-mode')).toHaveText('Zen');
    await expect(page.locator('.records-row .record-score')).toHaveText(['3']);
    expect(problems).toEqual([]);
  });
});

test.describe('ct_09_ecran_allume : verrou d’écran tenu 5 minutes en mode Zen (EF-02 CA-6, RG-10)', () => {
  test('un verrou demandé au départ, tenu pendant 5 minutes sans toucher l’écran, relâché en pause, redemandé à la reprise', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const problems = watchProblems(page);
    await installWakeLockProbe(page);
    await openGame(page, { seed: 1 });
    await startMode(page, 'Zen');
    await expect.poll(() => wakeLockReport(page)).toEqual({ requests: 1, held: 1 });
    await runFor(page, 3100);
    // 5 minutes de jeu, sans le moindre toucher : le jeu ne demande rien de plus et ne relâche rien.
    for (let minute = 0; minute < 5; minute += 1) {
      await runFor(page, 5000);
      await page.clock.fastForward(55_000);
      expect(await wakeLockReport(page)).toEqual({ requests: 1, held: 1 });
    }
    await expect(page.locator('.end')).toHaveCount(0);
    await expect(pauseDialog(page)).toHaveCount(0);
    await page.getByRole('button', { name: 'Pause', exact: true }).tap();
    await expect.poll(() => wakeLockReport(page)).toEqual({ requests: 1, held: 0 });
    await page.getByRole('button', { name: 'Reprendre' }).tap();
    await expect.poll(() => wakeLockReport(page)).toEqual({ requests: 2, held: 1 });
    expect(problems).toEqual([]);
  });
});

/** Sert à trouver, parmi les graines, une partie Bonus et pièges où le bonbon spécial voulu apparaît au 3e bonbon, près du serpent. */
function bonusSeed(wanted: SpecialType): number {
  for (let seed = 1; seed <= 400; seed += 1) {
    const game = createGame(BONUS_TRAPS, seed);
    step(game);
    try {
      eatCandies(game, 3);
    } catch {
      continue;
    }
    if (game.end !== null || game.special?.type !== wanted) continue;
    const target = game.special.cell;
    const path = findPath(game, (cell) => sameCell(cell, target));
    if (path !== null && path.length >= 3 && path.length <= 20) return seed;
  }
  throw new Error(`Aucune graine pour le bonbon spécial « ${wanted} ».`);
}

/** Lance Bonus et pièges et mange trois bonbons : le bonbon spécial est apparu, le moteur de recette le suit. */
async function bonusUntilSpecial(page: Page, seed: number): Promise<Game> {
  const oracle = await startModeRunning(page, BONUS_TRAPS, 'Bonus et pièges', { seed });
  for (let candy = 0; candy < 3; candy += 1) await eatNextCandy(page, oracle);
  expect(oracle.special).not.toBeNull();
  return oracle;
}

async function eatSpecialCandy(page: Page, oracle: Game): Promise<void> {
  const target = oracle.special?.cell;
  expect(target).toBeDefined();
  const path = findPath(oracle, (cell) => (target === undefined ? false : sameCell(cell, target)));
  expect(path).not.toBeNull();
  await drive(page, oracle, path ?? []);
}

const WHITE = DRAW_COLORS.pictogram;

test.describe('ct_31_bonus_duree_de_vie : apparition au 3e bonbon, disparition après 8 s de jeu (EF-13 CA-4)', () => {
  test('le bonbon spécial porte son pictogramme blanc, ne disparaît pas pendant une pause de 1 minute, puis disparaît', async ({
    page,
  }) => {
    const problems = watchProblems(page);
    const oracle = await bonusUntilSpecial(page, bonusSeed('invert'));
    const cell = oracle.special?.cell;
    expect(cell).toBeDefined();
    if (cell === undefined) return;
    expect(oracle.candies).toHaveLength(1);
    expect(await countInCell(page, cell, WHITE)).toBeGreaterThan(30);

    // 7 s de jeu : il est toujours là.
    await page.clock.fastForward(7000);
    await runFor(page, 50);
    expect(await countInCell(page, cell, WHITE)).toBeGreaterThan(30);

    // Une pause de 1 minute ne le fait pas disparaître plus tôt.
    await page.getByRole('button', { name: 'Pause', exact: true }).tap();
    await page.clock.fastForward(60_000);
    await runFor(page, 100);
    expect(await countInCell(page, cell, WHITE)).toBeGreaterThan(30);
    await page.getByRole('button', { name: 'Reprendre' }).tap();
    await runFor(page, 3100);
    expect(await countInCell(page, cell, WHITE)).toBeGreaterThan(30);

    // Il disparaît à 8 s de jeu depuis son apparition.
    await page.clock.fastForward(1500);
    await runFor(page, 50);
    expect(await countInCell(page, cell, WHITE)).toBe(0);
    expect(problems).toEqual([]);
  });
});

test.describe('ct_30_bonus_effets : indicateur, inversion et rétrécissement dans le navigateur (EF-13)', () => {
  test('Inversion : « gauche » donne droite pendant 6 s, l’indicateur affiche le nom et les secondes, puis disparaît', async ({
    page,
  }) => {
    const problems = watchProblems(page);
    await installAudioProbe(page);
    await installVibrationProbe(page);
    const oracle = await bonusUntilSpecial(page, bonusSeed('invert'));
    expect(await vibrations(page)).toEqual([]);
    await eatSpecialCandy(page, oracle);
    expect(oracle.effect?.type).toBe('invert');
    await expect(page.locator('.hud-effect')).toHaveText('Effet : Inversion 6 s');
    // Bruitage et vibration du bonbon spécial (RG-66) ; le pictogramme est dessiné à part du texte.
    expect((await audioReport(page)).effects).toContain(AUDIO.sfx.special[0]?.hz);
    expect(await vibrations(page)).toEqual([VIBRATION_MS.special]);
    await expect(page.locator('.hud-effect .hud-icon')).toHaveAttribute('aria-hidden', 'true');

    // Un glissement perpendiculaire à la marche donne la direction contraire.
    // La direction effective va vers le centre de la grille, pour ne pas toucher un bord pendant le test.
    const head = oracle.snake[0];
    const vertical = oracle.direction === 'up' || oracle.direction === 'down';
    const command = vertical
      ? (head?.col ?? 0) < 12
        ? 'left'
        : 'right'
      : (head?.row ?? 0) > 6
        ? 'down'
        : 'up';
    await drive(page, oracle, [command]);
    expect(oracle.direction).toBe(opposite(command));

    await page.clock.fastForward(4500);
    await runFor(page, 50);
    await expect(page.locator('.hud-effect')).toHaveText(/^Effet : Inversion [12] s$/);
    await page.clock.fastForward(1800);
    await runFor(page, 50);
    await expect(page.locator('.hud-effect')).toHaveCount(0);
    expect(problems).toEqual([]);
  });

  test('Rétrécissement : le serpent de 7 cases passe à 4, le score augmente de 1, l’annonce est brève', async ({
    page,
  }) => {
    const problems = watchProblems(page);
    const oracle = await bonusUntilSpecial(page, bonusSeed('shrink'));
    expect(oracle.snake).toHaveLength(7);
    const before = oracle.score;
    await eatSpecialCandy(page, oracle);
    expect(oracle.snake).toHaveLength(4);
    expect(oracle.score).toBe(before + 1);
    expect((await read(page)).snake).toHaveLength(4);
    await expect(page.locator('.hud-score')).toHaveText(`Score ${before + 1}`);
    await expect(page.locator('.hud-effect')).toHaveText('Rétrécissement');
    await page.clock.fastForward(2500);
    await runFor(page, 50);
    await expect(page.locator('.hud-effect')).toHaveCount(0);
    expect(problems).toEqual([]);
  });
});

const COLOR_NAMES = TEXTS.colorNames;

/** Constellation débloquée : 3 parties déjà terminées. */
async function openConstellation(page: Page, seed: number): Promise<Game> {
  await seedStorage(page, { progress: afterGames(3) });
  return startModeRunning(page, CONSTELLATION_MODE, 'Constellation', { seed });
}

async function eatColor(page: Page, oracle: Game, color: CandyColorId): Promise<void> {
  const path = findPath(oracle, (cell, game) =>
    game.candies.some((candy) => candy.color === color && sameCell(candy.cell, cell)),
  );
  expect(path, `un chemin vers le bonbon ${color}`).not.toBeNull();
  await drive(page, oracle, path ?? []);
}

test.describe('ct_33_constellation_regles : bandeau, points et bruitage dans le navigateur (EF-15)', () => {
  test('la suite à tracer est affichée avec la couleur attendue en évidence ; dans l’ordre, le score vaut 8 et une nouvelle suite s’affiche', async ({
    page,
  }) => {
    const problems = watchProblems(page);
    await installAudioProbe(page);
    await installVibrationProbe(page);
    const oracle = await openConstellation(page, 1);
    const sequence = [...(oracle.constellation?.sequence ?? [])];
    expect(sequence).toHaveLength(3);
    expect(oracle.candies).toHaveLength(4);
    expect(await read(page).then((reading) => reading.candies)).toHaveLength(4);

    const banner = page.locator('.hud-constellation');
    await expect(banner).toHaveAttribute('aria-label', sequenceLabel(sequence));
    await expect(banner.locator('.hud-star')).toHaveCount(3);
    await expect(banner.locator('.hud-star.is-next')).toHaveCount(1);
    await expect(banner).toContainText(`Prochain : ${COLOR_NAMES[sequence[0] ?? 'pink']}`);

    await eatColor(page, oracle, sequence[0] ?? 'pink');
    await expect(page.locator('.hud-score')).toHaveText('Score 1');
    await expect(banner.locator('.hud-star.is-done')).toHaveCount(1);
    await expect(banner).toContainText(`Prochain : ${COLOR_NAMES[sequence[1] ?? 'pink']}`);
    await eatColor(page, oracle, sequence[1] ?? 'pink');
    await expect(page.locator('.hud-score')).toHaveText('Score 2');
    await eatColor(page, oracle, sequence[2] ?? 'pink');
    expect(oracle.score).toBe(8);
    await expect(page.locator('.hud-score')).toHaveText('Score 8');

    // Une nouvelle suite est tirée, au début ; il y a toujours 4 bonbons, un par couleur.
    const next = oracle.constellation?.sequence ?? [];
    await expect(banner).toHaveAttribute('aria-label', sequenceLabel(next));
    await expect(banner.locator('.hud-star.is-done')).toHaveCount(0);
    expect(await read(page).then((reading) => reading.candies)).toHaveLength(4);
    expect(oracle.candies.map((candy) => candy.color).sort()).toEqual([
      'light-blue',
      'light-pink',
      'pink',
      'purple',
    ]);

    // Bruitage de la constellation complétée (RG-66) : ses quatre notes se suivent ; pas de vibration (réservée au bonbon spécial et à la collision).
    const notes = AUDIO.sfx.constellation.map((note) => note.hz);
    const played = (await audioReport(page)).effects;
    const start = played.findIndex((hz, index) =>
      notes.every((note, offset) => played[index + offset] === note),
    );
    expect(start).toBeGreaterThanOrEqual(0);
    expect(await vibrations(page)).toEqual([]);
    expect(problems).toEqual([]);
  });

  test('un bonbon d’une autre couleur : 0 point, la couleur attendue redevient la première, le serpent grandit et prend sa couleur', async ({
    page,
  }) => {
    const oracle = await openConstellation(page, 1);
    const [first, second, third] = oracle.constellation?.sequence ?? [];
    expect(first && second && third).toBeTruthy();
    await eatColor(page, oracle, first ?? 'pink');
    await expect(page.locator('.hud-score')).toHaveText('Score 1');
    const length = oracle.snake.length;
    await eatColor(page, oracle, third ?? 'pink');
    expect(oracle.score).toBe(1);
    expect(oracle.snake).toHaveLength(length + 1);
    await expect(page.locator('.hud-score')).toHaveText('Score 1');
    await expect(page.locator('.hud-constellation')).toContainText(
      `Prochain : ${COLOR_NAMES[first ?? 'pink']}`,
    );
    expect((await read(page)).head?.color).toBe(third);
  });
});

const DISCOVERY = 'Nouveau mode découvert : Constellation';

/** Termine la partie d'un mode par abandon, depuis l'écran de pause. */
async function abandonGame(page: Page): Promise<void> {
  await runFor(page, 50);
  await skipCountdown(page);
  await page.getByRole('button', { name: 'Pause', exact: true }).tap();
  await page.getByRole('button', { name: 'Abandonner' }).tap();
  await page.getByRole('button', { name: 'Oui' }).tap();
  await expect(page.locator('.end')).toBeVisible();
}

test.describe('ct_34_constellation_decouverte : la 3e partie terminée découvre le mode (EF-15 CA-1, RG-40)', () => {
  test('annonce sur l’écran de fin, mode en 7e position, toujours disponible après réouverture', async ({
    page,
  }) => {
    const problems = watchProblems(page);
    await installAudioProbe(page);
    await seedStorage(page, { progress: afterGames(2) });
    await openGame(page, { seed: 1 });
    await startMode(page, 'Zen');
    await abandonGame(page);
    await expect(page.locator('.end-unlocks li')).toHaveText([DISCOVERY]);
    expect((await audioReport(page)).effects).toContain(AUDIO.sfx.unlock[0]?.hz);
    expect(await seriousViolations(page)).toEqual([]);

    await page.getByRole('button', { name: 'Menu' }).tap();
    await page.getByRole('button', { name: 'Jouer' }).tap();
    await expect(page.locator('.mode-name')).toHaveText([
      ...MODE_ORDER.slice(0, 6),
      'Constellation',
    ]);
    await page.getByRole('button', { name: '‹ Retour' }).tap();

    // Le mode est découvert pour de bon (compteurs enregistrés) : une 4e partie ne l'annonce plus.
    const stored = await readProgress(page);
    expect(Object.values(stored?.counters.gamesByMode ?? {}).reduce((a, b) => a + b, 0)).toBe(3);
    await startMode(page, 'Zen');
    await abandonGame(page);
    await expect(page.locator('.end-unlocks')).toHaveCount(0);
    expect(problems).toEqual([]);
  });

  test('une partie interrompue qui fait atteindre 3 parties annonce le mode au lancement suivant (RG-79, RG-58)', async ({
    page,
  }) => {
    await seedStorage(page, {
      progress: afterGames(2),
      pending: { mode: 'zen', score: 3, candiesEaten: 3, dateTime: '2026-11-01T09:00:00' },
    });
    await openGame(page);
    const notice = page.getByRole('dialog');
    await expect(notice).toContainText(
      'Votre dernière partie (Zen, 3 points) a été interrompue ; elle a été enregistrée.',
    );
    await expect(notice).toContainText(DISCOVERY);
    expect(await seriousViolations(page)).toEqual([]);
    await page.getByRole('button', { name: 'Continuer' }).tap();
    // Le score de 3 entre au tableau : l'écran de fin suit le message, avec la même annonce.
    await expect(page.locator('.end-unlocks li')).toHaveText([DISCOVERY]);
    await page.getByRole('button', { name: 'Menu' }).tap();
    await page.getByRole('button', { name: 'Jouer' }).tap();
    await expect(page.locator('.mode-name').last()).toHaveText('Constellation');
  });
});

test.describe('ct_117_analyse_axe : E3 Partie avec l’information du mode', () => {
  test('chrono de Contre la montre, effet en cours de Bonus et pièges, constellation à tracer', async ({
    page,
  }) => {
    await openGame(page, { seed: 1 });
    await startMode(page, 'Contre la montre');
    await runFor(page, 50);
    await expect(hudTime(page)).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('effet en cours', async ({ page }) => {
    const oracle = await bonusUntilSpecial(page, bonusSeed('invert'));
    await eatSpecialCandy(page, oracle);
    await expect(page.locator('.hud-effect')).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('constellation à tracer', async ({ page }) => {
    await openConstellation(page, 1);
    await expect(page.locator('.hud-constellation')).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });
});

test.describe('ct_62_partie_interrompue : une partie Zen de plus de 288 bonbons garde son compte exact (RG-79, HYP-51)', () => {
  test('relue après fermeture du jeu, clôturée une fois : total de bonbons et record exacts, aussi après restauration', async ({
    page,
  }) => {
    const problems = watchProblems(page);
    const progress = progressWith((p) => {
      p.counters.totalCandies = 40;
      p.counters.gamesByMode.classic = 3;
    });
    await seedStorage(page, {
      progress,
      pending: { mode: 'zen', score: 320, candiesEaten: 320, dateTime: '2026-11-01T09:00:00' },
    });
    await openGame(page);
    await expect(page.getByRole('dialog')).toContainText('(Zen, 320 points)');
    await page.getByRole('button', { name: 'Continuer' }).tap();
    await expect(page.locator('.end-score')).toHaveText(/^Score\s+320$/);
    const stored = await readProgress(page);
    expect(stored?.counters.totalCandies).toBe(360);
    expect(stored?.records.zen[0]?.score).toBe(320);
    expect(stored?.counters.gamesByMode.zen).toBe(1);
    expect((await readStorage(page)).pendingGame).toBeUndefined();
    expect(problems).toEqual([]);
  });
});

test.describe('ct_117_analyse_axe : E2 Choix du mode', () => {
  test('7 modes avec « Mode mystère » verrouillé', async ({ page }) => {
    await openGame(page);
    await page.getByRole('button', { name: 'Jouer' }).tap();
    expect(await seriousViolations(page)).toEqual([]);
  });
});
