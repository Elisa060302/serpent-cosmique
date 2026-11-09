import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { createGame, step } from '../../src/core/engine.ts';
import { pathToOwnBody } from '../support/pilote.ts';
import { CLASSIC } from '../../src/core/modes/classic.ts';
import { MODE_IDS, SKINS } from '../../src/core/rules.ts';
import type { PendingGame, ProgressData, RecordEntry } from '../../src/core/types.ts';
import {
  drive,
  eatNextCandy,
  openGame,
  runFor,
  seriousViolations,
  skipCountdown,
  startClassic,
  stepOnce,
  swipe,
} from './support/jeu.ts';
import {
  SEED_DATE,
  launchProfile,
  newProfileDirectory,
  progressWith,
  removeProfileDirectories,
  readProgress,
  readStorage,
  seedStorage,
} from './support/sauvegarde.ts';
import type { Seed } from './support/sauvegarde.ts';

const E05 =
  "Votre progression n'a pas pu être lue. Vous pouvez restaurer une sauvegarde depuis le menu Sauvegarde. (E-05)";

function record(name: string, score: number, dateTime = SEED_DATE): RecordEntry {
  return { name, score, dateTime };
}

function pending(score: number, candiesEaten = score): PendingGame {
  return { mode: 'classic', score, candiesEaten, dateTime: SEED_DATE };
}

