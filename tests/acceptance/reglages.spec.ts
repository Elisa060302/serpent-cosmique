import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createGame, step } from '../../src/core/engine.ts';
import { CLASSIC } from '../../src/core/modes/classic.ts';
import { AUDIO, VIBRATION_MS } from '../../src/core/rules.ts';
import {
  eatNextCandy,
  openGame,
  runFor,
  seriousViolations,
  startRunning,
  waitForEndScreen,
  watchProblems,
} from './support/jeu.ts';
import {
  launchProfile,
  newProfileDirectory,
  readProgress,
  removeProfileDirectories,
} from './support/sauvegarde.ts';
import {
  audioReport,
  installAudioProbe,
  installVibrationProbe,
  vibrations,
} from './support/sondes.ts';

test.afterEach(() => {
  removeProfileDirectories();
});

async function openSettings(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Réglages' }).tap();
  await expect(page.getByRole('heading', { name: 'Réglages', level: 1 })).toBeVisible();
}

const control = (page: Page, name: 'Glissement' | 'Flèches') => page.getByRole('radio', { name });
const toggle = (page: Page, name: 'Bruitages' | 'Musique' | 'Vibrations') =>
  page.getByRole('switch', { name });

async function expectDefaults(page: Page): Promise<void> {
  await expect(control(page, 'Glissement')).toBeChecked();
  await expect(control(page, 'Flèches')).not.toBeChecked();
  for (const name of ['Bruitages', 'Musique', 'Vibrations'] as const) {
    await expect(toggle(page, name)).toBeChecked();
  }
}

test('ct_46_reglages : valeurs par défaut au premier lancement, état écrit, aide, aucune erreur (EF-21 CA-2)', async ({
  page,
}) => {
  const problems = watchProblems(page);
  await installVibrationProbe(page);
  await openGame(page);
  expect(await readProgress(page)).toBeNull();
  await openSettings(page);
  await expectDefaults(page);
  // L'état est écrit en toutes lettres, pas seulement dessiné (ENF-12).
  await expect(page.getByText('Activés', { exact: true })).toBeVisible();
  await expect(page.getByText('Activée', { exact: true })).toBeVisible();
  await expect(page.getByText('Activées', { exact: true })).toBeVisible();
  await expect(page.getByText("Le changement s'applique à la prochaine partie.")).toBeVisible();
  await expect(page.getByText('Avec les flèches, la grille est un peu plus petite.')).toBeVisible();
  // Rôles : un groupe de choix pour la commande, des interrupteurs pour les trois sons.
  await expect(page.getByRole('radiogroup', { name: 'Commande' })).toBeVisible();
  await expect(page.getByRole('switch')).toHaveCount(3);
  // Rien n'est enregistré tant que le joueur n'a rien changé.
  expect(await readProgress(page)).toBeNull();
  expect(problems).toEqual([]);
});

test('ct_46_reglages : toucher la ligne bascule le réglage, texte et état suivent, enregistré aussitôt (RG-62, RG-83)', async ({
  page,
}) => {
  await openGame(page);
  await openSettings(page);
  await toggle(page, 'Musique').tap();
  await expect(toggle(page, 'Musique')).not.toBeChecked();
  await expect(page.getByText('Coupée', { exact: true })).toBeVisible();
  await expect(page.getByText('Activée', { exact: true })).toHaveCount(0);
  await expect.poll(async () => (await readProgress(page))?.settings.music).toBe(false);
  await toggle(page, 'Musique').tap();
  await expect(page.getByText('Activée', { exact: true })).toBeVisible();
  await expect.poll(async () => (await readProgress(page))?.settings.music).toBe(true);
  await toggle(page, 'Bruitages').tap();
  await expect(page.getByText('Coupés', { exact: true })).toBeVisible();
  await toggle(page, 'Vibrations').tap();
  await expect(page.getByText('Coupées', { exact: true })).toBeVisible();
  await expect
    .poll(async () => (await readProgress(page))?.settings)
    .toEqual({ control: 'swipe', sounds: false, music: true, vibrations: false });
});

