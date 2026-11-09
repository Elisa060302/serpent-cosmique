import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mergeProgress } from '../../src/core/merge.ts';
import { defaultProgress } from '../../src/core/progress.ts';
import { MODE_IDS } from '../../src/core/rules.ts';
import { backupFileName, readBackup } from '../../src/core/savefile.ts';
import { inCatalogueOrder } from '../../src/core/skins.ts';
import type { ProgressData, RecordEntry } from '../../src/core/types.ts';
import { maximalProgress, validBackup } from '../fixtures/saves/corpus.ts';
import { openGame, seriousViolations, watchProblems } from './support/jeu.ts';
import {
  chooseFile,
  createBackupDownload,
  downloadOnly,
  downloadedText,
  existingFile,
  expectErrorIcon,
  failWrites,
  fakeSavePicker,
  openSave,
  setExistingFile,
  setPickerBehavior,
  writeCount,
  writeProbe,
  writtenFiles,
} from './support/fichiers.ts';
import {
  launchProfile,
  newProfileDirectory,
  progressWith,
  readProgress,
  readStorage,
  removeProfileDirectories,
  seedStorage,
} from './support/sauvegarde.ts';

test.afterEach(() => {
  removeProfileDirectories();
});

const E01 =
  "Ce fichier n'est pas une sauvegarde valide de Serpent Cosmique. Rien n'a été modifié. (E-01)";
const E03 =
  "Espace de stockage insuffisant : la sauvegarde n'a pas été créée. Libérez de la place et réessayez. Votre progression est intacte. (E-03)";
const E04 =
  "La sauvegarde n'a pas pu être écrite à cet endroit. Votre progression est intacte. (E-04)";
const E07 = "La restauration n'a pas pu être enregistrée. Votre progression n'a pas changé. (E-07)";
const FILE_NAME = /^serpent-cosmique-sauvegarde-\d{4}-\d{2}-\d{2}-\d{4}(-\d+)?\.json$/;

function record(name: string, score: number, day: number): RecordEntry {
  return { name, score, dateTime: `2026-10-${String(day).padStart(2, '0')}T10:00:00` };
}

/** Progression fictive du téléphone d'origine : records, skins, réglage « Flèches ». */
function origin(): ProgressData {
  return progressWith((progress) => {
    progress.records.classic = [record('Zoé', 40, 5), record('Ana', 20, 6)];
    progress.records.zen = [record('Zoé', 80, 7)];
    progress.lastName = 'Zoé';
    // Déblocages cohérents avec les records et les compteurs, dans l'ordre du catalogue.
    progress.skins.unlocked = inCatalogueOrder([
      ...progress.skins.unlocked,
      'shape-comet',
      'pattern-dots',
      'trail-stardust',
      'trail-aurora',
    ]);
    progress.skins.selected.pattern = 'pattern-dots';
    progress.counters.totalCandies = 130;
    progress.counters.gamesByMode.classic = 4;
    progress.counters.gamesByMode.zen = 1;
    progress.settings = { control: 'arrows', sounds: false, music: true, vibrations: true };
  });
}

async function openWithStorage(page: Page, progress: ProgressData | undefined): Promise<void> {
  if (progress !== undefined) await seedStorage(page, { progress });
  await openGame(page);
}

const toast = (page: Page) => page.locator('.toast');
const summary = (page: Page) => page.getByRole('dialog');

