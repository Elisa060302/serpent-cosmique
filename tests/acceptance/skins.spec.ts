import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { createGame, step } from '../../src/core/engine.ts';
import { findPath } from '../support/pilote.ts';
import { sameCell } from '../../src/core/board.ts';
import { CONSTELLATION_MODE } from '../../src/core/modes/constellation.ts';
import { createRandom } from '../../src/core/random.ts';
import {
  CANDY_COLORS,
  DECORS,
  GRID,
  RAINBOW_COLORS,
  SKINS,
  SKY,
  TWINKLE,
} from '../../src/core/rules.ts';
import type { SkinCategory, SkinId } from '../../src/core/rules.ts';
import { inCatalogueOrder } from '../../src/core/skins.ts';
import type { CandyColorId, Cell, ProgressData } from '../../src/core/types.ts';
import { luminance } from '../support/contraste.ts';
import { validBackup } from '../fixtures/saves/corpus.ts';
import {
  drive,
  openGame,
  runFor,
  seriousViolations,
  skipCountdown,
  startClassic,
  startMode,
  stepOnce,
  watchProblems,
} from './support/jeu.ts';
import { chooseFile, openSave } from './support/fichiers.ts';
import { progressWith, readProgress, readStorage, seedStorage } from './support/sauvegarde.ts';

const STARDUST = "Poussière d'étoiles";
const PINK = CANDY_COLORS[0].hex;
const CATEGORIES: [SkinCategory, string][] = [
  ['shape', 'Forme'],
  ['pattern', 'Motif'],
  ['trail', 'Traînée'],
  ['decor', 'Décor'],
];

/** Comète et Poussière d'étoiles débloquées, 63 bonbons mangés (précondition de CT-45). */
function owned(): ProgressData {
  return progressWith((p) => {
    p.skins.unlocked = inCatalogueOrder([...p.skins.unlocked, 'shape-comet', 'trail-stardust']);
    p.counters.totalCandies = 63;
  });
}

function everything(selected: Partial<Record<SkinCategory, SkinId>> = {}): ProgressData {
  return progressWith((p) => {
    p.skins.unlocked = inCatalogueOrder(SKINS.map((skin) => skin.id));
    p.skins.selected = { ...p.skins.selected, ...selected };
  });
}

async function openWith(page: Page, progress: ProgressData | undefined): Promise<void> {
  if (progress !== undefined) await seedStorage(page, { progress });
  await openGame(page);
}

/** Menu → « Skins » : un toucher. */
async function openSkins(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Skins', exact: true }).tap();
  await expect(page.getByRole('heading', { name: 'Skins', level: 1 })).toBeVisible();
}

async function openTab(page: Page, name: string): Promise<void> {
  const tab = page.getByRole('tab', { name, exact: true });
  await tab.tap();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
}

const skin = (page: Page, name: string): Locator => page.getByRole('radio', { name });
const toast = (page: Page) => page.locator('.toast');