test('ct_46_reglages : le groupe « Commande » suit le motif des boutons radio : un seul arrêt de tabulation, flèches du clavier (EF-21, ENF-12)', async ({
  page,
}) => {
  await openGame(page);
  await openSettings(page);
  const swipe = control(page, 'Glissement');
  const arrows = control(page, 'Flèches');
  await expect(swipe).toHaveAttribute('tabindex', '0');
  await expect(arrows).toHaveAttribute('tabindex', '-1');
  await swipe.focus();
  await page.keyboard.press('ArrowRight');
  await expect(arrows).toBeChecked();
  await expect(arrows).toBeFocused();
  await expect(arrows).toHaveAttribute('tabindex', '0');
  await expect(swipe).toHaveAttribute('tabindex', '-1');
  await expect.poll(async () => (await readProgress(page))?.settings.control).toBe('arrows');
  // La liste est circulaire, dans les deux sens.
  await page.keyboard.press('ArrowDown');
  await expect(swipe).toBeChecked();
  await expect(swipe).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(arrows).toBeChecked();
  await page.keyboard.press('ArrowUp');
  await expect(swipe).toBeChecked();
  await expect.poll(async () => (await readProgress(page))?.settings.control).toBe('swipe');
});

test('ct_46_reglages : EF-21 CA-1 — Flèches et musique coupée, partie, arrêt brutal, réouverture : réglages conservés', async () => {
  const directory = newProfileDirectory();
  const context = await launchProfile(directory);
  const page = await context.newPage();
  await installAudioProbe(page);
  await openGame(page, { seed: 1 });
  await openSettings(page);
  await control(page, 'Flèches').tap();
  await toggle(page, 'Musique').tap();
  // La musique du menu a démarré au premier toucher ; coupée, elle ne reprend plus.
  const silent = (await audioReport(page)).musicNotes;
  await page.getByRole('button', { name: '‹ Retour' }).tap();
  await page.getByRole('button', { name: 'Jouer' }).tap();
  await page.getByRole('button', { name: 'Classique' }).tap();
  // Les flèches s'affichent et aucune musique ne joue.
  for (const name of ['Haut', 'Bas', 'Gauche', 'Droite']) {
    await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
  }
  await runFor(page, 1500);
  expect((await audioReport(page)).musicNotes).toBe(silent);
  // L'écran de pause ne propose pas les réglages (RG-65).
  await page.getByRole('button', { name: 'Pause', exact: true }).tap();
  await expect(page.getByRole('dialog', { name: 'Pause' }).getByRole('button')).toHaveText([
    'Reprendre',
    'Abandonner',
  ]);
  await expect(page.getByRole('button', { name: 'Réglages' })).toHaveCount(0);
  await expect
    .poll(async () => (await readProgress(page))?.settings)
    .toEqual({ control: 'arrows', sounds: true, music: false, vibrations: true });

  // Fermeture forcée juste après le réglage, puis réouverture.
  await context.close();
  const reopened = await launchProfile(directory);
  const next = await reopened.newPage();
  await installAudioProbe(next);
  await openGame(next, { seed: 1 });
  // La partie mise en pause avant la fermeture forcée est clôturée au lancement (RG-79) ; à 0 point, aucun record.
  await next.getByRole('button', { name: 'Continuer' }).tap();
  await openSettings(next);
  await expect(control(next, 'Flèches')).toBeChecked();
  await expect(toggle(next, 'Musique')).not.toBeChecked();
  await expect(toggle(next, 'Bruitages')).toBeChecked();
  await expect(toggle(next, 'Vibrations')).toBeChecked();
  await next.getByRole('button', { name: '‹ Retour' }).tap();
  await next.getByRole('button', { name: 'Jouer' }).tap();
  await next.getByRole('button', { name: 'Classique' }).tap();
  await expect(next.getByRole('button', { name: 'Haut', exact: true })).toBeVisible();
  await runFor(next, 4000);
  expect((await audioReport(next)).musicNotes).toBe(0);
  await reopened.close();
});