test.describe('ct_50_creation_sauvegarde : fichier téléchargé, nom, message, contenu, doublon', () => {
  test('deux touchers, nom conforme à RG-68, contenu exactement conforme au schéma, seconde sauvegarde en -2', async ({
    page,
  }) => {
    const problems = watchProblems(page);
    await downloadOnly(page);
    const progress = origin();
    await openWithStorage(page, progress);
    const stored = await readStorage(page);

    await page.getByRole('button', { name: 'Sauvegarde', exact: true }).tap();
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Créer une sauvegarde' }).tap();
    const first = await downloading;
    const name = first.suggestedFilename();
    expect(name).toMatch(FILE_NAME);
    await expect(toast(page)).toHaveText(`Sauvegarde créée : ${name}`);
    await expect(page.getByRole('status')).toHaveText(`Sauvegarde créée : ${name}`);

    const text = await downloadedText(first);
    const parsed = JSON.parse(text) as Record<string, unknown>;
    expect(Object.keys(parsed)).toEqual([
      'format',
      'formatVersion',
      'createdAt',
      'data',
      'checksum',
    ]);
    expect(parsed['data']).toEqual(JSON.parse(JSON.stringify(progress)));
    expect(name).toBe(backupFileName(parsed['createdAt'] as string, new Set()));
    const digest = createHash('sha256').update(text).digest('hex');

    // Seconde sauvegarde dans la même minute (horloge arrêtée), sans fermer le jeu : « -2 », la première est intacte.
    const second = await createBackupDownload(page);
    expect(second.suggestedFilename()).toBe(name.replace('.json', '-2.json'));
    expect(
      createHash('sha256')
        .update(readFileSync(await first.path()))
        .digest('hex'),
    ).toBe(digest);
    const third = await createBackupDownload(page);
    expect(third.suggestedFilename()).toBe(name.replace('.json', '-3.json'));

    // La progression n'a pas été touchée.
    expect(await readStorage(page)).toEqual(stored);
    expect(problems).toEqual([]);
  });

  test('dix sauvegardes successives : dix fichiers de noms distincts, aucun fichier antérieur modifié ni supprimé', async ({
    page,
  }) => {
    const problems = watchProblems(page);
    await downloadOnly(page);
    await openWithStorage(page, origin());
    await openSave(page);
    const files: { name: string; path: string; digest: string }[] = [];
    const digestOf = (path: string): string =>
      createHash('sha256').update(readFileSync(path)).digest('hex');
    for (let index = 0; index < 10; index += 1) {
      const download = await createBackupDownload(page);
      const path = await download.path();
      files.push({ name: download.suggestedFilename(), path, digest: digestOf(path) });
      // Après chaque création, l'empreinte de tous les fichiers déjà créés est celle du moment de leur création.
      for (const file of files) expect(digestOf(file.path)).toBe(file.digest);
    }
    expect(new Set(files.map((file) => file.name)).size).toBe(10);
    for (const file of files) expect(file.name).toMatch(FILE_NAME);
    expect(files.map((file) => file.name).slice(1)).toEqual(
      Array.from({ length: 9 }, (_, index) =>
        (files[0]?.name ?? '').replace('.json', `-${index + 2}.json`),
      ),
    );
    expect(problems).toEqual([]);
  });

  test('sur iPhone, l’aide « Enregistrer dans Fichiers » ; sur tout téléphone, la prudence sur les fichiers inconnus', async ({
    page,
  }) => {
    await downloadOnly(page);
    await openGame(page);
    await openSave(page);
    await expect(
      page.getByText("Dans la fenêtre qui s'ouvre, choisissez « Enregistrer dans Fichiers »."),
    ).toHaveCount(0);
    await expect(
      page.getByText('Ne restaurez que des fichiers que vous avez créés vous-même.'),
    ).toBeVisible();
    await expect(
      page.getByText('Enregistre vos records, skins et réglages dans un fichier.'),
    ).toBeVisible();
  });

  test('une sauvegarde sans progression (premier lancement) est créée et reste valide', async ({
    page,
  }) => {
    await downloadOnly(page);
    await openGame(page);
    await openSave(page);
    const download = await createBackupDownload(page);
    const parsed = JSON.parse(await downloadedText(download)) as { data: ProgressData };
    expect(parsed.data).toEqual(defaultProgress());
    expect(await readStorage(page)).toEqual({});
  });
});

test.describe('iPhone', () => {
  test.use({
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  });

  test('ct_50_creation_sauvegarde : l’aide « Enregistrer dans Fichiers » est affichée', async ({
    page,
  }) => {
    await downloadOnly(page);
    await openGame(page);
    await openSave(page);
    await expect(
      page.getByText("Dans la fenêtre qui s'ouvre, choisissez « Enregistrer dans Fichiers »."),
    ).toBeVisible();
    await expect(
      page.getByText('Ne restaurez que des fichiers que vous avez créés vous-même.'),
    ).toBeVisible();
  });
});

