import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MODE_IDS, SKINS, SKIN_CATEGORIES } from '../../src/core/rules.ts';
import type { SkinId } from '../../src/core/rules.ts';
import {
  conditionProgress,
  defaultSkinOf,
  defaultSkins,
  evaluateUnlocks,
  skinsOfCategory,
  withSelectedSkin,
} from '../../src/core/skins.ts';
import { defaultProgress } from '../../src/core/progress.ts';
import type { ModeId } from '../../src/core/rules.ts';

const DEFAULTS: SkinId[] = ['shape-rings', 'pattern-plain', 'trail-none', 'decor-starry-night'];

function counters(totalCandies: number, played: Partial<Record<ModeId, number>> = {}) {
  const gamesByMode = {
    classic: 0,
    'time-attack': 0,
    asteroids: 0,
    'black-hole': 0,
    'bonus-traps': 0,
    zen: 0,
    constellation: 0,
    ...played,
  };
  return { totalCandies, gamesByMode };
}

describe('ct_42_skins_premier_lancement : catalogue de 16 skins, 4 par défaut (RG-54)', () => {
  it('le catalogue compte 16 skins, 4 par catégorie, aux identifiants uniques', () => {
    assert.equal(SKINS.length, 16);
    assert.equal(new Set(SKINS.map((skin) => skin.id)).size, 16);
    for (const category of SKIN_CATEGORIES) {
      assert.equal(SKINS.filter((skin) => skin.category === category).length, 4);
    }
  });

  it('un seul skin par défaut par catégorie, débloqué et choisi dès le premier lancement', () => {
    const defaults = SKINS.filter((skin) => skin.condition.kind === 'default').map(
      (skin) => skin.id,
    );
    assert.deepEqual(defaults, DEFAULTS);
    const skins = defaultSkins();
    assert.deepEqual(skins.unlocked, DEFAULTS);
    assert.deepEqual(skins.selected, {
      shape: 'shape-rings',
      pattern: 'pattern-plain',
      trail: 'trail-none',
      decor: 'decor-starry-night',
    });
  });

  it('aucune évaluation ne débloque quoi que ce soit sans compteur ni score', () => {
    assert.deepEqual(evaluateUnlocks(DEFAULTS, counters(0), { mode: 'classic', score: 0 }), []);
  });
});

describe('ct_43_skins_deblocage : seuils de RG-54, abandon compris', () => {
  const unlockedAfter = (
    total: number,
    game: { mode: ModeId; score: number },
    played: Partial<Record<ModeId, number>> = {},
  ): SkinId[] => evaluateUnlocks(DEFAULTS, counters(total, played), game);

  const scoreCases: [SkinId, ModeId, number][] = [
    ['shape-comet', 'classic', 15],
    ['pattern-stars', 'time-attack', 20],
    ['pattern-candy-cane', 'bonus-traps', 20],
    ['trail-sugar', 'asteroids', 15],
    ['trail-aurora', 'zen', 50],
    ['decor-nebula', 'black-hole', 15],
    ['decor-candy-planet', 'constellation', 25],
  ];
  for (const [skin, mode, points] of scoreCases) {
    it(`${skin} : ${points} points en ${mode}, pas ${points - 1}, et pas dans un autre mode`, () => {
      assert.ok(unlockedAfter(0, { mode, score: points }).includes(skin));
      assert.ok(!unlockedAfter(0, { mode, score: points - 1 }).includes(skin));
      const other = MODE_IDS.find((id) => id !== mode) as ModeId;
      assert.ok(!unlockedAfter(0, { mode: other, score: points + 100 }).includes(skin));
    });
  }

  const totalCases: [SkinId, number][] = [
    ['pattern-dots', 25],
    ['trail-stardust', 100],
    ['shape-rocket', 250],
    ['shape-saucer', 1000],
  ];
  for (const [skin, count] of totalCases) {
    it(`${skin} : ${count} bonbons au total, pas ${count - 1}`, () => {
      assert.ok(unlockedAfter(count, { mode: 'classic', score: 1 }).includes(skin));
      assert.ok(!unlockedAfter(count - 1, { mode: 'classic', score: 1 }).includes(skin));
    });
  }

  it('decor-milky-way : au moins une partie dans chacun des 7 modes', () => {
    const all = Object.fromEntries(MODE_IDS.map((mode) => [mode, 1])) as Record<ModeId, number>;
    assert.ok(unlockedAfter(0, { mode: 'classic', score: 0 }, all).includes('decor-milky-way'));
    const sixOnly = { ...all, zen: 0 };
    assert.ok(
      !unlockedAfter(0, { mode: 'classic', score: 0 }, sixOnly).includes('decor-milky-way'),
    );
  });

  it('EF-19 CA-1 : 99 bonbons puis 1 de plus annonce la poussière d’étoiles', () => {
    assert.deepEqual(unlockedAfter(100, { mode: 'classic', score: 1 }), [
      'pattern-dots',
      'trail-stardust',
    ]);
  });

  it('un skin déjà débloqué n’est pas annoncé une seconde fois', () => {
    const unlocked = [...DEFAULTS, 'trail-stardust' as SkinId, 'pattern-dots' as SkinId];
    assert.deepEqual(evaluateUnlocks(unlocked, counters(120), { mode: 'classic', score: 1 }), []);
  });

  it('les nouveaux skins sont rendus dans l’ordre du catalogue', () => {
    const result = unlockedAfter(1000, { mode: 'classic', score: 15 });
    assert.deepEqual(result, [
      'shape-comet',
      'shape-rocket',
      'shape-saucer',
      'pattern-dots',
      'trail-stardust',
    ]);
  });
});