/** Couleurs (#RRGGBB) de quelques points d'une case du canevas de la partie, en fractions de la case. */
async function pixels(page: Page, cell: Cell, points: [number, number][]): Promise<string[]> {
  return page.evaluate(
    ({ columns, at, probes }) => {
      const canvas = document.querySelector('canvas');
      const context = canvas?.getContext('2d');
      if (!canvas || !context) return [];
      const size = canvas.width / columns;
      return probes.map(([u, v]) => {
        const data = context.getImageData(
          Math.floor((at.col - 1 + u) * size),
          Math.floor((at.row - 1 + v) * size),
          1,
          1,
        ).data;
        return `#${[0, 1, 2].map((i) => (data[i] ?? 0).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
      });
    },
    { columns: GRID.columns, at: cell, probes: points },
  );
}

/** Vrai pour un pixel de décor ou d'ombre : tous les détails de décor sont sombres (canal de 0x8F au plus). */
const isDark = (hex: string): boolean =>
  Math.max(...[1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16))) < 0x90;

test.describe('ct_42_skins_premier_lancement : écran Skins au premier lancement (EF-19 CA-2, EF-20 RG-59)', () => {
  test('seuls Anneaux, Uni, Aucune et Nuit étoilée sont débloqués et choisis ; 12 skins verrouillés avec condition et progression', async ({
    page,
  }) => {
    const problems = watchProblems(page);
    await openGame(page);
    await openSkins(page);
    const defaults = ['Anneaux', 'Uni', 'Aucune', 'Nuit étoilée'];
    let locked = 0;
    for (const [index, [, name]] of CATEGORIES.entries()) {
      await openTab(page, name);
      // Une seule catégorie est active : les autres onglets ne le sont pas.
      await expect(page.locator('[role=tab][aria-selected=true]')).toHaveCount(1);
      await expect(page.getByRole('radio')).toHaveCount(4);
      const chosen = page.getByRole('radio', { checked: true });
      await expect(chosen).toHaveCount(1);
      await expect(chosen).toContainText(defaults[index] ?? '');
      await expect(chosen).toContainText('Choisi');
      await expect(chosen.locator('.skin-marker')).toHaveText('✓');
      await expect(chosen).not.toHaveAttribute('aria-disabled', 'true');
      for (const row of await page.getByRole('radio', { checked: false }).all()) {
        await expect(row).toHaveAttribute('aria-disabled', 'true');
        await expect(row).toContainText('Verrouillé');
        await expect(row.locator('.skin-marker')).toHaveText('🔒');
        await expect(row.locator('.skin-condition')).not.toBeEmpty();
        await expect(row.locator('.skin-progress')).toHaveText(
          /^(0 \/ [\d\u00a0]+ bonbons|meilleur score : 0 \/ \d+|0 \/ 7 modes)$/,
        );
        locked += 1;
      }
    }
    expect(locked).toBe(12);
    // Textes de RG-54 et de RG-59, mot pour mot.
    await openTab(page, 'Forme');
    await expect(skin(page, 'Comète').locator('.skin-condition')).toHaveText(
      'Atteindre 15 points dans une partie Classique',
    );
    await expect(skin(page, 'Comète').locator('.skin-progress')).toHaveText(
      'meilleur score : 0 / 15',
    );
    await expect(skin(page, 'Fusée').locator('.skin-progress')).toHaveText('0 / 250 bonbons');
    expect(problems).toEqual([]);
  });

  test('« Retour » ramène au menu, le focus sur « Skins » ; le bouton retour du téléphone aussi', async ({
    page,
  }) => {
    await openGame(page);
    await openSkins(page);
    await page.getByRole('button', { name: '‹ Retour' }).tap();
    await expect(page.getByRole('button', { name: 'Jouer' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Skins', exact: true })).toBeFocused();
    await openSkins(page);
    await page.goBack();
    await expect(page.getByRole('button', { name: 'Jouer' })).toBeVisible();
    await openSkins(page);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Jouer' })).toBeVisible();
  });
});

test.describe('ct_45_choix_des_skins : choix, retrait et skin verrouillé refusé (EF-20 CA-1, CA-2, CA-3)', () => {
  test('CA-1 : la Comète choisie est enregistrée aussitôt, annoncée, et le serpent de la partie suivante est une comète rose', async ({
    page,
  }) => {
    const problems = watchProblems(page);
    await openWith(page, owned());
    await openSkins(page);
    const comet = skin(page, 'Comète');
    await expect(comet).toContainText('Débloqué');
    await comet.tap();
    await expect(comet).toHaveAttribute('aria-checked', 'true');
    await expect(comet).toContainText('Choisi');
    await expect(toast(page)).toHaveText(
      'Skin choisi : Comète. Il sera utilisé à la prochaine partie.',
    );
    await expect(page.getByRole('status')).toHaveText(
      'Skin choisi : Comète. Il sera utilisé à la prochaine partie.',
    );
    // Enregistré aussitôt, et seul le choix de la catégorie a changé.
    const stored = (await readProgress(page))!;
    expect(stored.skins.selected).toEqual({
      shape: 'shape-comet',
      pattern: 'pattern-plain',
      trail: 'trail-none',
      decor: 'decor-starry-night',
    });
    expect(stored.skins.unlocked).toEqual(owned().skins.unlocked);
    await expect(page.getByRole('radio', { name: 'Anneaux' })).toHaveAttribute(
      'aria-checked',
      'false',
    );

    await page.getByRole('button', { name: '‹ Retour' }).tap();
    await startClassic(page);
    await runFor(page, 50);
    // Tête et anneaux roses ; la queue est un petit disque (un anneau carré arrondi remplirait ce point).
    const head = await pixels(page, { col: 6, row: 6 }, [[0.5, 0.5]]);
    const body = await pixels(page, { col: 5, row: 6 }, [[0.5, 0.5]]);
    const tail = await pixels(page, { col: 3, row: 6 }, [
      [0.5, 0.5],
      [0.5, 0.2],
    ]);
    expect([head[0], body[0], tail[0]]).toEqual([PINK, PINK, PINK]);
    expect(isDark(tail[1] ?? '')).toBe(true);
    expect(problems).toEqual([]);
  });

  test('avec les anneaux par défaut, le même point de la queue est rempli (la forme change bien le dessin)', async ({
    page,
  }) => {
    await openGame(page);
    await startClassic(page);
    await runFor(page, 50);
    expect(await pixels(page, { col: 3, row: 6 }, [[0.5, 0.2]])).toEqual([PINK]);
  });

  test('CA-2 : la Fusée verrouillée, touchée, n’est pas choisie ; sa condition et « 63 / 250 bonbons » sont affichées et annoncées', async ({
    page,
  }) => {
    await openWith(page, owned());
    const before = await readStorage(page);
    await openSkins(page);
    const rocket = skin(page, 'Fusée');
    await expect(rocket).toContainText('Verrouillé');
    await expect(rocket).toContainText('250 bonbons mangés au total');
    await expect(rocket).toContainText('63 / 250 bonbons');
    await rocket.tap({ force: true });
    await expect(rocket).toHaveAttribute('aria-checked', 'false');
    await expect(rocket).toHaveClass(/is-highlighted/);
    await expect(page.getByRole('radio', { name: 'Anneaux' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(page.getByRole('status')).toHaveText(
      'Fusée : 250 bonbons mangés au total : 63 / 250 bonbons',
    );
    await expect(toast(page)).toHaveCount(0);
    expect(await readStorage(page)).toEqual(before);
  });

  test("CA-3 : la traînée Poussière d'étoiles choisie, « Retirer » choisit « Aucune » pour la partie suivante", async ({
    page,
  }) => {
    await openWith(page, owned());
    await openSkins(page);
    await openTab(page, 'Traînée');
    // « Retirer » n'apparaît que sur un skin choisi qui n'est pas celui par défaut.
    await expect(page.getByRole('button', { name: 'Retirer' })).toHaveCount(0);
    await skin(page, STARDUST).tap();
    await expect(skin(page, STARDUST)).toHaveAttribute('aria-checked', 'true');
    expect((await readProgress(page))!.skins.selected.trail).toBe('trail-stardust');
    await expect(page.getByRole('button', { name: 'Retirer' })).toHaveCount(1);
    await page.getByRole('button', { name: 'Retirer' }).tap();
    await expect(skin(page, 'Aucune')).toHaveAttribute('aria-checked', 'true');
    await expect(skin(page, STARDUST)).toHaveAttribute('aria-checked', 'false');
    await expect(skin(page, STARDUST)).toContainText('Débloqué');
    await expect(page.getByRole('button', { name: 'Retirer' })).toHaveCount(0);
    const stored = (await readProgress(page))!;
    expect(stored.skins.selected.trail).toBe('trail-none');
    // Retirer ne reverrouille rien (RG-57).
    expect(stored.skins.unlocked).toContain('trail-stardust');
  });

  test('le choix est conservé après rechargement, et chaque onglet montre son skin choisi', async ({
    page,
  }) => {
    await openWith(page, everything());
    await openSkins(page);
    await skin(page, 'Soucoupe').tap();
    await openTab(page, 'Motif');
    await skin(page, 'Étoiles').tap();
    await openTab(page, 'Décor');
    await skin(page, 'Voie lactée').tap();
    // Enregistré aussitôt : le rechargement ne laisse pas d'écriture en attente.
    await expect
      .poll(async () => (await readProgress(page))?.skins.selected.decor)
      .toBe('decor-milky-way');
    await page.clock.resume();
    await page.reload();
    await page.clock.pauseAt(new Date(Date.now() + 60_000));
    await openSkins(page);
    for (const [category, name] of [
      ['Forme', 'Soucoupe'],
      ['Motif', 'Étoiles'],
      ['Traînée', 'Aucune'],
      ['Décor', 'Voie lactée'],
    ] as const) {
      await openTab(page, category);
      await expect(page.getByRole('radio', { checked: true })).toContainText(name);
    }
  });

  test('un seul onglet est actif ; les flèches du clavier passent d’un onglet à l’autre', async ({
    page,
  }) => {
    await openGame(page);
    await openSkins(page);
    const first = page.getByRole('tab', { name: 'Forme', exact: true });
    await first.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'Motif', exact: true })).toBeFocused();
    await expect(page.getByRole('tab', { selected: true })).toHaveText('Motif');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByRole('tab', { selected: true })).toHaveText('Décor');
  });

  test('un skin débloqué par une partie interrompue est annoncé puis peut être choisi (EF-19 CA-1)', async ({
    page,
  }) => {
    const progress = progressWith((p) => {
      p.counters.totalCandies = 99;
    });
    await seedStorage(page, {
      progress,
      pending: { mode: 'classic', score: 1, candiesEaten: 1, dateTime: '2026-10-31T18:00:00' },
    });
    await openGame(page);
    await expect(page.getByRole('dialog', { name: 'Partie interrompue' })).toContainText(
      `Nouveau skin débloqué : ${STARDUST}`,
    );
    await page.getByRole('button', { name: 'Continuer' }).tap();
    await expect(page.locator('.end-unlocks')).toContainText(`Nouveau skin débloqué : ${STARDUST}`);
    await page.getByRole('button', { name: 'Menu' }).tap();
    await openSkins(page);
    await openTab(page, 'Traînée');
    await skin(page, STARDUST).tap();
    await expect(skin(page, STARDUST)).toHaveAttribute('aria-checked', 'true');
  });
});

test.describe('ct_44_skin_definitif_restauration : un skin débloqué le reste (EF-19 CA-3, RG-57)', () => {
  test('la restauration d’une sauvegarde qui ne contient pas la traînée la laisse débloquée', async ({
    page,
  }) => {
    const local = progressWith((p) => {
      p.skins.unlocked = inCatalogueOrder([...p.skins.unlocked, 'trail-stardust']);
      p.skins.selected.trail = 'trail-stardust';
      p.counters.totalCandies = 100;
    });
    const incoming = progressWith((p) => {
      p.skins.unlocked = inCatalogueOrder([...p.skins.unlocked, 'pattern-dots']);
      p.counters.totalCandies = 30;
    });
    await openWith(page, local);
    await openSave(page);
    await chooseFile(page, { bytes: Buffer.from(await validBackup(incoming)) });
    await page.getByRole('dialog').getByRole('button', { name: 'Fusionner' }).tap();
    await expect(toast(page)).toBeVisible();
    await page.getByRole('button', { name: '‹ Retour' }).tap();
    await openSkins(page);
    // Les skins choisis du fichier remplacent les vôtres, mais aucun skin débloqué n'est retiré (RG-57).
    await openTab(page, 'Traînée');
    await expect(skin(page, STARDUST)).toContainText('Débloqué');
    await expect(skin(page, 'Aucune')).toContainText('Choisi');
    await openTab(page, 'Motif');
    await expect(skin(page, 'Pois de sucre')).toContainText('Débloqué');
  });
});

/** Les 16 combinaisons de forme et de motif, le serpent au départ : rose, et rien d’autre que ses nuances. */
const SHAPES = SKINS.filter((entry) => entry.category === 'shape').map((entry) => entry.id);
const PATTERNS = SKINS.filter((entry) => entry.category === 'pattern').map((entry) => entry.id);

test.describe('ct_45_choix_des_skins : avec chaque forme et chaque motif, le serpent est rose au départ (EF-04 CA-3, RG-18)', () => {
  for (const shape of SHAPES) {
    for (const pattern of PATTERNS) {
      test(`${shape} avec ${pattern}`, async ({ page }) => {
        await openWith(page, everything({ shape, pattern }));
        await startClassic(page);
        await runFor(page, 50);
        const report = await page.evaluate(
          ({ columns, base }) => {
            const canvas = document.querySelector('canvas');
            const context = canvas?.getContext('2d');
            if (!canvas || !context) return { bad: ['pas de canevas'], exact: 0 };
            const size = canvas.width / columns;
            const target = [1, 3, 5].map((offset) => parseInt(base.slice(offset, offset + 2), 16));
            const dark = [0x0b, 0x10, 0x26];
            const bad = new Set<string>();
            let exact = 0;
            // Les trois anneaux du corps (colonnes 3 à 5, ligne 6), sans la tête ni ses yeux.
            for (const col of [3, 4, 5]) {
              const left = Math.floor((col - 1 + 0.2) * size);
              const top = Math.floor((6 - 1 + 0.2) * size);
              const width = Math.floor(0.6 * size);
              const data = context.getImageData(left, top, width, width).data;
              for (let index = 0; index < data.length; index += 4) {
                const pixel = [data[index] ?? 0, data[index + 1] ?? 0, data[index + 2] ?? 0];
                if (Math.max(...pixel) < 0x90) continue;
                if (pixel.every((value, i) => value === target[i])) exact += 1;
                const onSegment = (from: number[], to: number[]): boolean => {
                  let part: number | null = null;
                  for (let i = 0; i < 3; i += 1) {
                    const start = from[i] ?? 0;
                    const end = to[i] ?? 0;
                    if (start === end) {
                      if (Math.abs((pixel[i] ?? 0) - start) > 3) return false;
                      continue;
                    }
                    const along = ((pixel[i] ?? 0) - start) / (end - start);
                    if (part === null) part = along;
                    else if (Math.abs(along - part) * Math.abs(end - start) > 3) return false;
                  }
                  return true;
                };
                // Nuance de la couleur (jusqu'au blanc), ou bord du contour blanc sur le décor sombre.
                const onLine =
                  onSegment(target, [255, 255, 255]) || onSegment(dark, [255, 255, 255]);
                if (!onLine) {
                  bad.add(pixel.map((v) => v.toString(16).padStart(2, '0')).join(''));
                }
              }
            }
            return { bad: [...bad].slice(0, 5), exact };
          },
          { columns: GRID.columns, base: PINK },
        );
        expect(report.bad).toEqual([]);
        expect(report.exact).toBeGreaterThan(50);
      });
    }
  }

  test('puis chaque forme et chaque motif prennent la couleur du bonbon (violet, rose clair, bleu clair, arc-en-ciel)', async ({
    page,
  }) => {
    await openGame(page);
    const failures = await page.evaluate(
      `(async () => {
        const { drawSnake } = await import('/ui/render/snake.js');
        const input = ${JSON.stringify({
          shapes: SHAPES,
          patterns: PATTERNS,
          colors: [...CANDY_COLORS.slice(1).map((color) => color.id), 'rainbow'],
          hex: Object.fromEntries(CANDY_COLORS.map((color) => [color.id, color.hex])),
          rainbow: RAINBOW_COLORS,
        })};
        const snake = [
          { col: 5, row: 2 }, { col: 4, row: 2 }, { col: 3, row: 2 },
          { col: 3, row: 3 }, { col: 2, row: 3 }, { col: 1, row: 3 },
        ];
        const lines = (hexes) => hexes.map((hex) => [1, 3, 5].map((o) => parseInt(hex.slice(o, o + 2), 16)));
        const onSegment = (pixel, from, to) => {
          let part = null;
          for (let i = 0; i < 3; i += 1) {
            if (from[i] === to[i]) { if (Math.abs(pixel[i] - from[i]) > 8) return false; continue; }
            const along = (pixel[i] - from[i]) / (to[i] - from[i]);
            if (part === null) part = along;
            else if (Math.abs(along - part) * Math.abs(to[i] - from[i]) > 8) return false;
          }
          return true;
        };
        // Nuance de la couleur (jusqu'au blanc), ou bord blanc des yeux et du contour sur le sombre.
        const onLine = (pixel, target) => onSegment(pixel, target, [255, 255, 255]) || onSegment(pixel, [11, 16, 38], [255, 255, 255]);
        const failures = [];
        for (const shape of input.shapes) for (const pattern of input.patterns) for (const color of input.colors) {
          const canvas = document.createElement('canvas');
          canvas.width = 180; canvas.height = 120;
          const context = canvas.getContext('2d');
          drawSnake(context, { snake, direction: 'up', color, steps: 12 }, 30, { shape, pattern });
          const targets = lines(color === 'rainbow' ? input.rainbow : [input.hex[color]]);
          const data = context.getImageData(0, 0, 180, 120).data;
          let exact = 0;
          for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] !== 255) continue;
            const pixel = [data[i], data[i + 1], data[i + 2]];
            if (Math.max(...pixel) < 0x90) continue;
            if (targets.some((target) => target.every((v, k) => v === pixel[k]))) exact += 1;
            if (!targets.some((target) => onLine(pixel, target))) failures.push(shape + ' ' + pattern + ' ' + color + ' ' + pixel.join(','));
          }
          if (exact < 50) failures.push(shape + ' ' + pattern + ' ' + color + ' : couleur absente');
        }
        return failures.slice(0, 10);
      })()`,
    );
    expect(failures).toEqual([]);
  });
});

test.describe('ct_45_choix_des_skins : traînées sous les éléments de jeu, lecture des pixels (RG-61)', () => {
  test("Poussière d'étoiles : des étincelles derrière la queue, jamais sur le serpent", async ({
    page,
  }) => {
    await seedStorage(page, { progress: everything({ trail: 'trail-stardust' }) });
    await openGame(page, { seed: 1 });
    await startClassic(page);
    await runFor(page, 50);
    await skipCountdown(page);
    await stepOnce(page, 1000 / 6);
    await stepOnce(page, 1000 / 6);
    // Les deux cases quittées par la queue (colonnes 3 et 4) portent des étincelles claires.
    const count = await page.evaluate(
      ({ columns, col }) => {
        const canvas = document.querySelector('canvas');
        const context = canvas?.getContext('2d');
        if (!canvas || !context) return 0;
        const size = canvas.width / columns;
        const data = context.getImageData(
          Math.floor((col - 1) * size),
          Math.floor(5 * size),
          Math.floor(size),
          Math.floor(size),
        ).data;
        let light = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (Math.max(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0) >= 0x90) light += 1;
        }
        return light;
      },
      { columns: GRID.columns, col: 3 },
    );
    expect(count).toBeGreaterThan(10);
    // Le serpent reste rose et entier par-dessus.
    const head = (await pixels(page, { col: 8, row: 6 }, [[0.5, 0.5]]))[0];
    expect(head).toBe(PINK);
  });

  test('sans traînée, les cases quittées ne portent que le décor', async ({ page }) => {
    await openGame(page, { seed: 1 });
    await startClassic(page);
    await runFor(page, 50);
    await skipCountdown(page);
    await stepOnce(page, 1000 / 6);
    await stepOnce(page, 1000 / 6);
    const sample = await pixels(page, { col: 3, row: 6 }, [
      [0.2, 0.2],
      [0.5, 0.5],
      [0.8, 0.8],
    ]);
    expect(sample.every(isDark)).toBe(true);
  });
});

test.describe('ct_21_silhouettes_et_contrastes : les 4 décors dessinés (ENF-11, RG-61)', () => {
  test('chaque décor, avec ses 12 constellations et ses étoiles, reste à 0,08 de luminance au plus sur sa couleur de base', async ({
    page,
  }) => {
    await openGame(page);
    const reports = await page.evaluate(
      `(async () => {
        const { renderDecor, drawTwinkle } = await import('/ui/render/decor.js');
        const luminance = (r, g, b) => {
          const part = (v) => { const n = v / 255; return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4; };
          return 0.2126 * part(r) + 0.7152 * part(g) + 0.0722 * part(b);
        };
        const out = {};
        for (const id of ${JSON.stringify(Object.keys(DECORS))}) {
          const sky = renderDecor(24, 1, id, 12);
          const context = sky.getContext('2d');
          drawTwinkle(context, id, 24, 0);
          drawTwinkle(context, id, 24, 700);
          const plain = renderDecor(24, 1, id, 0);
          const count = (canvas, wanted) => {
            const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
            let found = 0; let max = 0; const modes = new Map();
            for (let i = 0; i < data.length; i += 4) {
              const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
              modes.set(key, (modes.get(key) ?? 0) + 1);
              max = Math.max(max, luminance(data[i], data[i + 1], data[i + 2]));
              if (key === wanted) found += 1;
            }
            const [top] = [...modes.entries()].sort((a, b) => b[1] - a[1]);
            return { found, max, top: top[0].toString(16).padStart(6, '0') };
          };
          const wanted = parseInt(${JSON.stringify(SKY.color.slice(1))}, 16);
          out[id] = { sky: count(sky, wanted), plain: count(plain, wanted) };
        }
        return out;
      })()`,
    );
    for (const [id, decor] of Object.entries(DECORS)) {
      const report = (
        reports as Record<
          string,
          Record<'sky' | 'plain', { found: number; max: number; top: string }>
        >
      )[id];
      expect(report, id).toBeDefined();
      if (report === undefined) continue;
      expect(report.plain.max, `${id} : luminance maximale`).toBeLessThanOrEqual(0.08);
      expect(report.sky.max, `${id} avec constellations`).toBeLessThanOrEqual(0.08);
      expect(`#${report.plain.top.toUpperCase()}`).toBe(decor.base.toUpperCase());
      expect(luminance(decor.base)).toBeLessThan(0.02);
      // Les constellations du ciel n'existent qu'une fois complétées.
      expect(report.plain.found).toBe(0);
      expect(report.sky.found).toBeGreaterThan(0);
    }
  });

  for (const [id, decor] of Object.entries(DECORS)) {
    test(`${id} : le décor choisi est celui de la partie`, async ({ page }) => {
      await openWith(page, everything({ decor: id as SkinId }));
      await startClassic(page);
      await runFor(page, 50);
      // Le coin de l'aire de jeu est au fond du décor, loin du serpent et des bonbons éventuels.
      const corner = await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        const context = canvas?.getContext('2d');
        if (!canvas || !context) return [];
        const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
        const counts = new Map<number, number>();
        for (let i = 0; i < data.length; i += 4) {
          const key = ((data[i] ?? 0) << 16) | ((data[i + 1] ?? 0) << 8) | (data[i + 2] ?? 0);
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 1);
      });
      expect(`#${(corner[0]?.[0] ?? 0).toString(16).padStart(6, '0').toUpperCase()}`).toBe(
        decor.base.toUpperCase(),
      );
    });
  }
});