test.describe('ct_51_sauvegarde_erreurs : E-03, E-04, annulation (sélecteur d’enregistrement simulé)', () => {
  test('E-03, E-04 durables avec « Réessayer », annulation sans message, progression identique', async ({
    page,
  }) => {
    const problems = watchProblems(page);
    await fakeSavePicker(page);
    await openWithStorage(page, origin());
    const stored = await readStorage(page);
    await openSave(page);
    const create = page.getByRole('button', { name: 'Créer une sauvegarde' });

    // E-03 : manque de place.
    await setPickerBehavior(page, 'quota');
    await create.tap();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(E03, { exact: true })).toBeVisible();
    await expectErrorIcon(page);
    await expect(dialog.getByRole('button')).toHaveText(['Réessayer']);
    await expect(toast(page)).toHaveCount(0);
    // L'erreur reste affichée tant que le joueur n'a pas agi.
    await page.clock.runFor(30_000);
    await expect(dialog.getByText(E03, { exact: true })).toBeVisible();
    // « Réessayer » relance la sauvegarde : le sélecteur réussit cette fois.
    await setPickerBehavior(page, 'ok');
    await dialog.getByRole('button', { name: 'Réessayer' }).tap();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(toast(page)).toHaveText(/^Sauvegarde créée : serpent-cosmique-sauvegarde-/);
    expect(await writtenFiles(page)).toHaveLength(1);

    // E-04 : écriture refusée ailleurs.
    await setPickerBehavior(page, 'denied');
    await create.tap();
    await expect(page.getByRole('dialog').getByText(E04, { exact: true })).toBeVisible();
    await expectErrorIcon(page);
    await expect(page.getByRole('dialog').getByRole('button')).toHaveText(['Réessayer']);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // Annulation du choix de l'emplacement : aucun message.
    await setPickerBehavior(page, 'cancel');
    await create.tap();
    await page.clock.runFor(100);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(await writtenFiles(page)).toHaveLength(1);

    expect(await readStorage(page)).toEqual(stored);
    expect(problems).toEqual([]);
  });

  test('remplacement confirmé : le fichier choisi par le joueur contient la nouvelle sauvegarde, restaurable', async ({
    page,
  }) => {
    const problems = watchProblems(page);
    await fakeSavePicker(page);
    const progress = origin();
    await openWithStorage(page, progress);
    const stored = await readStorage(page);
    await setExistingFile(page, 'ancienne-sauvegarde.json', '{"ancien":"contenu"}');
    await setPickerBehavior(page, 'replace');
    await openSave(page);
    await page.getByRole('button', { name: 'Créer une sauvegarde' }).tap();
    await expect(toast(page)).toHaveText('Sauvegarde créée : ancienne-sauvegarde.json');

    const replaced = await existingFile(page);
    expect(replaced.content).not.toBe('{"ancien":"contenu"}');
    expect(await writtenFiles(page)).toEqual([replaced.content]);
    const reading = await readBackup(replaced.content, new Date());
    expect(reading.status).toBe('valid');
    // Le fichier remplacé se restaure : le résumé de la fusion s'affiche.
    await chooseFile(page, { bytes: Buffer.from(replaced.content, 'utf-8') });
    await expect(summary(page)).toContainText('Fusionner avec la progression de ce téléphone ?');
    await summary(page).getByRole('button', { name: 'Annuler' }).tap();
    expect(await readStorage(page)).toEqual(stored);
    expect(problems).toEqual([]);
  });

  test('remplacement refusé : le fichier existant est intact, rien n’est écrit, aucun message', async ({
    page,
  }) => {
    const problems = watchProblems(page);
    await fakeSavePicker(page);
    await openWithStorage(page, origin());
    const stored = await readStorage(page);
    const content = '{"ancien":"contenu"}';
    await setExistingFile(page, 'ancienne-sauvegarde.json', content);
    const fingerprint = createHash('sha256').update(content).digest('hex');
    await setPickerBehavior(page, 'refuse');
    await openSave(page);
    await page.getByRole('button', { name: 'Créer une sauvegarde' }).tap();
    await page.clock.runFor(100);

    const existing = await existingFile(page);
    expect(createHash('sha256').update(existing.content).digest('hex')).toBe(fingerprint);
    expect(await writtenFiles(page)).toEqual([]);
    await expect(toast(page)).toHaveCount(0);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(await readStorage(page)).toEqual(stored);
    expect(problems).toEqual([]);
  });

  test('sans sélecteur (téléchargement) : jamais de remplacement ni de demande, noms distincts, premier fichier inchangé', async ({
    page,
  }) => {
    const problems = watchProblems(page);
    await downloadOnly(page);
    await openWithStorage(page, origin());
    await openSave(page);
    const first = await createBackupDownload(page);
    const before = createHash('sha256')
      .update(readFileSync(await first.path()))
      .digest('hex');
    const second = await createBackupDownload(page);
    expect(second.suggestedFilename()).not.toBe(first.suggestedFilename());
    expect(
      createHash('sha256')
        .update(readFileSync(await first.path()))
        .digest('hex'),
    ).toBe(before);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(problems).toEqual([]);
  });

  test('le fichier écrit par le sélecteur est la sauvegarde complète, sous le nom proposé', async ({
    page,
  }) => {
    await fakeSavePicker(page);
    await openWithStorage(page, origin());
    await openSave(page);
    await page.getByRole('button', { name: 'Créer une sauvegarde' }).tap();
    await expect(toast(page)).toHaveText(/^Sauvegarde créée : /);
    const [written] = await writtenFiles(page);
    const parsed = JSON.parse(written ?? '{}') as { data: unknown };
    expect(parsed.data).toEqual(JSON.parse(JSON.stringify(origin())));
  });
});

