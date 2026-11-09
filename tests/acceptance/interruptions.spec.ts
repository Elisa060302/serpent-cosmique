import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

type ViewportSize = { width: number; height: number };
import {
  openGame,
  read,
  runFor,
  seriousViolations,
  skipCountdown,
  startClassic,
  startRunning,
  watchProblems,
} from './support/jeu.ts';
import {
  audioReport,
  fireWindowEvent,
  installAudioProbe,
  installVibrationProbe,
  installWakeLockProbe,
  setVisibility,
  vibrations,
  wakeLockReport,
} from './support/sondes.ts';

const PAUSE_DIALOG = (page: Page) => page.getByRole('dialog', { name: 'Pause' });

interface Interruption {
  name: string;
  start: (page: Page, original: ViewportSize) => Promise<void>;
  end: (page: Page, original: ViewportSize) => Promise<void>;
}

const INTERRUPTIONS: Interruption[] = [
  {
    name: 'page cachée (verrouillage, autre application)',
    start: (page) => setVisibility(page, false),
    end: (page) => setVisibility(page, true),
  },
  {
    name: 'page quittée (pagehide)',
    start: (page) => fireWindowEvent(page, 'pagehide'),
    end: (page) => fireWindowEvent(page, 'pageshow'),
  },
  {
    name: 'saisie perdue (appel, volet de notifications)',
    start: (page) => fireWindowEvent(page, 'blur'),
    end: (page) => fireWindowEvent(page, 'focus'),
  },
  {
    name: 'orientation verticale',
    start: async (page) => {
      await page.setViewportSize({ width: 360, height: 780 });
      await expect(page.locator('.rotate-notice')).toBeVisible();
      // La pause est déjà posée, même si l'écran de jeu est masqué par le message.
      await expect(page.locator('.overlay .dialog')).toBeAttached();
    },
    end: (page, original) => page.setViewportSize(original),
  },
];

test.describe('ct_61_pause_automatique : chaque perte du premier plan met la partie en pause (EF-26)', () => {
  for (const interruption of INTERRUPTIONS) {
    test(`${interruption.name} : aucun pas de plus, une minute plus tard rien n’a bougé, « Reprendre » attendu`, async ({
      page,
    }) => {
      const problems = watchProblems(page);
      await startRunning(page);
      const before = await read(page);
      const original = page.viewportSize()!;
      await interruption.start(page, original);
      await interruption.end(page, original);
      // CA-1 : au retour, une minute plus tard, la pause est affichée et le serpent n'a pas bougé.
      await expect(PAUSE_DIALOG(page)).toBeVisible();
      await expect(page.getByText('Partie mise en pause')).toBeVisible();
      await runFor(page, 60_000);
      expect((await read(page)).snake).toEqual(before.snake);
      // CA-3 : aucun mouvement avant « Reprendre ».
      await expect(PAUSE_DIALOG(page)).toBeVisible();
      await page.getByRole('button', { name: 'Reprendre' }).tap();
      await expect(page.locator('.countdown-hint')).toHaveText('Reprise de la partie');
      expect(problems).toEqual([]);
    });
  }

  test('la pause est immédiate : pas un seul pas entre l’événement et l’écran de pause', async ({
    page,
  }) => {
    await startRunning(page);
    const before = await read(page);
    // L'événement et la lecture se suivent sans qu'aucune image ne passe.
    await fireWindowEvent(page, 'blur');
    await expect(PAUSE_DIALOG(page)).toBeVisible();
    expect((await read(page)).snake).toEqual(before.snake);
  });

  test('une partie en compte à rebours de départ passe aussi en pause', async ({ page }) => {
    await openGame(page, { seed: 1 });
    await startClassic(page);
    await runFor(page, 1200);
    await expect(page.locator('.countdown')).toBeVisible();
    await setVisibility(page, false);
    await setVisibility(page, true);
    await expect(PAUSE_DIALOG(page)).toBeVisible();
    await expect(page.locator('.countdown')).toBeHidden();
    await runFor(page, 5000);
    await expect(PAUSE_DIALOG(page)).toBeVisible();
  });

  test('une partie en compte à rebours de reprise passe aussi en pause', async ({ page }) => {
    await startRunning(page);
    await page.getByRole('button', { name: 'Pause', exact: true }).tap();
    await page.getByRole('button', { name: 'Reprendre' }).tap();
    await runFor(page, 1000);
    await expect(page.locator('.countdown')).toBeVisible();
    await fireWindowEvent(page, 'blur');
    await expect(PAUSE_DIALOG(page)).toBeVisible();
    await expect(page.getByText('Partie mise en pause')).toBeVisible();
  });

  test('« Partie mise en pause » reste affiché après « Abandonner » puis « Non »', async ({
    page,
  }) => {
    await startRunning(page);
    await fireWindowEvent(page, 'blur');
    await fireWindowEvent(page, 'focus');
    await page.getByRole('button', { name: 'Abandonner' }).tap();
    await page.getByRole('button', { name: 'Non' }).tap();
    await expect(PAUSE_DIALOG(page)).toBeVisible();
    await expect(page.getByText('Partie mise en pause')).toBeVisible();
    // Même chemin avec Échap, puis une pause manuelle n'affiche pas la mention.
    await page.getByRole('button', { name: 'Abandonner' }).tap();
    await page.keyboard.press('Escape');
    await expect(page.getByText('Partie mise en pause')).toBeVisible();
    await page.getByRole('button', { name: 'Reprendre' }).tap();
    await runFor(page, 3100);
    await page.getByRole('button', { name: 'Pause', exact: true }).tap();
    await expect(PAUSE_DIALOG(page)).toBeVisible();
    await expect(page.getByText('Partie mise en pause')).toHaveCount(0);
  });

  test('hors partie, une perte du premier plan ne change rien', async ({ page }) => {
    const problems = watchProblems(page);
    await openGame(page);
    await setVisibility(page, false);
    await setVisibility(page, true);
    await fireWindowEvent(page, 'blur');
    await fireWindowEvent(page, 'focus');
    await expect(page.getByRole('button', { name: 'Jouer' })).toBeVisible();
    expect(problems).toEqual([]);
  });
});