/** Constellation débloquée : 3 parties déjà terminées. */
function afterThreeGames(): ProgressData {
  return progressWith((p) => {
    p.counters.gamesByMode.classic = 3;
  });
}

async function countColor(page: Page, hex: string): Promise<number> {
  return page.evaluate((wanted) => {
    const canvas = document.querySelector('canvas');
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return 0;
    const target = [1, 3, 5].map((offset) => parseInt(wanted.slice(offset, offset + 2), 16));
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let found = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] === target[0] && data[i + 1] === target[1] && data[i + 2] === target[2]) {
        found += 1;
      }
    }
    return found;
  }, hex);
}

test.describe('ct_33_constellation_regles : la constellation complétée entre dans le ciel du décor (RG-42)', () => {
  test('aucune au départ ; une suite complétée en ajoute une, qui reste après un changement de taille', async ({
    page,
  }) => {
    const problems = watchProblems(page);
    await seedStorage(page, { progress: afterThreeGames() });
    await openGame(page, { seed: 1 });
    await startMode(page, 'Constellation');
    await runFor(page, 50);
    await skipCountdown(page);
    const oracle = createGame(CONSTELLATION_MODE, 1);
    await stepOnce(page, 1000 / 7);
    expect(await countColor(page, SKY.color)).toBe(0);

    const eat = async (color: CandyColorId): Promise<void> => {
      const path = findPath(oracle, (cell, game) =>
        game.candies.some((candy) => candy.color === color && sameCell(candy.cell, cell)),
      );
      expect(path).not.toBeNull();
      await drive(page, oracle, path ?? []);
    };
    // Le moteur de recette a fait le premier pas du serpent du navigateur.
    step(oracle);
    for (const color of [...(oracle.constellation?.sequence ?? [])]) await eat(color);
    expect(oracle.constellation?.completed).toBe(1);
    await expect(page.locator('.hud-score')).toHaveText(`Score ${oracle.score}`);
    const drawn = await countColor(page, SKY.color);
    expect(drawn).toBeGreaterThan(0);

    // Le décor est redessiné à un changement de taille : la constellation est toujours là.
    const size = page.viewportSize();
    await page.setViewportSize({ width: (size?.width ?? 780) - 40, height: size?.height ?? 360 });
    await runFor(page, 50);
    expect(await countColor(page, SKY.color)).toBeGreaterThan(0);
    expect(problems).toEqual([]);
  });
});