test.describe('ct_52_restauration_nominale : SCN-04, un autre téléphone', () => {
  test('résumé, focus sur « Annuler », fusion, message de 6 s, progression identique, en 3 s au plus', async ({
    page,
    baseURL,
  }) => {
    await downloadOnly(page);
    const progress = origin();
    await openWithStorage(page, progress);
    await openSave(page);
    const backup = await downloadedText(await createBackupDownload(page));

    const other = await launchProfile(newProfileDirectory(), baseURL);
    const phone = await other.newPage();
    const problems = watchProblems(phone);
    await openGame(phone);
    expect(await readProgress(phone)).toBeNull();
    await phone.getByRole('button', { name: 'Sauvegarde', exact: true }).tap();
    await chooseFile(phone, { bytes: Buffer.from(backup) });

    const dialog = summary(phone);
    await expect(dialog.getByRole('heading', { level: 2 })).toHaveText(
      /^Sauvegarde du \d{2}\/\d{2}\/\d{4} à \d{2}:\d{2}$/,
    );
    await expect(dialog.getByText('3 records, 8 skins débloqués.')).toBeVisible();
    await expect(dialog.getByText('Fusionner avec la progression de ce téléphone ?')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Annuler' })).toBeFocused();
    expect(await readProgress(phone)).toBeNull();

    const started = Date.now();
    await dialog.getByRole('button', { name: 'Fusionner' }).tap();
    const message = 'Restauration terminée : 3 records, 8 skins débloqués.';
    await expect(toast(phone)).toHaveText(message);
    expect(Date.now() - started).toBeLessThan(3000);
    await expect(phone.getByRole('status')).toHaveText(message);
    await expect(phone.getByRole('dialog')).toHaveCount(0);
    expect(await readProgress(phone)).toEqual(JSON.parse(JSON.stringify(progress)));
    // Le message reste 6 s.
    await phone.clock.runFor(5800);
    await expect(toast(phone)).toBeVisible();
    await phone.clock.runFor(400);
    await expect(toast(phone)).toHaveCount(0);

    expect(problems).toEqual([]);
    await other.close();
  });
});

test.describe('ct_53_fusion_regles : records, compteurs, idempotence', () => {
  test('6 + 7 records dont 2 communs : les 10 meilleurs des 11 ; une seconde restauration ne change rien', async ({
    page,
  }) => {
    const shared = [record('Léa', 30, 3), record('Max', 25, 4)];
    const local = progressWith((p) => {
      p.records.classic = [
        record('Zoé', 40, 5),
        ...shared,
        record('Ana', 20, 6),
        record('Bob', 15, 7),
        record('Cyd', 9, 8),
      ];
      p.counters.totalCandies = 200;
      p.lastName = 'Local';
    });
    const incoming = progressWith((p) => {
      p.records.classic = [
        record('Dan', 50, 9),
        ...shared,
        record('Eve', 22, 10),
        record('Fay', 12, 11),
        record('Gus', 8, 12),
        record('Hal', 3, 13),
      ];
      p.counters.totalCandies = 90;
      p.counters.gamesByMode.classic = 5;
      p.lastName = 'Fichier';
      p.settings.control = 'arrows';
    });
    await openWithStorage(page, local);
    await openSave(page);
    const file = Buffer.from(await validBackup(incoming));
    await chooseFile(page, { bytes: file });
    await summary(page).getByRole('button', { name: 'Fusionner' }).tap();
    await expect(toast(page)).toHaveText(
      /^Restauration terminée : 10 records, 7 skins débloqués\.$/,
    );
    const merged = await readProgress(page);
    expect(merged?.records.classic.map((entry) => entry.score)).toEqual([
      50, 40, 30, 25, 22, 20, 15, 12, 9, 8,
    ]);
    expect(merged?.counters.totalCandies).toBe(200);
    expect(merged?.counters.gamesByMode.classic).toBe(5);
    expect(merged?.lastName).toBe('Fichier');
    expect(merged?.settings.control).toBe('arrows');
    expect(merged).toEqual(JSON.parse(JSON.stringify(mergeProgress(local, incoming))));

    // Seconde restauration du même fichier : rien ne change.
    await chooseFile(page, { bytes: file });
    await summary(page).getByRole('button', { name: 'Fusionner' }).tap();
    await expect(toast(page)).toHaveText(/^Restauration terminée/);
    expect(await readProgress(page)).toEqual(merged);
  });

  test('les skins débloqués sont réunis, jamais retirés, et les déblocages sont revérifiés (CT-44)', async ({
    page,
  }) => {
    const local = progressWith((p) => {
      p.skins.unlocked = [...p.skins.unlocked, 'trail-stardust'];
      p.counters.totalCandies = 100;
    });
    const incoming = progressWith((p) => {
      p.skins.unlocked = [...p.skins.unlocked, 'pattern-dots'];
      p.counters.totalCandies = 30;
    });
    await openWithStorage(page, local);
    await openSave(page);
    await chooseFile(page, { bytes: Buffer.from(await validBackup(incoming)) });
    await summary(page).getByRole('button', { name: 'Fusionner' }).tap();
    await expect(toast(page)).toBeVisible();
    const merged = await readProgress(page);
    expect(merged?.skins.unlocked).toEqual(
      expect.arrayContaining(['trail-stardust', 'pattern-dots']),
    );
    expect(merged?.skins.unlocked).toHaveLength(6);
  });

  test('un compteur de parties plus grand dans le fichier rend la découverte du mode surprise définitive', async ({
    page,
  }) => {
    const incoming = progressWith((p) => {
      for (const mode of MODE_IDS) p.counters.gamesByMode[mode] = 5;
    });
    await openWithStorage(page, undefined);
    await openSave(page);
    await chooseFile(page, { bytes: Buffer.from(await validBackup(incoming)) });
    await summary(page).getByRole('button', { name: 'Fusionner' }).tap();
    await expect(toast(page)).toBeVisible();
    const merged = await readProgress(page);
    for (const mode of MODE_IDS) expect(merged?.counters.gamesByMode[mode]).toBe(5);
    expect(merged?.skins.unlocked).toContain('decor-milky-way');
  });
});

test('ct_54_restauration_annulee : « Annuler » ne modifie rien', async ({ page }) => {
  const problems = watchProblems(page);
  await openWithStorage(page, origin());
  await openSave(page);
  const before = await readStorage(page);
  await chooseFile(page, { bytes: Buffer.from(await validBackup(progressWith(() => undefined))) });
  await expect(summary(page)).toBeVisible();
  await summary(page).getByRole('button', { name: 'Annuler' }).tap();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await readStorage(page)).toEqual(before);
  await expect(page.getByRole('button', { name: 'Restaurer une sauvegarde' })).toBeFocused();
  // Échap équivaut à « Annuler ».
  await chooseFile(page, { bytes: Buffer.from(await validBackup(progressWith(() => undefined))) });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await readStorage(page)).toEqual(before);
  expect(problems).toEqual([]);
});

