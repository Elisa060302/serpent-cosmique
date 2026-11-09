import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { createGame, sendCommand, step } from '../../src/core/engine.ts';
import { CLASSIC } from '../../src/core/modes/classic.ts';
import { createRandom } from '../../src/core/random.ts';
import { LIMITS, SKINS } from '../../src/core/rules.ts';
import { readEnvelope } from '../../src/core/savefile.ts';
import type { ProgressData } from '../../src/core/types.ts';
import { paddedTo, sampleProgress, trapCorpus, validBackup } from '../fixtures/saves/corpus.ts';
import { findPath } from '../support/pilote.ts';
import { openGame, runFor, startClassic, swipe, watchProblems } from './support/jeu.ts';
import { chooseFile, expectErrorIcon, openSave, readCount, readProbe } from './support/fichiers.ts';
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
const E02 =
  "Cette sauvegarde vient d'une version plus récente du jeu. Installez la dernière version puis réessayez. Rien n'a été modifié. (E-02)";

/** Progression du téléphone : non vide, différente du contenu des fichiers du corpus. */
function phoneProgress(): ProgressData {
  return progressWith((progress) => {
    progress.records.zen = [{ name: 'Téléphone', score: 77, dateTime: '2026-10-31T18:00:00' }];
    progress.counters.totalCandies = 1234;
    progress.lastName = 'Téléphone';
    progress.settings.control = 'arrows';
  });
}

async function openRestore(page: Page, progress: ProgressData = phoneProgress()): Promise<void> {
  await seedStorage(page, { progress });
  await openGame(page);
  await openSave(page);
}

const dialog = (page: Page) => page.getByRole('dialog');

/** Faux si Object.prototype ou les objets vides de la page portent une clé étrangère. */
async function prototypeIsClean(page: Page): Promise<boolean> {
  return page.evaluate(
    () =>
      Object.keys(Object.prototype).length === 0 &&
      ({} as Record<string, unknown>)['polluted'] === undefined &&
      Object.getPrototypeOf({}) === Object.prototype,
  );
}

test('ct_55_fichiers_invalides : tout le corpus est refusé (E-01 ou E-02), sans exception, console ni requête, progression intacte', async ({
  page,
}) => {
  test.setTimeout(180_000);
  const problems = watchProblems(page);
  const requests: string[] = [];
  await openRestore(page);
  page.on('request', (request) => requests.push(request.url()));
  const before = await readStorage(page);
  const corpus = await trapCorpus();

  for (const file of corpus) {
    await chooseFile(page, { bytes: file.bytes });
    const expected = file.expected === 'newer' ? E02 : E01;
    await expect(dialog(page).getByText(expected, { exact: true }), file.label).toBeVisible();
    await expectErrorIcon(page);
    await expect(dialog(page).getByRole('button')).toHaveText(['Compris']);
    await dialog(page).getByRole('button', { name: 'Compris' }).tap();
    await expect(dialog(page)).toHaveCount(0);
  }

  expect(await readStorage(page)).toEqual(before);
  expect(await readProgress(page)).toEqual(JSON.parse(JSON.stringify(phoneProgress())));
  expect(await prototypeIsClean(page)).toBe(true);
  expect(requests).toEqual([]);
  expect(problems).toEqual([]);
});

test('ct_56_fusion_atomique : un fichier avec __proto__ est refusé, Object.prototype reste intact après une fusion valide', async ({
  page,
}) => {
  const problems = watchProblems(page);
  await openRestore(page);
  const valid = await validBackup(
    progressWith((progress) => {
      progress.skins.unlocked = [...progress.skins.unlocked, 'pattern-dots'];
    }),
  );
  const hostile = valid.replace('"data":{', '"data":{"__proto__":{"polluted":true},');
  await chooseFile(page, { bytes: Buffer.from(hostile) });
  await expect(dialog(page).getByText(E01, { exact: true })).toBeVisible();
  await dialog(page).getByRole('button', { name: 'Compris' }).tap();
  expect(await prototypeIsClean(page)).toBe(true);

  await chooseFile(page, { bytes: Buffer.from(valid) });
  await dialog(page).getByRole('button', { name: 'Fusionner' }).tap();
  await expect(page.locator('.toast')).toHaveText(/^Restauration terminée/);
  expect(await prototypeIsClean(page)).toBe(true);
  const merged = await readProgress(page);
  expect(merged?.skins.unlocked).toContain('pattern-dots');
  expect(merged?.records.zen).toHaveLength(1);
  expect(problems).toEqual([]);
});