describe('ct_45_choix_des_skins : choix, retrait et skin verrouillé refusé (EF-20 RG-60)', () => {
  const unlocked: SkinId[] = [...DEFAULTS, 'shape-comet', 'trail-stardust'];
  const skins = {
    unlocked,
    selected: { ...defaultSkins().selected },
  };

  it('un skin débloqué est choisi dans sa catégorie, les autres choix et les déblocages restent', () => {
    const result = withSelectedSkin(skins, 'shape-comet');
    assert.equal(result.selected.shape, 'shape-comet');
    assert.equal(result.selected.trail, 'trail-none');
    assert.deepEqual(result.unlocked, unlocked);
  });

  it('un skin verrouillé ou inconnu ne change rien', () => {
    assert.deepEqual(withSelectedSkin(skins, 'shape-rocket'), skins);
    assert.deepEqual(withSelectedSkin(skins, 'shape-inconnu'), skins);
  });

  it('« Retirer » rend le skin par défaut de la catégorie', () => {
    const chosen = withSelectedSkin(skins, 'trail-stardust');
    assert.equal(chosen.selected.trail, 'trail-stardust');
    const removed = withSelectedSkin(chosen, defaultSkinOf('trail'));
    assert.equal(removed.selected.trail, 'trail-none');
  });

  it('chaque catégorie a ses 4 skins, le premier étant celui par défaut', () => {
    for (const category of SKIN_CATEGORIES) {
      const list = skinsOfCategory(category);
      assert.equal(list.length, 4);
      assert.equal(list[0]?.id, defaultSkinOf(category));
      assert.equal(list[0]?.condition.kind, 'default');
    }
  });
});

describe('ct_45_choix_des_skins : progression chiffrée des conditions (RG-59)', () => {
  const progress = defaultProgress();
  progress.counters.totalCandies = 63;
  progress.records.classic = [
    { name: 'Zoé', score: 9, dateTime: '2026-10-01T10:00:00' },
    { name: 'Ana', score: 4, dateTime: '2026-10-02T10:00:00' },
  ];
  progress.counters.gamesByMode.classic = 2;
  progress.counters.gamesByMode.zen = 1;

  const condition = (id: SkinId) => SKINS.find((skin) => skin.id === id)?.condition ?? null;

  it('« 63 / 250 bonbons » pour la Fusée', () => {
    const rocket = condition('shape-rocket');
    assert.ok(rocket);
    assert.deepEqual(conditionProgress(rocket, progress), { current: 63, target: 250 });
  });

  it('« meilleur score : 9 / 15 » pour la Comète, avec le meilleur des records', () => {
    const comet = condition('shape-comet');
    assert.ok(comet);
    assert.deepEqual(conditionProgress(comet, progress), { current: 9, target: 15 });
  });

  it('0 sans record, jamais au-delà de la cible, et le nombre de modes joués pour la Voie lactée', () => {
    const stars = condition('pattern-stars');
    assert.ok(stars);
    assert.deepEqual(conditionProgress(stars, progress), { current: 0, target: 20 });
    const many = defaultProgress();
    many.counters.totalCandies = 5000;
    const saucer = condition('shape-saucer');
    assert.ok(saucer);
    assert.deepEqual(conditionProgress(saucer, many), { current: 1000, target: 1000 });
    const milky = condition('decor-milky-way');
    assert.ok(milky);
    assert.deepEqual(conditionProgress(milky, progress), { current: 2, target: 7 });
  });

  it('un skin débloqué d’office n’a pas de progression', () => {
    assert.equal(conditionProgress({ kind: 'default' }, progress), null);
  });
});