test.describe('ct_116_restauration_e07 : restauration impossible à enregistrer', () => {
  test('E-07 à la place du succès, une seule écriture tentée, progression identique après réouverture', async ({
    baseURL,
  }) => {
    const directory = newProfileDirectory();
    const context = await launchProfile(directory, baseURL);
    const phone = await context.newPage();
    const problems = watchProblems(phone);
    await writeProbe(phone);
    const local = origin();
    await seedStorage(phone, { progress: local });
    await openGame(phone);
    const before = await readStorage(phone);
    await openSave(phone);
    const incoming = progressWith((p) => {
      p.records.asteroids = [record('Nova', 33, 9)];
      p.counters.totalCandies = 999;
    });
    await chooseFile(phone, { bytes: Buffer.from(await validBackup(incoming)) });
    await failWrites(phone, true);
    const writesBefore = await writeCount(phone);
    await summary(phone).getByRole('button', { name: 'Fusionner' }).tap();

    const dialog = phone.getByRole('dialog');
    await expect(dialog.getByText(E07, { exact: true })).toBeVisible();
    await expectErrorIcon(phone);
    await expect(dialog.getByRole('button')).toHaveText(['Compris']);
    await expect(phone.getByText(/Restauration terminée/)).toHaveCount(0);
    expect(await writeCount(phone)).toBe(writesBefore + 1);
    expect(await readStorage(phone)).toEqual(before);
    await dialog.getByRole('button', { name: 'Compris' }).tap();
    await expect(phone.getByRole('dialog')).toHaveCount(0);

    // Fermeture puis réouverture du jeu : la progression est celle d'avant la restauration.
    await failWrites(phone, false);
    await context.close();
    const reopened = await launchProfile(directory, baseURL);
    const again = await reopened.newPage();
    await openGame(again);
    expect(await readProgress(again)).toEqual(JSON.parse(JSON.stringify(local)));
    expect(problems).toEqual([]);
    await reopened.close();
  });

  test('la fusion réussie est écrite en une seule transaction', async ({ page }) => {
    await writeProbe(page);
    await openWithStorage(page, origin());
    await openSave(page);
    await chooseFile(page, { bytes: Buffer.from(await validBackup(maximalProgress())) });
    const writesBefore = await writeCount(page);
    await summary(page).getByRole('button', { name: 'Fusionner' }).tap();
    await expect(toast(page)).toBeVisible();
    expect(await writeCount(page)).toBe(writesBefore + 1);
    const { progress, progressPrevious } = await readStorage(page);
    // L'ancienne progression devient la version précédente (RG-84).
    expect((JSON.parse(progressPrevious ?? '{}') as { data: unknown }).data).toEqual(
      JSON.parse(JSON.stringify(origin())),
    );
    expect(
      (JSON.parse(progress ?? '{}') as { data: ProgressData }).data.counters.totalCandies,
    ).toBe(1_000_000_000);
  });
});