test.describe('ct_09_ecran_allume : verrou d’écran pendant la partie (RG-10)', () => {
  test('demandé au début, tenu pendant la partie, relâché en pause, redemandé à la reprise et rendu à la fin', async ({
    page,
  }) => {
    const problems = watchProblems(page);
    await installWakeLockProbe(page);
    await openGame(page, { seed: 1 });
    expect(await wakeLockReport(page)).toEqual({ requests: 0, held: 0 });
    await startClassic(page);
    await expect.poll(() => wakeLockReport(page)).toEqual({ requests: 1, held: 1 });
    await runFor(page, 50);
    await skipCountdown(page);
    await runFor(page, 1500);
    expect(await wakeLockReport(page)).toEqual({ requests: 1, held: 1 });

    await page.getByRole('button', { name: 'Pause', exact: true }).tap();
    await expect.poll(() => wakeLockReport(page)).toEqual({ requests: 1, held: 0 });
    await runFor(page, 10_000);
    expect((await wakeLockReport(page)).held).toBe(0);

    await page.getByRole('button', { name: 'Reprendre' }).tap();
    await expect.poll(() => wakeLockReport(page)).toEqual({ requests: 2, held: 1 });

    await skipCountdown(page);
    await page.getByRole('button', { name: 'Pause', exact: true }).tap();
    await page.getByRole('button', { name: 'Abandonner' }).tap();
    await page.getByRole('button', { name: 'Oui' }).tap();
    await expect(page.locator('.end')).toBeVisible();
    expect((await wakeLockReport(page)).held).toBe(0);
    expect(problems).toEqual([]);
  });

  test('une perte du premier plan relâche le verrou ; il est redemandé quand le joueur reprend', async ({
    page,
  }) => {
    await installWakeLockProbe(page);
    await startRunning(page);
    await fireWindowEvent(page, 'blur');
    await expect.poll(() => wakeLockReport(page)).toEqual({ requests: 1, held: 0 });
    await fireWindowEvent(page, 'focus');
    await page.getByRole('button', { name: 'Reprendre' }).tap();
    await expect.poll(() => wakeLockReport(page)).toEqual({ requests: 2, held: 1 });
  });

  test('sans l’API (iPhone avant iOS 18.4) : aucune erreur, et la mise en veille met la partie en pause', async ({
    page,
  }) => {
    const problems = watchProblems(page);
    await installWakeLockProbe(page, false);
    expect(await page.evaluate(() => 'wakeLock' in navigator)).toBe(false);
    await startRunning(page);
    await setVisibility(page, false);
    await setVisibility(page, true);
    await expect(PAUSE_DIALOG(page)).toBeVisible();
    await page.getByRole('button', { name: 'Reprendre' }).tap();
    await skipCountdown(page);
    expect(problems).toEqual([]);
  });
});

test.describe('ct_49_audio_hors_premier_plan : la musique suit le premier plan et la pause (EF-22 CA-3)', () => {
  test('menu : la musique démarre au premier geste, s’arrête hors du premier plan et ne reprend qu’au retour', async ({
    page,
  }) => {
    const problems = watchProblems(page);
    await installAudioProbe(page);
    await installVibrationProbe(page);
    await openGame(page);
    // Avant tout geste, aucun contexte audio : le navigateur l'interdirait.
    expect((await audioReport(page)).contexts).toBe(0);
    await page.getByRole('button', { name: 'Records' }).tap();
    await expect.poll(async () => (await audioReport(page)).musicNotes).toBeGreaterThan(0);
    expect((await audioReport(page)).contexts).toBe(1);

    await setVisibility(page, false);
    const hidden = await audioReport(page);
    expect(hidden.calls.at(-1)).toBe('suspend');
    expect(hidden.musicStops).toBeGreaterThan(0);
    await runFor(page, 30_000);
    expect((await audioReport(page)).musicNotes).toBe(hidden.musicNotes);

    await setVisibility(page, true);
    await expect
      .poll(async () => (await audioReport(page)).musicNotes)
      .toBeGreaterThan(hidden.musicNotes);
    expect((await audioReport(page)).calls.at(-1)).toBe('resume');
    expect(await vibrations(page)).toEqual([]);
    expect(problems).toEqual([]);
  });

  test('partie : la musique joue, s’arrête en pause (même après une minute) et repart à « Reprendre »', async ({
    page,
  }) => {
    await installAudioProbe(page);
    await startRunning(page);
    await runFor(page, 1500);
    await page.getByRole('button', { name: 'Pause', exact: true }).tap();
    const paused = await audioReport(page);
    expect(paused.musicNotes).toBeGreaterThan(0);
    await runFor(page, 60_000);
    expect((await audioReport(page)).musicNotes).toBe(paused.musicNotes);
    await page.getByRole('button', { name: 'Reprendre' }).tap();
    await expect
      .poll(async () => (await audioReport(page)).musicNotes)
      .toBeGreaterThan(paused.musicNotes);
  });
});

test('ct_61_pause_automatique : E3 Partie en pause automatique, sans violation d’accessibilité sérieuse', async ({
  page,
}) => {
  await startRunning(page);
  await fireWindowEvent(page, 'blur');
  await expect(PAUSE_DIALOG(page)).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);
});