test.describe('ct_110_mouvement_reduit : le décor scintille sans dépasser 3 changements par seconde (ENF-12)', () => {
  const SPARKS = [DECORS['decor-starry-night'].star, DECORS['decor-starry-night'].twinkle].map(
    (hex) => hex.slice(1).toLowerCase(),
  );

  /** Couleur de chaque étoile qui scintille, lue sur le canevas de la partie. */
  async function twinkling(page: Page): Promise<string[]> {
    const random = createRandom(TWINKLE.seed + DECORS['decor-starry-night'].starSeed);
    const spots = Array.from({ length: TWINKLE.count }, () => [random.next(), random.next()]);
    return page.evaluate(
      ({ columns, rows, points }) => {
        const canvas = document.querySelector('canvas');
        const context = canvas?.getContext('2d');
        if (!canvas || !context) return [];
        const css = parseFloat(canvas.style.width);
        const ratio = canvas.width / css;
        const cell = css / columns;
        return points.map(([u, v]) => {
          const x =
            (Math.min(Math.floor((u ?? 0) * columns * cell), columns * cell - 2) + 1) * ratio;
          const y = (Math.min(Math.floor((v ?? 0) * rows * cell), rows * cell - 2) + 1) * ratio;
          const data = context.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
          return [0, 1, 2].map((i) => (data[i] ?? 0).toString(16).padStart(2, '0')).join('');
        });
      },
      { columns: GRID.columns, rows: GRID.rows, points: spots },
    );
  }

  async function changesWhilePlaying(page: Page, seconds: number): Promise<number[]> {
    await startMode(page, 'Zen');
    await runFor(page, 50);
    await skipCountdown(page);
    await stepOnce(page, 1000 / 6);
    let previous = await twinkling(page);
    const changes = previous.map(() => 0);
    for (let tick = 0; tick < seconds * 10; tick += 1) {
      await runFor(page, 100);
      const now = await twinkling(page);
      now.forEach((color, star) => {
        // Un serpent ou un bonbon peut passer sur l'étoile : seuls les échantillons de décor comptent.
        const before = previous[star] ?? '';
        if (!SPARKS.includes(color) || !SPARKS.includes(before)) return;
        if (color !== before) changes[star] = (changes[star] ?? 0) + 1;
      });
      previous = now;
    }
    return changes;
  }

  test('en jeu, chaque étoile change d’état 3 fois par seconde au plus, et le scintillement existe', async ({
    page,
  }) => {
    await openGame(page);
    const seconds = 4;
    const changes = await changesWhilePlaying(page, seconds);
    for (const count of changes) expect(count).toBeLessThanOrEqual(3 * seconds);
    // Au moins quatre étoiles sur six restent à découvert assez longtemps pour scintiller.
    expect(changes.filter((count) => count >= 3).length).toBeGreaterThanOrEqual(4);
  });

  test('avec le mouvement réduit, le décor ne bouge pas', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openGame(page);
    expect(await changesWhilePlaying(page, 3)).toEqual([0, 0, 0, 0, 0, 0]);
  });

  test('en pause, tout est figé', async ({ page }) => {
    await openGame(page);
    await startMode(page, 'Zen');
    await runFor(page, 50);
    await skipCountdown(page);
    await stepOnce(page, 1000 / 6);
    await page.getByRole('button', { name: 'Pause', exact: true }).tap();
    await expect(page.getByRole('dialog')).toBeVisible();
    const frozen = await twinkling(page);
    for (let tick = 0; tick < 20; tick += 1) {
      await runFor(page, 100);
      expect(await twinkling(page)).toEqual(frozen);
    }
  });
});

test.describe('ct_117_analyse_axe : E8 Skins', () => {
  test('skins choisis, débloqués et verrouillés, dans chaque onglet', async ({ page }) => {
    await openWith(page, owned());
    await openSkins(page);
    for (const [, name] of CATEGORIES) {
      await openTab(page, name);
      expect(await seriousViolations(page), name).toEqual([]);
    }
    // Skin choisi avec « Retirer », puis skin verrouillé mis en évidence.
    await openTab(page, 'Forme');
    await skin(page, 'Comète').tap();
    expect(await seriousViolations(page)).toEqual([]);
    await skin(page, 'Fusée').tap({ force: true });
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('tous les skins débloqués', async ({ page }) => {
    await openWith(page, everything());
    await openSkins(page);
    expect(await seriousViolations(page)).toEqual([]);
  });
});