test('ct_58_donnees_maximales : fichier de 50 Ko, création en 2 s, restauration en 3 s', async ({
  page,
  baseURL,
}) => {
  await downloadOnly(page);
  const maximal = maximalProgress();
  await openWithStorage(page, maximal);
  await openSave(page);
  const created = Date.now();
  const download = await createBackupDownload(page);
  const text = await downloadedText(download);
  await expect(toast(page)).toBeVisible();
  expect(Date.now() - created).toBeLessThan(2000);
  expect(Buffer.byteLength(text)).toBeLessThanOrEqual(51_200);

  // Restauration sur un téléphone vierge : le jeu de données maximal est retrouvé.
  const other = await launchProfile(newProfileDirectory(), baseURL);
  const phone = await other.newPage();
  await openGame(phone);
  await openSave(phone);
  await chooseFile(phone, { bytes: Buffer.from(text) });
  const restored = Date.now();
  await summary(phone).getByRole('button', { name: 'Fusionner' }).tap();
  await expect(toast(phone)).toHaveText('Restauration terminée : 70 records, 16 skins débloqués.');
  expect(Date.now() - restored).toBeLessThan(3000);
  expect(await readProgress(phone)).toEqual(JSON.parse(JSON.stringify(maximal)));
  await other.close();
});