test.describe('ct_57_taille_et_mutations : 256 Kio et mutations aléatoires', () => {
  test('262 144 octets : lu et contrôlé comme les autres ; 262 145 octets et 600 Ko : E-01 sans lecture du contenu', async ({
    page,
  }) => {
    await readProbe(page);
    await openRestore(page);
    const valid = await validBackup();

    await chooseFile(page, { bytes: paddedTo(valid, LIMITS.importFileMaxBytes) });
    await expect(dialog(page).getByRole('heading', { level: 2 })).toBeVisible();
    expect(await readCount(page)).toBe(1);
    await dialog(page).getByRole('button', { name: 'Annuler' }).tap();

    for (const size of [LIMITS.importFileMaxBytes + 1, 600 * 1024]) {
      await chooseFile(page, { bytes: paddedTo(valid, size) });
      await expect(dialog(page).getByText(E01, { exact: true })).toBeVisible();
      await dialog(page).getByRole('button', { name: 'Compris' }).tap();
      expect(await readCount(page)).toBe(1);
    }
  });

  test('50 mutations reproductibles d’un octet : refusées, ou sans effet sur la progression', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const problems = watchProblems(page);
    const progress = sampleProgress();
    await openRestore(page, progress);
    const text = await validBackup(progress);
    const before = await readProgress(page);
    const random = createRandom(57);

    for (let index = 0; index < 50; index += 1) {
      const chars = [...text];
      const position = random.nextInt(chars.length);
      const replacement = String.fromCharCode(32 + random.nextInt(95));
      if (index % 3 === 0) chars[position] = replacement;
      else if (index % 3 === 1) chars.splice(position, 1);
      else chars.splice(position, 0, replacement);
      await chooseFile(page, { bytes: Buffer.from(chars.join('')) });
      await expect(dialog(page)).toBeVisible();
      if ((await dialog(page).getByRole('heading', { level: 2 }).count()) > 0) {
        // Une mutation qui ne change pas le sens du fichier : la restauration est sans effet.
        await dialog(page).getByRole('button', { name: 'Fusionner' }).tap();
        await expect(page.locator('.toast')).toHaveText(/^Restauration terminée/);
      } else {
        await expect(dialog(page).getByText(E01, { exact: true })).toBeVisible();
        await dialog(page).getByRole('button', { name: 'Compris' }).tap();
      }
      await expect(dialog(page)).toHaveCount(0);
      expect(await readProgress(page)).toEqual(before);
    }
    expect(problems).toEqual([]);
  });
});

test.describe('ct_118_validateur_complements : noms', () => {
  test('un emoji composé avec liant U+200D est accepté (le corpus refuse les caractères de contrôle)', async ({
    page,
  }) => {
    await openRestore(page);
    const composed = ['👨', '👩', '👧'].join(String.fromCharCode(0x200d));
    const accepted = progressWith((progress) => {
      progress.records.classic = [{ name: composed, score: 12, dateTime: '2026-10-31T18:00:00' }];
    });
    await chooseFile(page, { bytes: Buffer.from(await validBackup(accepted)) });
    await dialog(page).getByRole('button', { name: 'Fusionner' }).tap();
    await expect(page.locator('.toast')).toHaveText(/^Restauration terminée/);
    expect((await readProgress(page))?.records.classic[0]?.name).toBe(composed);
  });
});