test('ct_46_reglages : la commande choisie s’applique à la partie suivante et revient au glissement', async ({
  page,
}) => {
  await openGame(page, { seed: 1, control: 'arrows' });
  await page.getByRole('button', { name: 'Jouer' }).tap();
  await page.getByRole('button', { name: 'Classique' }).tap();
  await expect(page.getByRole('button', { name: 'Haut', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Pause', exact: true }).tap();
  await page.getByRole('button', { name: 'Abandonner' }).tap();
  await page.getByRole('button', { name: 'Oui' }).tap();
  await page.getByRole('button', { name: 'Menu' }).tap();
  await openSettings(page);
  await control(page, 'Glissement').tap();
  await page.getByRole('button', { name: '‹ Retour' }).tap();
  await page.getByRole('button', { name: 'Jouer' }).tap();
  await page.getByRole('button', { name: 'Classique' }).tap();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Haut', exact: true })).toHaveCount(0);
});

test('ct_47_vibrations_indisponibles : réglage grisé, explication lisible, aucune erreur (EF-21 CA-3)', async ({
  page,
}) => {
  const problems = watchProblems(page);
  await installVibrationProbe(page, false);
  await openGame(page, { seed: 1 });
  await openSettings(page);
  await expect(toggle(page, 'Vibrations')).toBeDisabled();
  await expect(page.getByText('Non disponible sur ce téléphone')).toBeVisible();
  await expect(toggle(page, 'Bruitages')).toBeEnabled();
  expect(await seriousViolations(page)).toEqual([]);
  // Une partie jusqu'à la collision se déroule sans erreur.
  await page.getByRole('button', { name: '‹ Retour' }).tap();
  await page.getByRole('button', { name: 'Jouer' }).tap();
  await page.getByRole('button', { name: 'Classique' }).tap();
  await runFor(page, 50);
  await waitForEndScreen(page);
  await expect(page.locator('.end-reason')).toHaveText('Collision');
  expect(problems).toEqual([]);
});

test('ct_109_roles_et_etats : E9 Réglages sans violation d’accessibilité sérieuse, vibrations disponibles', async ({
  page,
}) => {
  await installVibrationProbe(page);
  await openGame(page);
  await openSettings(page);
  expect(await seriousViolations(page)).toEqual([]);
  await toggle(page, 'Musique').tap();
  await control(page, 'Flèches').tap();
  expect(await seriousViolations(page)).toEqual([]);
});

test('ct_46_reglages : « Retour » rend le focus au bouton « Réglages » et le retour du téléphone aussi', async ({
  page,
}) => {
  await openGame(page);
  await openSettings(page);
  await expect(page.getByRole('button', { name: '‹ Retour' })).toBeFocused();
  await page.getByRole('button', { name: '‹ Retour' }).tap();
  await expect(page.getByRole('button', { name: 'Réglages' })).toBeFocused();
  await openSettings(page);
  await page.goBack();
  await expect(page.getByRole('button', { name: 'Réglages' })).toBeFocused();
  await openSettings(page);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Réglages' })).toBeFocused();
});

/** Mange un bonbon avec le pilote, puis laisse le serpent heurter le bord. */
async function eatOneThenCrash(page: Page): Promise<void> {
  const oracle = createGame(CLASSIC, 1);
  step(oracle);
  await eatNextCandy(page, oracle);
  await waitForEndScreen(page);
}

const hz = (notes: readonly { hz: number }[]): number[] => notes.map((note) => note.hz);

test.describe('ct_48_sons_et_vibrations : chaque catégorie suit son réglage (EF-22 CA-1, CA-2)', () => {
  test('tout activé : bruitage du bonbon, de la fin, du record ; 300 ms à la collision ; musique audible', async ({
    page,
  }) => {
    const problems = watchProblems(page);
    await installAudioProbe(page);
    await installVibrationProbe(page);
    await startRunning(page);
    await eatOneThenCrash(page);
    await expect(page.locator('.end-reason')).toHaveText('Collision');
    const report = await audioReport(page);
    expect(report.effects).toEqual([
      ...hz(AUDIO.sfx.candy),
      ...hz(AUDIO.sfx.end),
      ...hz(AUDIO.sfx.record),
    ]);
    expect(report.musicNotes).toBeGreaterThan(0);
    expect(await vibrations(page)).toEqual([VIBRATION_MS.collision]);
    expect(problems).toEqual([]);
  });

  test('abandon : le bruitage de fin est joué (RG-66), aucune vibration (RG-66 : collision seulement)', async ({
    page,
  }) => {
    await installAudioProbe(page);
    await installVibrationProbe(page);
    await startRunning(page);
    await page.getByRole('button', { name: 'Pause', exact: true }).tap();
    await page.getByRole('button', { name: 'Abandonner' }).tap();
    await page.getByRole('button', { name: 'Oui' }).tap();
    await expect(page.locator('.end-reason')).toHaveText('Partie abandonnée');
    expect((await audioReport(page)).effects).toEqual(hz(AUDIO.sfx.end));
    expect(await vibrations(page)).toEqual([]);
  });

  test('musique coupée, bruitages actifs : un bruitage au bonbon, aucune note de musique', async ({
    page,
  }) => {
    await installAudioProbe(page);
    await installVibrationProbe(page);
    await openGame(page, { seed: 1 });
    await openSettings(page);
    await toggle(page, 'Musique').tap();
    const silent = (await audioReport(page)).musicNotes;
    await page.getByRole('button', { name: '‹ Retour' }).tap();
    await page.getByRole('button', { name: 'Jouer' }).tap();
    await page.getByRole('button', { name: 'Classique' }).tap();
    await runFor(page, 50);
    await runFor(page, 3100);
    const oracle = createGame(CLASSIC, 1);
    await eatNextCandy(page, oracle);
    const report = await audioReport(page);
    expect(report.effects).toEqual(hz(AUDIO.sfx.candy));
    expect(report.musicNotes).toBe(silent);
  });

  test('bruitages coupés : la musique joue, aucun bruitage, vibration inchangée', async ({
    page,
  }) => {
    await installAudioProbe(page);
    await installVibrationProbe(page);
    await openGame(page, { seed: 1 });
    await openSettings(page);
    await toggle(page, 'Bruitages').tap();
    await page.getByRole('button', { name: '‹ Retour' }).tap();
    await page.getByRole('button', { name: 'Jouer' }).tap();
    await page.getByRole('button', { name: 'Classique' }).tap();
    await runFor(page, 50);
    await waitForEndScreen(page);
    const report = await audioReport(page);
    expect(report.effects).toEqual([]);
    expect(report.musicNotes).toBeGreaterThan(0);
    expect(await vibrations(page)).toEqual([VIBRATION_MS.collision]);
  });

  test('vibrations coupées : le téléphone ne vibre pas à la collision, les sons restent', async ({
    page,
  }) => {
    await installAudioProbe(page);
    await installVibrationProbe(page);
    await openGame(page, { seed: 1 });
    await openSettings(page);
    await toggle(page, 'Vibrations').tap();
    await page.getByRole('button', { name: '‹ Retour' }).tap();
    await page.getByRole('button', { name: 'Jouer' }).tap();
    await page.getByRole('button', { name: 'Classique' }).tap();
    await runFor(page, 50);
    await waitForEndScreen(page);
    expect(await vibrations(page)).toEqual([]);
    expect((await audioReport(page)).effects).toContain(AUDIO.sfx.end[0]?.hz);
  });

  test('la musique s’arrête dès qu’elle est coupée, sans attendre la partie suivante', async ({
    page,
  }) => {
    await installAudioProbe(page);
    await openGame(page);
    await page.getByRole('button', { name: 'Records' }).tap();
    await expect.poll(async () => (await audioReport(page)).musicNotes).toBeGreaterThan(0);
    await page.getByRole('button', { name: '‹ Retour' }).tap();
    await openSettings(page);
    const stops = (await audioReport(page)).musicStops;
    await toggle(page, 'Musique').tap();
    expect((await audioReport(page)).musicStops).toBeGreaterThan(stops);
    const notes = (await audioReport(page)).musicNotes;
    await runFor(page, 30_000);
    expect((await audioReport(page)).musicNotes).toBe(notes);
    await toggle(page, 'Musique').tap();
    expect((await audioReport(page)).musicNotes).toBeGreaterThan(notes);
  });
});