test.describe('blur du sélecteur de fichiers : aucune partie n’est en cours', () => {
  test('la perte puis le retour de la saisie laissent l’écran Sauvegarde intact, sans pause ni message', async ({
    page,
  }) => {
    const problems = watchProblems(page);
    await openWithStorage(page, origin());
    await openSave(page);
    await page.evaluate(() => {
      window.dispatchEvent(new Event('blur'));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(page.getByRole('heading', { name: 'Sauvegarde', level: 1 })).toBeVisible();
    await expect(page.getByText('Pause')).toHaveCount(0);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await chooseFile(page, { bytes: Buffer.from(await validBackup(origin())) });
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await expect(summary(page)).toBeVisible();
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(summary(page)).toBeVisible();
    await summary(page).getByRole('button', { name: 'Annuler' }).tap();
    expect(problems).toEqual([]);
  });
});

test.describe('navigation : le retour revient à l’écran d’origine', () => {
  test('« ‹ Retour » et le bouton retour du téléphone ramènent au menu, focus sur « Sauvegarde »', async ({
    page,
  }) => {
    await openGame(page);
    await openSave(page);
    await page.getByRole('button', { name: '‹ Retour' }).tap();
    await expect(page.getByRole('button', { name: 'Jouer' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sauvegarde', exact: true })).toBeFocused();
    await openSave(page);
    await page.goBack();
    await expect(page.getByRole('button', { name: 'Jouer' })).toBeVisible();
  });
});

test.describe('ct_117_analyse_axe : E11 Sauvegarde', () => {
  test('écran, résumé, messages E-01, E-02, E-03, E-04 et E-07', async ({ page }) => {
    await fakeSavePicker(page);
    await writeProbe(page);
    await openWithStorage(page, origin());
    await openSave(page);
    expect(await seriousViolations(page)).toEqual([]);

    await chooseFile(page, { bytes: Buffer.from(await validBackup(origin())) });
    await expect(summary(page)).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
    await failWrites(page, true);
    await summary(page).getByRole('button', { name: 'Fusionner' }).tap();
    await expect(page.getByText(E07, { exact: true })).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
    await page.getByRole('button', { name: 'Compris' }).tap();

    await chooseFile(page, { bytes: Buffer.from('pas une sauvegarde') });
    await expect(page.getByText(E01, { exact: true })).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
    await page.getByRole('button', { name: 'Compris' }).tap();

    await setPickerBehavior(page, 'quota');
    await page.getByRole('button', { name: 'Créer une sauvegarde' }).tap();
    await expect(page.getByText(E03, { exact: true })).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
    await page.keyboard.press('Escape');
    await setPickerBehavior(page, 'denied');
    await page.getByRole('button', { name: 'Créer une sauvegarde' }).tap();
    await expect(page.getByText(E04, { exact: true })).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('E-02 : sauvegarde d’une version plus récente', async ({ page }) => {
    await openGame(page);
    await openSave(page);
    const valid = JSON.parse(await validBackup()) as Record<string, unknown>;
    valid['formatVersion'] = 2;
    await chooseFile(page, { bytes: Buffer.from(JSON.stringify(valid)) });
    await expect(
      page.getByText(
        "Cette sauvegarde vient d'une version plus récente du jeu. Installez la dernière version puis réessayez. Rien n'a été modifié. (E-02)",
        { exact: true },
      ),
    ).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });
});