/** Processus principal du navigateur lancé avec ce profil (Linux : lecture de /proc). */
function browserProcess(profile: string): number {
  for (const entry of readdirSync('/proc')) {
    if (!/^\d+$/.test(entry)) continue;
    try {
      const args = readFileSync(`/proc/${entry}/cmdline`, 'utf8').split('\0');
      if (
        args.some((argument) => argument === `--user-data-dir=${profile}`) &&
        !args.some((argument) => argument.startsWith('--type='))
      ) {
        return Number(entry);
      }
    } catch {
      // Le processus a disparu entre la liste et la lecture.
    }
  }
  throw new Error('Processus du navigateur introuvable.');
}

/**
 * Mange le premier bonbon (graine 1) sans lire le canevas, donc quel que soit le skin choisi : le premier pas a lieu
 * 3 s et un intervalle après le toucher de « Classique », puis un pas tous les 1/6 s ; chaque commande est
 * envoyée au milieu de l'intervalle qui précède le pas où elle doit agir.
 */
async function eatFirstCandy(page: Page): Promise<void> {
  const interval = 1000 / 6;
  const firstStep = 3000 + interval;
  const oracle = createGame(CLASSIC, 1);
  step(oracle);
  const path = findPath(oracle, (cell, state) =>
    state.candies.some((candy) => candy.cell.col === cell.col && candy.cell.row === cell.row),
  );
  if (path === null) throw new Error('Aucun chemin vers le bonbon.');
  // Les 50 ms de départ ont été joués ; l'horloge est à 50 ms du toucher.
  let now = 50;
  const advanceTo = async (target: number): Promise<void> => {
    const wait = Math.max(0, Math.round(target - now));
    await runFor(page, wait);
    now += wait;
  };
  for (const [index, direction] of path.entries()) {
    await advanceTo(firstStep + index * interval + interval / 2);
    if (sendCommand(oracle, direction)) await swipe(page, direction);
    step(oracle);
  }
  await advanceTo(firstStep + path.length * interval + 60);
}

interface Snapshot {
  settings: string;
  shape: string;
  games: number;
  candies: number;
  names: string[];
}

function snapshot(progress: ProgressData): Snapshot {
  return {
    settings: JSON.stringify(progress.settings),
    shape: progress.skins.selected.shape,
    games: progress.counters.gamesByMode.classic,
    candies: progress.counters.totalCandies,
    names: progress.records.classic.map((entry) => entry.name).sort(),
  };
}