/** Surveille ce que le jeu ne doit jamais produire : exception, erreur de console, boîte de dialogue du navigateur. */
function watchProblems(page: Page): string[] {
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

/** Ouvre le jeu sur un état de départ. */
async function openWith(page: Page, seed: Seed, options: { seed?: number } = {}): Promise<void> {
  await seedStorage(page, seed);
  await openGame(page, options);
}

/** Valide la boîte « Partie interrompue » et passe à l'écran suivant. */
async function continueAfterInterruption(page: Page): Promise<void> {
  await expect(page.getByRole('dialog', { name: 'Partie interrompue' })).toBeVisible();
  await page.getByRole('button', { name: 'Continuer' }).tap();
}

/** Clôture d'une partie interrompue jusqu'à l'écran de fin (un record est créé). */
async function reachEndScreen(page: Page, seed: Seed): Promise<void> {
  await openWith(page, seed);
  await continueAfterInterruption(page);
  await expect(page.locator('.end')).toBeVisible();
}

async function openRecords(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Records' }).tap();
  await expect(page.getByRole('heading', { name: 'Records' })).toBeAttached();
}

async function recordRows(page: Page): Promise<string[]> {
  return page.locator('.records-row').evaluateAll((rows) =>
    rows.map((row) =>
      Array.from(row.children)
        .map((cell) => cell.textContent ?? '')
        .join(' | '),
    ),
  );
}

const SEED_GAME = 1;

test.afterEach(() => {
  removeProfileDirectories();
});

/** Lance une partie Classique (graine 1, `openGame` déjà fait) et mange `count` bonbons avec le pilote de recette. */
async function playAndEat(page: Page, count: number): Promise<void> {
  await startClassic(page);
  await runFor(page, 50);
  await skipCountdown(page);
  await stepOnce(page, 1000 / 6);
  const oracle = createGame(CLASSIC, SEED_GAME);
  step(oracle);
  for (let eaten = 1; eaten <= count; eaten += 1) await eatNextCandy(page, oracle);
}

async function abandon(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Pause', exact: true }).tap();
  await page.getByRole('button', { name: 'Abandonner' }).tap();
  await page.getByRole('button', { name: 'Oui' }).tap();
}

test.describe('ct_35_ecran_de_fin : record, rang et déblocages annoncés (EF-16, RG-44)', () => {
  test('EF-19 CA-1 : 99 bonbons, une partie à 1 bonbon annonce le record, son rang et le skin débloqué', async ({
    page,
  }) => {
    const progress = progressWith((p) => {
      p.counters.totalCandies = 99;
      p.skins.unlocked = [
        'shape-rings',
        'pattern-plain',
        'pattern-dots',
        'trail-none',
        'decor-starry-night',
      ];
    });
    await openWith(page, { progress }, { seed: SEED_GAME });
    await playAndEat(page, 1);
    await abandon(page);
    await expect(page.getByRole('heading', { name: 'Classique' })).toBeVisible();
    await expect(page.locator('.end-reason')).toHaveText('Partie abandonnée');
    await expect(page.locator('.end-score')).toHaveText('Score 1');
    await expect(page.locator('.end-record')).toHaveText('★ Nouveau record ! (1er)');
    await expect(page.locator('.end-unlocks li')).toHaveText([
      "Nouveau skin débloqué : Poussière d'étoiles",
    ]);
    await expect(page.getByRole('button', { name: 'Rejouer' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
    expect((await readProgress(page))!.skins.unlocked).toContain('trail-stardust');
  });

  test('sans déblocage ni record, aucune de ces lignes ; avec un rang, le rang s’écrit en toutes lettres', async ({
    page,
  }) => {
    const progress = progressWith((p) => {
      p.records.classic = [record('Zoé', 18), record('Léa', 11)];
    });
    await reachEndScreen(page, { progress, pending: pending(5) });
    await expect(page.locator('.end-record')).toHaveText('★ Nouveau record ! (3e)');
    await expect(page.locator('.end-unlocks')).toHaveCount(0);
    await expect(page.getByText('Nouveau mode découvert')).toHaveCount(0);
  });

  test('un score de 0 ne crée aucun record : ni ligne ni champ du nom', async ({ page }) => {
    await openWith(page, { progress: progressWith(() => undefined), pending: pending(0) });
    await continueAfterInterruption(page);
    // Aucun record : « Continuer » mène au menu, pas à l'écran de fin.
    await expect(page.getByRole('button', { name: 'Jouer' })).toBeVisible();
    expect((await readProgress(page))?.records.classic).toEqual([]);
  });
});

test('ct_36_compteurs_durables : 40 + 7 = 47 enregistrés avant l’écran de fin, même après fermeture forcée', async () => {
  test.setTimeout(180_000);
  const directory = newProfileDirectory();
  const context = await launchProfile(directory);
  // Sonde : ordre des fins de transaction et de l'apparition de l'écran de fin, durabilité demandée.
  await context.addInitScript({
    content: `
      const probe = { sequence: 0, transactions: [], endShownAt: 0 };
      Object.defineProperty(window, '__probe', { value: probe });
      const original = IDBDatabase.prototype.transaction;
      IDBDatabase.prototype.transaction = function (stores, mode, options) {
        const transaction = original.call(this, stores, mode, options);
        const entry = {
          mode: mode ?? 'readonly',
          durability: options?.durability ?? null,
          startedAt: (probe.sequence += 1),
          completedAt: 0,
        };
        probe.transactions.push(entry);
        transaction.addEventListener('complete', () => {
          entry.completedAt = probe.sequence += 1;
        });
        return transaction;
      };
      new MutationObserver(() => {
        if (probe.endShownAt === 0 && document.querySelector('.end') !== null) {
          probe.endShownAt = probe.sequence += 1;
        }
      }).observe(document, { childList: true, subtree: true });
    `,
  });
  const page = await context.newPage();
  await seedStorage(page, {
    progress: progressWith((p) => {
      p.counters.totalCandies = 40;
    }),
  });
  await openGame(page, { seed: SEED_GAME });
  await playAndEat(page, 7);
  await abandon(page);
  await expect(page.locator('.end')).toBeVisible();

  // Dès que l'écran de fin est là, la progression est déjà écrite.
  const stored = await readProgress(page);
  expect(stored?.counters.totalCandies).toBe(47);
  expect(stored?.counters.gamesByMode.classic).toBe(1);
  expect((await readStorage(page)).pendingGame).toBeUndefined();
  const probe = await page.evaluate(
    () =>
      (
        window as unknown as {
          __probe: {
            endShownAt: number;
            transactions: {
              mode: string;
              durability: string | null;
              startedAt: number;
              completedAt: number;
            }[];
          };
        }
      ).__probe,
  );
  const writes = probe.transactions.filter((transaction) => transaction.mode === 'readwrite');
  expect(writes.length).toBeGreaterThan(0);
  for (const write of writes) {
    expect(write.durability).toBe('strict');
    if (write.startedAt < probe.endShownAt) {
      expect(write.completedAt).toBeGreaterThan(0);
      expect(write.completedAt).toBeLessThan(probe.endShownAt);
    }
  }

  // Fermeture forcée juste après : à la réouverture, le total vaut 47 et rien n'est compté deux fois.
  await context.close();
  const reopened = await launchProfile(directory);
  const next = await reopened.newPage();
  await openGame(next);
  await expect(next.getByRole('button', { name: 'Jouer' })).toBeVisible();
  await expect(next.getByRole('dialog')).toHaveCount(0);
  const after = await readProgress(next);
  expect(after?.counters.totalCandies).toBe(47);
  expect(after?.counters.gamesByMode.classic).toBe(1);
  await reopened.close();
});

test('ct_42_skins_premier_lancement : la première progression enregistrée ne contient que les quatre skins par défaut', async ({
  page,
}) => {
  await openGame(page, { seed: SEED_GAME });
  expect(await readProgress(page)).toBeNull();
  await startClassic(page);
  await runFor(page, 50);
  await page.getByRole('button', { name: 'Pause', exact: true }).tap();
  await page.getByRole('button', { name: 'Abandonner' }).tap();
  await page.getByRole('button', { name: 'Oui' }).tap();
  await expect(page.locator('.end')).toBeVisible();
  const stored = await readProgress(page);
  expect(stored?.skins).toEqual({
    unlocked: ['shape-rings', 'pattern-plain', 'trail-none', 'decor-starry-night'],
    selected: {
      shape: 'shape-rings',
      pattern: 'pattern-plain',
      trail: 'trail-none',
      decor: 'decor-starry-night',
    },
  });
  expect(SKINS).toHaveLength(16);
});

test('ct_24_scn01_premiere_partie : 11 bonbons, la queue, « Coco » au premier rang du tableau Classique', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const problems = watchProblems(page);
  await openGame(page, { seed: SEED_GAME });
  await playAndEat(page, 0);
  const oracle = createGame(CLASSIC, SEED_GAME);
  step(oracle);
  for (let eaten = 1; eaten <= 11; eaten += 1) await eatNextCandy(page, oracle);
  const path = pathToOwnBody(oracle)!;
  await drive(page, oracle, path.slice(0, -1));
  for (const direction of path.slice(-1)) await swipe(page, direction);
  for (let frame = 0; frame < 200 && (await page.locator('.end').count()) === 0; frame += 1) {
    await runFor(page, 16);
  }
  await expect(page.locator('.end-reason')).toHaveText('Collision');
  await expect(page.locator('.end-score')).toHaveText('Score 11');
  await expect(page.locator('.end-record')).toHaveText('★ Nouveau record ! (1er)');
  await nameField(page).fill('Coco');
  await page.getByRole('button', { name: 'Valider' }).tap();
  await expect(page.locator('.name-saved')).toHaveText('Nom enregistré : Coco');
  await page.getByRole('button', { name: 'Menu' }).tap();
  await openRecords(page);
  expect(await recordRows(page)).toEqual(['1. | Coco | 11 | 01/11/2026']);
  expect(problems).toEqual([]);
});

test.describe('ct_37_tableaux_records : un tableau par mode, tri, vide (EF-17)', () => {
  test('Records affiche rang, nom, score et date JJ/MM/AAAA, le plus ancien d’abord à égalité', async ({
    page,
  }) => {
    const progress = progressWith((p) => {
      p.records.classic = [
        record('Zoé', 18, '2026-10-30T09:00:00'),
        record('Léa', 11, '2026-10-31T10:00:00'),
        record('Coco', 11, '2026-11-01T09:00:00'),
      ];
    });
    await openWith(page, { progress });
    await openRecords(page);
    await expect(page.locator('.records-mode')).toHaveText('Classique');
    expect(await recordRows(page)).toEqual([
      '1. | Zoé | 18 | 30/10/2026',
      '2. | Léa | 11 | 31/10/2026',
      '3. | Coco | 11 | 01/11/2026',
    ]);
    await expect(page.getByRole('list')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Mode précédent' })).toBeVisible();
    // Avec les sept modes, « › » passe au mode suivant ; « ‹ » revient au premier puis boucle jusqu'au dernier.
    await page.getByRole('button', { name: 'Mode suivant' }).tap();
    await expect(page.locator('.records-mode')).toHaveText('Contre la montre');
    await page.getByRole('button', { name: 'Mode précédent' }).tap();
    await expect(page.locator('.records-mode')).toHaveText('Classique');
    await page.getByRole('button', { name: 'Mode précédent' }).tap();
    await expect(page.locator('.records-mode')).toHaveText('Zen');
    // « ‹ Retour » rend le focus au bouton « Records ».
    await page.getByRole('button', { name: '‹ Retour' }).tap();
    await expect(page.getByRole('button', { name: 'Records' })).toBeFocused();
  });

  test('un mode jamais joué affiche « Aucun record pour l’instant »', async ({ page }) => {
    await openGame(page);
    await openRecords(page);
    await expect(page.locator('.records-empty')).toHaveText("Aucun record pour l'instant");
    await expect(page.locator('.records-row')).toHaveCount(0);
  });

  test('jeu de données maximal : 10 records de 12 emojis, scores de 4 chiffres, compteurs à 1 000 000 000', async ({
    page,
  }) => {
    const problems = watchProblems(page);
    const maximal = progressWith((p) => {
      for (const mode of MODE_IDS) {
        p.records[mode] = Array.from({ length: 10 }, (_, index) =>
          record('🐍'.repeat(12), 9999 - index),
        );
        p.counters.gamesByMode[mode] = 1_000_000_000;
      }
      p.counters.totalCandies = 1_000_000_000;
      p.lastName = '🐍'.repeat(12);
    });
    await openWith(page, { progress: maximal });
    await openRecords(page);
    await expect(page.locator('.records-row')).toHaveCount(10);
    const viewport = page.viewportSize()!;
    for (const box of await page
      .locator('.records-row')
      .evaluateAll((rows) =>
        rows.map(
          (row) => row.getBoundingClientRect().toJSON() as { right: number; bottom: number },
        ),
      )) {
      expect(box.right).toBeLessThanOrEqual(viewport.width);
    }
    expect(await recordRows(page)).toContain(
      '1. | ' + '🐍'.repeat(12) + ' | 9\u00a0999 | 31/10/2026',
    );
    expect(problems).toEqual([]);
  });
});

test('ct_38_entree_au_tableau : égalité avec le 10e refusée, 16 points acceptés, 0 point jamais inscrit', async ({
  page,
}) => {
  const full = (): ProgressData =>
    progressWith((p) => {
      p.records.classic = Array.from({ length: 10 }, (_, index) =>
        record(`J${index + 1}`, 24 - index),
      );
    });
  // 15 points : le tableau ne change pas et aucun nom n'est demandé.
  await openWith(page, { progress: full(), pending: pending(15) });
  await continueAfterInterruption(page);
  await expect(page.getByRole('button', { name: 'Jouer' })).toBeVisible();
  await expect(page.locator('.end')).toHaveCount(0);
  const unchanged = (await readProgress(page))!.records.classic;
  expect(unchanged.map((entry) => entry.name)).toEqual(full().records.classic.map((e) => e.name));
  await openRecords(page);
  expect((await recordRows(page)).at(-1)).toBe('10. | J10 | 15 | 31/10/2026');

  // 16 points : le score entre et l'ancien 10e sort.
  await page.goto('about:blank');
  await openWith(page, { progress: full(), pending: pending(16) });
  await continueAfterInterruption(page);
  await expect(page.locator('.end-record')).toHaveText('★ Nouveau record ! (10e)');
  await page.getByRole('button', { name: 'Menu' }).tap();
  await openRecords(page);
  const rows = await recordRows(page);
  expect(rows).toHaveLength(10);
  expect(rows.at(-1)).toMatch(/^10\. \| Joueur \| 16 \| /);
  expect(rows.join('\n')).not.toContain('J10');

  // 0 point, tableau vide : aucun record.
  await page.goto('about:blank');
  await openWith(page, { progress: progressWith(() => undefined), pending: pending(0) });
  await continueAfterInterruption(page);
  await expect(page.getByRole('button', { name: 'Jouer' })).toBeVisible();
  await openRecords(page);
  await expect(page.locator('.records-empty')).toBeVisible();
});

function nameField(page: Page): Locator {
  return page.getByLabel('Votre nom');
}

test.describe('ct_39_saisie_du_nom : prérempli, validation, champ vide (EF-18)', () => {
  const withCoco = (): ProgressData =>
    progressWith((p) => {
      p.records.classic = [record('Coco', 20)];
      p.lastName = 'Coco';
    });

  test('le champ propose « Coco », sans focus ; « Valider » enregistre et donne le focus à « Rejouer »', async ({
    page,
  }) => {
    await reachEndScreen(page, { progress: withCoco(), pending: pending(11) });
    const field = nameField(page);
    await expect(field).toHaveValue('Coco');
    await expect(field).not.toBeFocused();
    await expect(field).toHaveAttribute('enterkeyhint', 'done');
    await expect(page.locator('.name-counter')).toHaveText('4/12');
    await expect(page.locator('#name-hint')).toHaveText(
      'Nom enregistré : Coco. Touchez le champ pour en saisir un autre.',
    );
    await expect(page.locator('.name-reminder')).toBeHidden();
    await page.getByRole('button', { name: 'Valider' }).tap();
    await expect(page.locator('.name-saved')).toHaveText('Nom enregistré : Coco');
    await expect(page.getByRole('button', { name: 'Rejouer' })).toBeFocused();
    await expect(field).toHaveCount(0);
  });

  test('« Léa » remplace le nom, devient le dernier nom et est proposé la fois suivante', async ({
    page,
  }) => {
    await reachEndScreen(page, { progress: withCoco(), pending: pending(11) });
    const field = nameField(page);
    await field.fill('Léa');
    await expect(page.locator('.name-counter')).toHaveText('3/12');
    await page.getByRole('button', { name: 'Valider' }).tap();
    await expect(page.locator('.name-saved')).toHaveText('Nom enregistré : Léa');
    const stored = (await readProgress(page))!;
    expect(stored.lastName).toBe('Léa');
    expect(stored.records.classic.map((entry) => [entry.name, entry.score])).toEqual([
      ['Coco', 20],
      ['Léa', 11],
    ]);
    // Le nom enregistré est proposé à la partie suivante.
    await page.goto('about:blank');
    await seedStorage(page, { pending: pending(3) });
    await openGame(page);
    await continueAfterInterruption(page);
    await expect(nameField(page)).toHaveValue('Léa');
  });

  test('un champ vidé donne « Joueur » ; la touche Entrée du clavier valide aussi', async ({
    page,
  }) => {
    await reachEndScreen(page, { progress: withCoco(), pending: pending(11) });
    const field = nameField(page);
    await field.fill('');
    await field.press('Enter');
    await expect(page.locator('.name-saved')).toHaveText('Nom enregistré : Joueur');
    expect((await readProgress(page))!.records.classic[1]?.name).toBe('Joueur');
  });

  test('la ligne d’aide dit le nom réellement enregistré et rappelle « Valider » dès que le champ diffère', async ({
    page,
  }) => {
    await reachEndScreen(page, { progress: withCoco(), pending: pending(11) });
    const field = nameField(page);
    const reminder = page.locator('.name-reminder');
    await field.fill('Léa');
    // Le texte tapé n'est pas enregistré : la ligne d'aide garde « Coco » et le rappel apparaît.
    await expect(page.locator('#name-hint')).toHaveText(
      'Nom enregistré : Coco. Touchez le champ pour en saisir un autre.',
    );
    await expect(reminder).toBeVisible();
    await expect(reminder).toHaveText('Touchez « Valider » pour enregistrer ce nom.');
    await expect(page.getByText('Enregistré sous ce nom')).toHaveCount(0);
    // Le rappel disparaît quand le champ redevient identique au nom enregistré.
    await field.fill('Coco');
    await expect(reminder).toBeHidden();
  });

  test('au premier record, la ligne d’aide dit « Joueur » et le champ vide ne réclame rien', async ({
    page,
  }) => {
    await reachEndScreen(page, { progress: progressWith(() => undefined), pending: pending(4) });
    await expect(page.locator('#name-hint')).toHaveText(
      'Nom enregistré : Joueur. Touchez le champ pour en saisir un autre.',
    );
    await expect(page.locator('.name-reminder')).toBeHidden();
    await nameField(page).fill('Léa');
    await expect(page.locator('.name-reminder')).toBeVisible();
  });

  /** Sorties de l'écran de saisie sans « Valider » : le record garde le nom enregistré (RG-53, HYP-46). */
  const exits: [string, (page: Page) => Promise<void>][] = [
    ['« Menu »', (page) => page.getByRole('button', { name: 'Menu' }).tap()],
    ['« Rejouer »', (page) => page.getByRole('button', { name: 'Rejouer' }).tap()],
    ['le bouton retour du téléphone', async (page) => void (await page.goBack())],
  ];
  for (const [label, leave] of exits) {
    test(`EF-18 CA-5 : « Léa » tapé puis ${label} sans « Valider » : record au nom de « Coco », « Coco » proposé ensuite`, async ({
      page,
    }) => {
      await reachEndScreen(page, { progress: withCoco(), pending: pending(11) });
      await nameField(page).fill('Léa');
      await leave(page);
      await expect(page.locator('.end')).toHaveCount(0);
      const stored = (await readProgress(page))!;
      expect(stored.records.classic.map((entry) => [entry.name, entry.score])).toEqual([
        ['Coco', 20],
        ['Coco', 11],
      ]);
      expect(stored.lastName).toBe('Coco');
      // Le record suivant propose « Coco ».
      await page.goto('about:blank');
      await seedStorage(page, { pending: pending(3) });
      await openGame(page);
      await continueAfterInterruption(page);
      await expect(nameField(page)).toHaveValue('Coco');
    });
  }

  test('EF-18 CA-6 : au premier record, le champ est vide ; validé vide, le record s’appelle « Joueur » et « Joueur » est proposé ensuite', async ({
    page,
  }) => {
    await reachEndScreen(page, { progress: progressWith(() => undefined), pending: pending(4) });
    await expect(nameField(page)).toHaveValue('');
    expect((await readProgress(page))!.records.classic[0]?.name).toBe('Joueur');
    await page.getByRole('button', { name: 'Valider' }).tap();
    await expect(page.locator('.name-saved')).toHaveText('Nom enregistré : Joueur');
    const stored = (await readProgress(page))!;
    expect(stored.records.classic[0]?.name).toBe('Joueur');
    expect(stored.lastName).toBe('Joueur');
    await page.goto('about:blank');
    await seedStorage(page, { pending: pending(3) });
    await openGame(page);
    await continueAfterInterruption(page);
    await expect(nameField(page)).toHaveValue('Joueur');
  });
});

test.describe('ct_40_nom_limites_injection : 12 caractères, caractères spéciaux, injection (EF-18, EXS-06)', () => {
  const start = async (page: Page): Promise<string[]> => {
    const problems = watchProblems(page);
    await reachEndScreen(page, { progress: progressWith(() => undefined), pending: pending(3) });
    return problems;
  };

  test('« <script>Coco » tient en 12 caractères, le 13e est refusé avec un message passager', async ({
    page,
  }) => {
    const problems = await start(page);
    const field = nameField(page);
    await field.fill('');
    await field.pressSequentially('<script>Coco');
    await expect(field).toHaveValue('<script>Coco');
    await expect(page.locator('.name-counter')).toHaveText('12/12');
    await field.press('x');
    await expect(field).toHaveValue('<script>Coco');
    await expect(page.locator('.toast')).toHaveText('12 caractères au maximum');
    await page.getByRole('button', { name: 'Valider' }).tap();
    await page.getByRole('button', { name: 'Menu' }).tap();
    await openRecords(page);
    await expect(page.locator('.record-name')).toHaveText('<script>Coco');
    expect(problems).toEqual([]);
  });

  test('« <img src=x onerror=alert(1)> » est coupé à 12 caractères et affiché sans s’exécuter', async ({
    page,
  }) => {
    const problems = await start(page);
    const field = nameField(page);
    await field.fill('');
    await field.pressSequentially('<img src=x onerror=alert(1)>');
    await expect(field).toHaveValue('<img src=x o');
    await page.getByRole('button', { name: 'Valider' }).tap();
    await page.getByRole('button', { name: 'Menu' }).tap();
    await openRecords(page);
    await expect(page.locator('.record-name')).toHaveText('<img src=x o');
    await expect(page.locator('img')).toHaveCount(0);
    expect(problems).toEqual([]);
  });

  test('un emoji compte pour un caractère ; espaces de bord, contrôles et marques bidirectionnelles sont retirés', async ({
    page,
  }) => {
    await start(page);
    const field = nameField(page);
    await field.fill('🐍'.repeat(13));
    await expect(field).toHaveValue('🐍'.repeat(12));
    await expect(page.locator('.name-counter')).toHaveText('12/12');
    await field.fill('');
    await field.focus();
    await page.keyboard.insertText('Co\u202e\u200fco');
    await expect(field).toHaveValue('Coco');
    await field.fill('   Léa   ');
    await page.getByRole('button', { name: 'Valider' }).tap();
    await expect(page.locator('.name-saved')).toHaveText('Nom enregistré : Léa');
    expect((await readProgress(page))!.records.classic[0]?.name).toBe('Léa');
  });

  test('un nom nettoyé à la saisie est relu au rechargement, sans repli ni E-05', async ({
    page,
  }) => {
    await start(page);
    const field = nameField(page);
    await field.fill('');
    await field.focus();
    await page.keyboard.insertText('Co\u202e\u200fco \u{1F468}\u200D\u{1F469}');
    await expect(field).toHaveValue('Coco \u{1F468}\u200D\u{1F469}');
    await page.getByRole('button', { name: 'Valider' }).tap();
    await expect(page.locator('.name-saved')).toBeVisible();
    await page.goto('about:blank');
    await openGame(page);
    await expect(page.getByRole('button', { name: 'Jouer' })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await openRecords(page);
    await expect(page.locator('.record-name')).toHaveText('Coco \u{1F468}\u200D\u{1F469}');
  });
});

test('ct_41_nom_fermeture_forcee : le record figure au tableau avec le nom proposé si le jeu est fermé pendant la saisie', async () => {
  const directory = newProfileDirectory();
  const context = await launchProfile(directory);
  const page = await context.newPage();
  await reachEndScreen(page, {
    progress: progressWith((p) => {
      p.records.classic = [record('Coco', 20)];
      p.lastName = 'Coco';
    }),
    pending: pending(11),
  });
  await expect(nameField(page)).toHaveValue('Coco');
  await context.close();

  const reopened = await launchProfile(directory);
  const next = await reopened.newPage();
  await openGame(next);
  await openRecords(next);
  expect(await recordRows(next)).toEqual([
    '1. | Coco | 20 | 31/10/2026',
    '2. | Coco | 11 | 31/10/2026',
  ]);
  await reopened.close();
});

test.describe('ct_62_partie_interrompue : clôture au lancement suivant (EF-27)', () => {
  test('CA-1 : « Classique, 12 points », saisie du nom, total + 12 ; le message précède le menu', async ({
    page,
  }) => {
    const progress = progressWith((p) => {
      p.counters.totalCandies = 30;
    });
    await openWith(page, { progress, pending: pending(12) });
    const notice = page.getByRole('dialog', { name: 'Partie interrompue' });
    await expect(notice).toContainText(
      'Votre dernière partie (Classique, 12 points) a été interrompue ; elle a été enregistrée.',
    );
    await expect(page.getByRole('button', { name: 'Jouer' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Continuer' }).tap();
    await expect(page.locator('.end-record')).toHaveText('★ Nouveau record ! (1er)');
    await expect(page.locator('.end-reason')).toHaveText('Partie abandonnée');
    await expect(nameField(page)).toBeVisible();
    const stored = (await readProgress(page))!;
    expect(stored.counters.totalCandies).toBe(42);
    expect(stored.counters.gamesByMode.classic).toBe(1);
    expect((await readStorage(page)).pendingGame).toBeUndefined();
  });

  test('CA-2 : sans partie en cours, le menu s’affiche directement, sans message', async ({
    page,
  }) => {
    await openGame(page);
    await expect(page.getByRole('button', { name: 'Jouer' })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('CA-3 : une partie jouée puis le jeu fermé de force (bonbon, puis pause) n’est enregistrée qu’une fois', async () => {
    test.setTimeout(180_000);
    const directory = newProfileDirectory();
    const context = await launchProfile(directory);
    const page = await context.newPage();
    await seedStorage(page, {
      progress: progressWith((p) => {
        p.counters.totalCandies = 30;
      }),
    });
    await openGame(page, { seed: SEED_GAME });
    await playAndEat(page, 2);
    // L'état est enregistré à chaque bonbon mangé…
    await expect
      .poll(async () => (await readStorage(page)).pendingGame)
      .toContain('"candiesEaten":2');
    // …et à chaque mise en pause.
    await page.getByRole('button', { name: 'Pause', exact: true }).tap();
    await expect.poll(async () => (await readStorage(page)).pendingGame).toContain('"score":2');
    await context.close();

    for (const launch of [1, 2, 3]) {
      const reopened = await launchProfile(directory);
      const next = await reopened.newPage();
      await openGame(next);
      if (launch === 1) {
        await expect(page.getByRole('dialog'))
          .toHaveCount(0)
          .catch(() => undefined);
        await expect(next.getByRole('dialog', { name: 'Partie interrompue' })).toContainText(
          '(Classique, 2 points)',
        );
        await next.getByRole('button', { name: 'Continuer' }).tap();
        await expect(next.locator('.end')).toBeVisible();
      } else {
        // Réouverture suivante : rien n'est rejoué ni recompté.
        await expect(next.getByRole('button', { name: 'Jouer' })).toBeVisible();
        await expect(next.getByRole('dialog')).toHaveCount(0);
      }
      const stored = (await readProgress(next))!;
      expect(stored.counters.totalCandies).toBe(32);
      expect(stored.counters.gamesByMode.classic).toBe(1);
      await reopened.close();
    }
  });

  test('CA-4 : un skin débloqué par la partie interrompue est annoncé après le message, une seule fois', async () => {
    const directory = newProfileDirectory();
    const context = await launchProfile(directory);
    const page = await context.newPage();
    const progress = progressWith((p) => {
      p.counters.totalCandies = 95;
      p.skins.unlocked = [
        'shape-rings',
        'pattern-plain',
        'pattern-dots',
        'trail-none',
        'decor-starry-night',
      ];
    });
    await openWith(page, { progress, pending: pending(6) });
    const notice = page.getByRole('dialog', { name: 'Partie interrompue' });
    await expect(notice.locator('p')).toHaveText([
      'Votre dernière partie (Classique, 6 points) a été interrompue ; elle a été enregistrée.',
      "Nouveau skin débloqué : Poussière d'étoiles",
    ]);
    await page.getByRole('button', { name: 'Continuer' }).tap();
    await expect(page.locator('.end')).toBeVisible();
    expect((await readProgress(page))!.skins.unlocked).toContain('trail-stardust');
    await context.close();

    const reopened = await launchProfile(directory);
    const next = await reopened.newPage();
    await openGame(next);
    await expect(next.getByRole('button', { name: 'Jouer' })).toBeVisible();
    await expect(next.getByText('Nouveau skin débloqué')).toHaveCount(0);
    await reopened.close();
  });

  test('HYP-51 : une partie Zen interrompue à 400 bonbons (plus que les 288 cases) ajoute 400 au total, sans troncature', async ({
    page,
  }) => {
    const problems = watchProblems(page);
    const progress = progressWith((p) => {
      p.counters.totalCandies = 30;
    });
    await openWith(page, {
      progress,
      pending: { mode: 'zen', score: 400, candiesEaten: 400, dateTime: SEED_DATE },
    });
    await expect(page.getByRole('dialog', { name: 'Partie interrompue' })).toContainText(
      '(Zen, 400 points)',
    );
    await continueAfterInterruption(page);
    expect((await readProgress(page))!.counters.totalCandies).toBe(430);
    expect((await readStorage(page)).pendingGame).toBeUndefined();
    expect(problems).toEqual([]);
  });

  test('HYP-51 : 9 999 bonbons mangés sont acceptés et comptés en entier', async ({ page }) => {
    const problems = watchProblems(page);
    await openWith(page, {
      progress: progressWith((p) => {
        p.counters.totalCandies = 30;
      }),
      pending: { mode: 'zen', score: 9999, candiesEaten: 9999, dateTime: SEED_DATE },
    });
    await continueAfterInterruption(page);
    expect((await readProgress(page))!.counters.totalCandies).toBe(10_029);
    expect(problems).toEqual([]);
  });

  for (const eaten of [10_000, -1]) {
    test(`HYP-51 : ${eaten} bonbons mangés (hors plage) ne sont jamais comptés, le jeu démarre normalement`, async ({
      page,
    }) => {
      const problems = watchProblems(page);
      const progress = progressWith((p) => {
        p.counters.totalCandies = 30;
      });
      await openWith(page, {
        progress,
        pending: JSON.stringify({
          mode: 'zen',
          score: 5,
          candiesEaten: eaten,
          dateTime: SEED_DATE,
        }),
      });
      await expect(page.getByRole('button', { name: 'Jouer' })).toBeVisible();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      const stored = (await readProgress(page))!;
      expect(stored.counters.totalCandies).toBe(30);
      expect(stored.counters.gamesByMode.zen).toBe(0);
      expect(problems).toEqual([]);
    });
  }

  test('ct_43_skins_deblocage : une partie interrompue à 15 points débloque la Comète', async ({
    page,
  }) => {
    await openWith(page, { pending: pending(15) });
    await expect(page.getByRole('dialog', { name: 'Partie interrompue' })).toContainText(
      'Nouveau skin débloqué : Comète',
    );
  });

  test('ct_43_skins_deblocage : à 14 points, la Comète reste verrouillée', async ({ page }) => {
    await openWith(page, { pending: pending(14) });
    const notice = page.getByRole('dialog', { name: 'Partie interrompue' });
    await expect(notice).toContainText('(Classique, 14 points)');
    await expect(notice).not.toContainText('Comète');
    expect((await readProgress(page))!.skins.unlocked).not.toContain('shape-comet');
  });
});

const E08 =
  "La progression n'a pas pu être enregistrée sur ce téléphone. Libérez de l'espace puis rejouez : elle sera réenregistrée. (E-08)";

test('ct_79_codes_d_erreur : E-08 quand la progression ne s’écrit pas, écran de fin conservé, réécrite à la fois suivante', async ({
  page,
}) => {
  const problems = watchProblems(page);
  // Sonde : le stockage refuse les écritures (quota) tant que le drapeau est levé.
  await page.addInitScript({
    content: `
      window.__refuse = true;
      const put = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (...args) {
        if (window.__refuse) throw new DOMException('quota', 'QuotaExceededError');
        return put.apply(this, args);
      };
    `,
  });
  const refuse = (value: boolean): Promise<void> =>
    page.evaluate((flag) => {
      (window as unknown as { __refuse: boolean }).__refuse = flag;
    }, value);
  await openGame(page, { seed: SEED_GAME });
  await startClassic(page);
  await runFor(page, 50);
  await abandon(page);
  // L'écran de fin reste affiché et E-08 apparaît sans bloquer, avec l'icône « ! », pendant 8 s.
  await expect(page.locator('.end')).toBeVisible();
  await expect(page.locator('.toast-text')).toHaveText(E08);
  await expect(page.locator('.toast-icon')).toHaveText('!');
  await expect(page.locator('.toast-icon')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.getByRole('button', { name: 'Rejouer' })).toBeEnabled();
  expect(await readProgress(page)).toBeNull();
  await runFor(page, 7900);
  await expect(page.locator('.toast')).toHaveCount(1);
  await runFor(page, 200);
  await expect(page.locator('.toast')).toHaveCount(0);
  // La progression est gardée en mémoire : la partie suivante réécrit les deux parties, sans nouveau message.
  await refuse(false);
  await page.getByRole('button', { name: 'Rejouer' }).tap();
  await runFor(page, 50);
  await abandon(page);
  await expect(page.locator('.end')).toBeVisible();
  await expect(page.locator('.toast')).toHaveCount(0);
  // EF-16 CA-4 : après fermeture et réouverture du jeu, les deux parties sont comptées.
  await page.goto('about:blank');
  await openGame(page);
  await expect(page.getByRole('button', { name: 'Jouer' })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect((await readProgress(page))?.counters.gamesByMode.classic).toBe(2);
  expect(problems).toEqual([]);
});

test('ct_79_codes_d_erreur : connexion IndexedDB fermée par le navigateur — la base est rouverte, la fin de partie enregistrée, sans E-08', async ({
  page,
}) => {
  const problems = watchProblems(page);
  // Sonde : la prochaine ouverture de transaction échoue comme sur une connexion fermée.
  await page.addInitScript({
    content: `
      window.__closed = false;
      const transaction = IDBDatabase.prototype.transaction;
      IDBDatabase.prototype.transaction = function (...args) {
        if (window.__closed) {
          window.__closed = false;
          throw new DOMException('La connexion est fermée.', 'InvalidStateError');
        }
        return transaction.apply(this, args);
      };
    `,
  });
  await openGame(page, { seed: SEED_GAME });
  await startClassic(page);
  await runFor(page, 50);
  await abandon(page);
  await expect(page.locator('.end')).toBeVisible();
  expect((await readProgress(page))?.counters.gamesByMode.classic).toBe(1);
  await page.getByRole('button', { name: 'Rejouer' }).tap();
  await runFor(page, 50);
  await page.getByRole('button', { name: 'Pause', exact: true }).tap();
  await expect.poll(async () => (await readStorage(page)).pendingGame).toContain('"score":0');
  // La connexion se ferme : l'écriture de la fin de partie est la première à la rencontrer.
  await page.evaluate(() => {
    (window as unknown as { __closed: boolean }).__closed = true;
  });
  await page.getByRole('button', { name: 'Abandonner' }).tap();
  await page.getByRole('button', { name: 'Oui' }).tap();
  await expect(page.locator('.end')).toBeVisible();
  await expect(page.locator('.toast')).toHaveCount(0);
  expect((await readProgress(page))?.counters.gamesByMode.classic).toBe(2);
  expect(await page.evaluate(() => (window as unknown as { __closed: boolean }).__closed)).toBe(
    false,
  );
  expect(problems).toEqual([]);
});

test('ct_79_codes_d_erreur : connexion IndexedDB fermée pendant l’écriture — la base est rouverte et l’écriture réessayée, sans E-08', async ({
  page,
}) => {
  const problems = watchProblems(page);
  // Sonde : la prochaine écriture est interrompue par la fermeture de la connexion, comme sur WebKit après un
  // passage en arrière-plan : l'événement `close` arrive et la transaction est annulée.
  await page.addInitScript({
    content: `
      window.__interrupted = 0;
      window.__armed = false;
      const transaction = IDBDatabase.prototype.transaction;
      IDBDatabase.prototype.transaction = function (...args) {
        const created = transaction.apply(this, args);
        if (window.__armed && args[1] === 'readwrite') {
          window.__armed = false;
          window.__interrupted += 1;
          queueMicrotask(() => {
            this.dispatchEvent(new Event('close'));
            created.abort();
          });
        }
        return created;
      };
    `,
  });
  await openGame(page, { seed: SEED_GAME });
  await startClassic(page);
  await runFor(page, 50);
  await page.evaluate(() => {
    (window as unknown as { __armed: boolean }).__armed = true;
  });
  await abandon(page);
  await expect(page.locator('.end')).toBeVisible();
  await expect(page.locator('.toast')).toHaveCount(0);
  expect(
    await page.evaluate(() => (window as unknown as { __interrupted: number }).__interrupted),
  ).toBe(1);
  expect((await readProgress(page))?.counters.gamesByMode.classic).toBe(1);
  expect(problems).toEqual([]);
});

test('ct_125_controle_des_dates : HYP-49, une date de record dans le futur ne fait pas rejeter la progression locale', async ({
  page,
}) => {
  const problems = watchProblems(page);
  const progress = progressWith((p) => {
    p.records.classic = [record('Coco', 20, '2031-05-01T10:00:00')];
    p.lastName = 'Coco';
  });
  await openWith(page, { progress });
  await expect(page.getByRole('button', { name: 'Jouer' })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await openRecords(page);
  expect(await recordRows(page)).toEqual(['1. | Coco | 20 | 01/05/2031']);
  expect(problems).toEqual([]);
});

test.describe('ct_79_codes_d_erreur : progression illisible, repli et E-05 (RG-84)', () => {
  const good = (): ProgressData =>
    progressWith((p) => {
      p.records.classic = [record('Coco', 20)];
      p.lastName = 'Coco';
    });

  /** Texte d'une progression valide, abîmé de plusieurs façons. */
  async function corruptions(): Promise<Record<string, string>> {
    const { serializeEnvelope } = await import('../../src/core/savefile.ts');
    const text = await serializeEnvelope(good(), '2026-10-30T09:00:00');
    return {
      'un caractère modifié': text.replace('"score":20', '"score":21'),
      'JSON tronqué': text.slice(0, text.length - 15),
      'clé __proto__': text.replace('{"format"', '{"__proto__":{"polluted":true},"format"'),
      '100 000 crochets imbriqués': '['.repeat(100_000),
      'texte quelconque': 'ceci n’est pas une progression',
    };
  }

  test('progress abîmée : la dernière version lisible est reprise, sans message', async ({
    page,
  }) => {
    const problems = watchProblems(page);
    const cases = await corruptions();
    for (const [label, broken] of Object.entries(cases)) {
      await page.goto('about:blank');
      await openWith(page, { progress: broken, previous: good() });
      await expect(page.getByRole('button', { name: 'Jouer' }), label).toBeVisible();
      await expect(page.getByRole('dialog'), label).toHaveCount(0);
      await openRecords(page);
      expect(await recordRows(page), label).toEqual(['1. | Coco | 20 | 31/10/2026']);
      // Aucune pollution de prototype.
      expect(
        await page.evaluate(() => [
          Object.keys(Object.prototype).length,
          ({} as Record<string, unknown>)['polluted'],
        ]),
        label,
      ).toEqual([0, undefined]);
    }
    expect(problems).toEqual([]);
  });

  test('les deux emplacements abîmés : valeurs par défaut et message E-05 en rôle alert', async ({
    page,
  }) => {
    const problems = watchProblems(page);
    const cases = await corruptions();
    for (const [label, broken] of Object.entries(cases)) {
      await page.goto('about:blank');
      await openWith(page, { progress: broken, previous: cases['JSON tronqué'] });
      await expect(page.getByRole('alert'), label).toHaveText(E05);
      await expect(page.getByRole('dialog'), label).toBeVisible();
      // Erreur : icône « ! » + texte + code (05 § 6) ; l'icône est masquée aux lecteurs d'écran.
      const icon = page.getByRole('dialog').locator('.toast-icon');
      await expect(icon, label).toHaveText('!');
      await expect(icon, label).toHaveAttribute('aria-hidden', 'true');
      await page.getByRole('button', { name: 'Compris' }).tap();
      await expect(page.getByRole('button', { name: 'Jouer' }), label).toBeVisible();
      await openRecords(page);
      await expect(page.locator('.records-empty'), label).toBeVisible();
      expect(await page.evaluate(() => Object.keys(Object.prototype).length), label).toBe(0);
    }
    expect(problems).toEqual([]);
  });

  test('après E-05, le jeu repart des valeurs par défaut et enregistre normalement', async ({
    page,
  }) => {
    await openWith(page, { progress: 'illisible', previous: 'illisible aussi' });
    await page.getByRole('button', { name: 'Compris' }).tap();
    await startClassic(page);
    await runFor(page, 50);
    await page.getByRole('button', { name: 'Pause', exact: true }).tap();
    await page.getByRole('button', { name: 'Abandonner' }).tap();
    await page.getByRole('button', { name: 'Oui' }).tap();
    await expect(page.locator('.end')).toBeVisible();
    const stored = (await readProgress(page))!;
    expect(stored.counters.gamesByMode.classic).toBe(1);
    expect(stored.skins.unlocked).toHaveLength(4);
  });

  test('si la progression est sauvegardée à côté d’une version illisible, la version précédente reste la dernière lisible', async ({
    page,
  }) => {
    await openWith(page, { progress: 'illisible', previous: good() });
    await expect(page.getByRole('button', { name: 'Jouer' })).toBeVisible();
    await startClassic(page);
    await runFor(page, 50);
    await page.getByRole('button', { name: 'Pause', exact: true }).tap();
    await page.getByRole('button', { name: 'Abandonner' }).tap();
    await page.getByRole('button', { name: 'Oui' }).tap();
    await expect(page.locator('.end')).toBeVisible();
    const stored = await readStorage(page);
    // La progression reprise (avec « Coco ») devient la version précédente ; la nouvelle la remplace.
    expect(JSON.parse(stored.progressPrevious ?? '{}')).toMatchObject({
      data: { records: { classic: [{ name: 'Coco', score: 20 }] } },
    });
    expect((await readProgress(page))!.counters.gamesByMode.classic).toBe(1);
  });
});

test('ct_80_donnees_locales : seule la base du jeu est écrite, persist() demandé à chaque lancement tant qu’il n’est pas accordé', async () => {
  const directory = newProfileDirectory();
  for (const granted of [false, false, false, true]) {
    const context = await launchProfile(directory);
    await context.addInitScript((accorded) => {
      const calls = { persist: 0 };
      Object.defineProperty(window, '__persist', { value: calls });
      navigator.storage.persisted = () => Promise.resolve(accorded);
      navigator.storage.persist = () => {
        calls.persist += 1;
        return Promise.resolve(accorded);
      };
    }, granted);
    const page = await context.newPage();
    await openGame(page);
    await expect(page.getByRole('button', { name: 'Jouer' })).toBeVisible();
    const calls = await page.evaluate(
      () => (window as unknown as { __persist: { persist: number } }).__persist.persist,
    );
    expect(calls).toBe(granted ? 0 : 1);
    await context.close();
  }

  const context = await launchProfile(directory);
  const page = await context.newPage();
  await seedStorage(page, { pending: pending(2) });
  await openGame(page);
  await page.getByRole('button', { name: 'Continuer' }).tap();
  await expect(page.locator('.end')).toBeVisible();
  const inventory = await page.evaluate(async () => ({
    databases: (await indexedDB.databases()).map((database) => database.name),
    localStorage: localStorage.length,
    sessionStorage: sessionStorage.length,
    cookie: document.cookie,
  }));
  expect(inventory).toEqual({
    databases: ['serpent-cosmique'],
    localStorage: 0,
    sessionStorage: 0,
    cookie: '',
  });
  // Cache Storage ne contient que le cache des fichiers du jeu, rempli par l'agent de service.
  await expect.poll(() => page.evaluate(() => caches.keys())).toEqual(['serpent-cosmique-1.0.0']);
  const stored = await readStorage(page);
  expect(Object.keys(stored)).toEqual(['progress']);
  expect(Object.keys(JSON.parse(stored.progress ?? '{}') as object)).toEqual([
    'format',
    'formatVersion',
    'createdAt',
    'data',
    'checksum',
  ]);
  await context.close();
});

test('ct_36_fermetures_forcees : 20 fermetures pendant une partie, juste après un record, juste après un nom — aucune perte', async () => {
  test.setTimeout(420_000);
  const directory = newProfileDirectory();
  // Ce que la progression enregistrée doit contenir à chaque réouverture.
  const expected = { games: 0, candies: 0, names: [] as string[] };
  let lastName = '';
  let interrupted = false;

  for (let round = 0; round < 20; round += 1) {
    // 0 : pause en pleine partie ; 1 : juste après un record ; 2 : juste après un nom validé.
    const kind = [0, 1, 2, 0][round % 4];
    const context = await launchProfile(directory);
    const page = await context.newPage();
    const problems = watchProblems(page);
    await openGame(page, { seed: SEED_GAME });
    if (interrupted) {
      // La partie interrompue au tour précédent est clôturée à ce lancement (0 point : pas de record).
      await continueAfterInterruption(page);
      interrupted = false;
    }
    await expect(page.getByRole('button', { name: 'Jouer' }), `tour ${round}`).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    if (round > 0) {
      const stored = (await readProgress(page))!;
      expect(stored.counters.gamesByMode.classic, `tour ${round}`).toBe(expected.games);
      expect(stored.counters.totalCandies, `tour ${round}`).toBe(expected.candies);
      expect(
        stored.records.classic.map((entry) => entry.name),
        `tour ${round}`,
      ).toEqual(expected.names);
      expect(stored.lastName, `tour ${round}`).toBe(lastName);
    }

    if (kind === 0) {
      await startClassic(page);
      await runFor(page, 50);
      await page.getByRole('button', { name: 'Pause', exact: true }).tap();
      await expect.poll(async () => (await readStorage(page)).pendingGame).toContain('"score":0');
      expected.games += 1;
      interrupted = true;
    } else {
      await playAndEat(page, 1);
      await abandon(page);
      await expect(page.locator('.end-record')).toBeVisible();
      expected.games += 1;
      expected.candies += 1;
      lastName = lastName === '' ? 'Joueur' : lastName;
      expected.names.push(lastName);
      if (kind === 2) {
        lastName = `Nom${round}`;
        await nameField(page).fill(lastName);
        await page.getByRole('button', { name: 'Valider' }).tap();
        await expect(page.locator('.name-saved')).toHaveText(`Nom enregistré : ${lastName}`);
        expected.names[expected.names.length - 1] = lastName;
      }
    }
    expect(problems, `tour ${round}`).toEqual([]);
    // Fermeture forcée : aucune page ne réagit.
    await context.close();
  }
});

test.describe('ct_117_analyse_axe : écrans de la progression', () => {
  test('E6 Fin de partie avec saisie du nom, déblocage et record', async ({ page }) => {
    const progress = progressWith((p) => {
      p.counters.totalCandies = 99;
      p.skins.unlocked = [
        'shape-rings',
        'pattern-plain',
        'pattern-dots',
        'trail-none',
        'decor-starry-night',
      ];
    });
    await reachEndScreen(page, { progress, pending: pending(3) });
    expect(await seriousViolations(page)).toEqual([]);
    await nameField(page).fill('Léa');
    await page.getByRole('button', { name: 'Valider' }).tap();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('E7 Records, vide puis plein', async ({ page }) => {
    await openGame(page);
    await openRecords(page);
    expect(await seriousViolations(page)).toEqual([]);
    await page.goto('about:blank');
    await openWith(page, {
      progress: progressWith((p) => {
        p.records.classic = Array.from({ length: 10 }, (_, index) =>
          record(`Joueur ${index + 1}`, 20 - index),
        );
      }),
    });
    await openRecords(page);
    await expect(page.locator('.records-row')).toHaveCount(10);
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('E13 Messages au lancement : partie interrompue et progression illisible', async ({
    page,
  }) => {
    await openWith(page, { pending: pending(15) });
    await expect(page.getByRole('dialog', { name: 'Partie interrompue' })).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
    await page.goto('about:blank');
    await openWith(page, { progress: 'illisible' });
    await expect(page.getByRole('alert')).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });
});