test('ct_86_vingt_arrets_brutaux : 20 arrêts par signal SIGKILL (une moitié 1 s après l’action, l’autre aussitôt) — aucune perte, aucune écriture incomplète, E-05 jamais affichée', async () => {
  test.setTimeout(600_000);
  const directory = newProfileDirectory();
  const everything = progressWith((progress) => {
    progress.skins.unlocked = SKINS.map((skin) => skin.id);
    progress.lastName = 'Coco';
  });
  let admissible: Snapshot[] = [];
  let previous: { before: Snapshot; after: Snapshot; patient: boolean } | null = null;
  let notFound = 0;

  for (let round = 0; round < 20; round += 1) {
    const kind = round % 4;
    const patient = Math.floor(round / 4) % 2 === 0;
    const context = await launchProfile(directory);
    const page = await context.newPage();
    const problems = watchProblems(page);
    if (round === 0) await seedStorage(page, { progress: everything });
    await openGame(page, { seed: 1 });
    await expect(page.getByRole('button', { name: 'Jouer' }), `tour ${round}`).toBeVisible();
    // E-05 n'apparaît jamais, et ce qui est enregistré est une enveloppe complète : elle passe le contrôle du jeu.
    await expect(page.getByRole('alert'), `tour ${round}`).toHaveCount(0);
    const raw = await readStorage(page);
    const envelope = await readEnvelope(raw.progress ?? '', new Date(), true);
    expect(envelope, `tour ${round} : progression enregistrée complète`).not.toBeNull();
    const base = snapshot(envelope!.data);
    if (round > 0) {
      expect(admissible, `tour ${round} : état avant ou après l’action`).toContainEqual(base);
      // Arrêt aussitôt : une écriture pas encore terminée peut ne pas être retrouvée (état d'avant).
      if (
        previous !== null &&
        !previous.patient &&
        JSON.stringify(base) === JSON.stringify(previous.before)
      ) {
        notFound += 1;
      }
    }

    const before = base;
    let after: Snapshot;
    let during: Snapshot[] = [];
    if (kind === 0) {
      // Réglage : un bruitage coupé ou rétabli.
      const settings = JSON.parse(before.settings) as ProgressData['settings'];
      after = { ...before, settings: JSON.stringify({ ...settings, sounds: !settings.sounds }) };
      await page.getByRole('button', { name: 'Réglages' }).tap();
      await page.getByRole('switch', { name: 'Bruitages' }).tap();
    } else if (kind === 1) {
      // Skin : la forme choisie alterne entre la Comète et la Fusée.
      const toRocket = before.shape === 'shape-comet';
      after = { ...before, shape: toRocket ? 'shape-rocket' : 'shape-comet' };
      await page.getByRole('button', { name: 'Skins', exact: true }).tap();
      await page.getByRole('radio', { name: toRocket ? 'Fusée' : 'Comète' }).tap();
    } else {
      // Fin de partie (score nul, aucun record) ou record avec son nom (un bonbon mangé).
      const finished = { ...before, games: before.games + 1 };
      after = finished;
      await startClassic(page);
      await runFor(page, 50);
      if (kind === 3) {
        await eatFirstCandy(page);
      }
      await page.getByRole('button', { name: 'Pause', exact: true }).tap();
      await page.getByRole('button', { name: 'Abandonner' }).tap();
      await page.getByRole('button', { name: 'Oui' }).tap();
      if (kind === 3) {
        const name = `Nom${round}`;
        const recorded = { ...finished, candies: before.candies + 1 };
        const stored = envelope!.data.lastName === '' ? 'Joueur' : envelope!.data.lastName;
        // Le record est enregistré dès la fin de la partie, sous le dernier nom ; « Valider » le remplace.
        during = [{ ...recorded, names: [...before.names, stored].sort() }];
        after = { ...recorded, names: [...before.names, name].sort() };
        await expect(page.locator('.end-record')).toBeVisible();
        await page.getByLabel('Votre nom').fill(name);
        await page.getByRole('button', { name: 'Valider' }).tap();
        await expect(page.locator('.name-saved')).toHaveText(`Nom enregistré : ${name}`);
      } else {
        await expect(page.locator('.end')).toBeVisible();
      }
    }
    if (patient) {
      // Une seconde après l'action : l'état est celui d'après.
      await new Promise((resolve) => setTimeout(resolve, 1100));
      admissible = [after];
    } else {
      // Arrêt aussitôt : l'état est celui d'avant, d'après, ou (record) celui d'entre les deux.
      admissible = [before, ...during, after];
    }
    previous = { before, after, patient };
    expect(problems, `tour ${round}`).toEqual([]);
    process.kill(browserProcess(directory), 'SIGKILL');
    await context.close().catch(() => undefined);
  }

  // Dernière ouverture : l'état est cohérent et le jeu démarre normalement.
  const context = await launchProfile(directory);
  const page = await context.newPage();
  await openGame(page, { seed: 1 });
  await expect(page.getByRole('button', { name: 'Jouer' })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  const last = await readEnvelope((await readStorage(page)).progress ?? '', new Date(), true);
  expect(last).not.toBeNull();
  expect(admissible).toContainEqual(snapshot(last!.data));
  // Bilan : toute écriture suivie d'une seconde d'attente est retrouvée (au moins 6 parties, 3 records nommés) ;
  // les écritures des arrêts immédiats retrouvées ou non sont comptées, jamais partielles.
  const total = snapshot(last!.data);
  expect(total.games).toBeGreaterThanOrEqual(6);
  expect(total.candies).toBeGreaterThanOrEqual(3);
  expect(total.names.length).toBeGreaterThanOrEqual(3);
  test.info().annotations.push({
    type: 'écritures des arrêts immédiats non retrouvées (sur 10)',
    description: String(notFound),
  });
  await context.close();
});
