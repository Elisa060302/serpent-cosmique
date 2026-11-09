import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyFinishedGame,
  defaultProgress,
  gamesLeftToDiscover,
  isModeDiscovered,
  setRecordName,
  toPendingGame,
  withSetting,
} from '../../src/core/progress.ts';
import { validatePendingGame } from '../../src/core/validation.ts';
import { DEFAULT_NAME, DEFAULT_SETTINGS, LIMITS, MODE_IDS } from '../../src/core/rules.ts';
import type { ProgressData } from '../../src/core/types.ts';

const NOW = '2026-11-01T10:00:00';

function progressWith(change: (progress: ProgressData) => void): ProgressData {
  const progress = defaultProgress();
  change(progress);
  return progress;
}

describe('ct_42_skins_premier_lancement : progression au premier lancement', () => {
  it('sept tableaux vides, aucun nom, aucun compteur, réglages par défaut', () => {
    const progress = defaultProgress();
    assert.deepEqual(Object.keys(progress.records), [...MODE_IDS]);
    for (const mode of MODE_IDS) {
      assert.deepEqual(progress.records[mode], []);
      assert.equal(progress.counters.gamesByMode[mode], 0);
    }
    assert.equal(progress.lastName, '');
    assert.equal(progress.counters.totalCandies, 0);
    assert.deepEqual(progress.settings, DEFAULT_SETTINGS);
    assert.equal(progress.skins.unlocked.length, 4);
  });

  it('deux progressions par défaut sont indépendantes', () => {
    const first = defaultProgress();
    first.counters.totalCandies = 5;
    assert.equal(defaultProgress().counters.totalCandies, 0);
  });
});

describe('ct_36_compteurs_durables : compteurs de fin de partie (RG-45)', () => {
  it('EF-16 CA-3 : 40 bonbons et une partie abandonnée à 7 donnent 47, parties du mode + 1', () => {
    const before = progressWith((p) => {
      p.counters.totalCandies = 40;
      p.counters.gamesByMode.classic = 2;
    });
    const { progress } = applyFinishedGame(before, {
      mode: 'classic',
      score: 7,
      candiesEaten: 7,
      dateTime: NOW,
    });
    assert.equal(progress.counters.totalCandies, 47);
    assert.equal(progress.counters.gamesByMode.classic, 3);
    assert.equal(progress.counters.gamesByMode.zen, 0);
  });

  it('la progression d’origine n’est pas modifiée', () => {
    const before = defaultProgress();
    applyFinishedGame(before, { mode: 'classic', score: 3, candiesEaten: 3, dateTime: NOW });
    assert.deepEqual(before, defaultProgress());
  });

  it('les compteurs plafonnent à 1 000 000 000', () => {
    const before = progressWith((p) => {
      p.counters.totalCandies = LIMITS.counterMax - 1;
      p.counters.gamesByMode.classic = LIMITS.counterMax;
    });
    const { progress } = applyFinishedGame(before, {
      mode: 'classic',
      score: 5,
      candiesEaten: 5,
      dateTime: NOW,
    });
    assert.equal(progress.counters.totalCandies, LIMITS.counterMax);
    assert.equal(progress.counters.gamesByMode.classic, LIMITS.counterMax);
  });
});

describe('ct_38_entree_au_tableau : record créé dès la fin de partie (RG-53)', () => {
  it('un score non nul entre au tableau du mode joué seulement, avec le dernier nom', () => {
    const before = progressWith((p) => {
      p.lastName = 'Coco';
    });
    const outcome = applyFinishedGame(before, {
      mode: 'classic',
      score: 11,
      candiesEaten: 11,
      dateTime: NOW,
    });
    assert.equal(outcome.rank, 1);
    assert.deepEqual(outcome.progress.records.classic, [
      { name: 'Coco', score: 11, dateTime: NOW },
    ]);
    assert.deepEqual(outcome.progress.records.zen, []);
    assert.equal(outcome.prefill, 'Coco');
    assert.equal(outcome.progress.lastName, 'Coco');
  });

  it('au tout premier record, le champ est vide et le record s’appelle « Joueur »', () => {
    const outcome = applyFinishedGame(defaultProgress(), {
      mode: 'classic',
      score: 2,
      candiesEaten: 2,
      dateTime: NOW,
    });
    assert.equal(outcome.prefill, '');
    assert.equal(outcome.progress.records.classic[0]?.name, DEFAULT_NAME);
    assert.equal(outcome.progress.lastName, DEFAULT_NAME);
  });

  it('0 point : aucun record, les compteurs avancent quand même', () => {
    const outcome = applyFinishedGame(defaultProgress(), {
      mode: 'classic',
      score: 0,
      candiesEaten: 0,
      dateTime: NOW,
    });
    assert.equal(outcome.rank, null);
    assert.deepEqual(outcome.progress.records.classic, []);
    assert.equal(outcome.progress.counters.gamesByMode.classic, 1);
  });

  it('un score qui n’entre pas au tableau plein ne change aucun record', () => {
    const before = progressWith((p) => {
      p.records.classic = Array.from({ length: 10 }, (_, index) => ({
        name: `J${index}`,
        score: 24 - index,
        dateTime: '2026-10-01T10:00:00',
      }));
    });
    const outcome = applyFinishedGame(before, {
      mode: 'classic',
      score: 15,
      candiesEaten: 15,
      dateTime: NOW,
    });
    assert.equal(outcome.rank, null);
    assert.deepEqual(outcome.progress.records.classic, before.records.classic);
  });
});

describe('ct_43_skins_deblocage : déblocages à la fin d’une partie (RG-56, RG-58)', () => {
  it('EF-19 CA-1 : 99 bonbons puis un bonbon de plus débloque la poussière d’étoiles', () => {
    const before = progressWith((p) => {
      p.counters.totalCandies = 99;
    });
    const outcome = applyFinishedGame(before, {
      mode: 'classic',
      score: 1,
      candiesEaten: 1,
      dateTime: NOW,
    });
    assert.deepEqual(outcome.newSkins, ['pattern-dots', 'trail-stardust']);
    assert.ok(outcome.progress.skins.unlocked.includes('trail-stardust'));
  });

  it('EF-19 CA-4 : une partie Classique abandonnée à 15 points débloque la Comète, pas à 14', () => {
    const at15 = applyFinishedGame(defaultProgress(), {
      mode: 'classic',
      score: 15,
      candiesEaten: 15,
      dateTime: NOW,
    });
    assert.ok(at15.newSkins.includes('shape-comet'));
    const at14 = applyFinishedGame(defaultProgress(), {
      mode: 'classic',
      score: 14,
      candiesEaten: 14,
      dateTime: NOW,
    });
    assert.ok(!at14.newSkins.includes('shape-comet'));
  });

  it('un skin débloqué le reste : une partie suivante n’en retire aucun', () => {
    const first = applyFinishedGame(defaultProgress(), {
      mode: 'classic',
      score: 15,
      candiesEaten: 15,
      dateTime: NOW,
    }).progress;
    const second = applyFinishedGame(first, {
      mode: 'classic',
      score: 0,
      candiesEaten: 0,
      dateTime: NOW,
    });
    assert.ok(second.progress.skins.unlocked.includes('shape-comet'));
    assert.deepEqual(second.newSkins, []);
  });
});

describe('ct_62_partie_interrompue : clôture d’une partie interrompue (RG-79)', () => {
  it('EF-27 CA-1 : 12 points ajoutent 12 bonbons, un record et une partie', () => {
    const before = progressWith((p) => {
      p.counters.totalCandies = 30;
    });
    const outcome = applyFinishedGame(before, {
      mode: 'classic',
      score: 12,
      candiesEaten: 12,
      dateTime: NOW,
    });
    assert.equal(outcome.progress.counters.totalCandies, 42);
    assert.equal(outcome.rank, 1);
  });

  it('EF-27 CA-4 : 95 bonbons et 6 de plus débloquent la poussière d’étoiles', () => {
    const before = progressWith((p) => {
      p.counters.totalCandies = 95;
    });
    const outcome = applyFinishedGame(before, {
      mode: 'classic',
      score: 6,
      candiesEaten: 6,
      dateTime: NOW,
    });
    assert.ok(outcome.newSkins.includes('trail-stardust'));
  });
});

describe('ct_39_saisie_du_nom : changer le nom du record validé (RG-53)', () => {
  it('le nom saisi remplace celui du record et devient le dernier nom', () => {
    const created = applyFinishedGame(defaultProgress(), {
      mode: 'classic',
      score: 4,
      candiesEaten: 4,
      dateTime: NOW,
    });
    const renamed = setRecordName(created.progress, 'classic', 1, '  Léa ');
    assert.equal(renamed.records.classic[0]?.name, 'Léa');
    assert.equal(renamed.lastName, 'Léa');
    assert.equal(created.progress.records.classic[0]?.name, DEFAULT_NAME);
  });

  it('un champ vidé donne « Joueur »', () => {
    const created = applyFinishedGame(
      progressWith((p) => {
        p.lastName = 'Coco';
      }),
      { mode: 'classic', score: 4, candiesEaten: 4, dateTime: NOW },
    );
    const renamed = setRecordName(created.progress, 'classic', 1, '');
    assert.equal(renamed.records.classic[0]?.name, DEFAULT_NAME);
  });
});

describe('ct_46_reglages : modification d’un réglage (RG-62)', () => {
  it('change un seul réglage, sans toucher aux autres données ni à la progression reçue', () => {
    const before = progressWith((p) => {
      p.lastName = 'Coco';
      p.counters.totalCandies = 12;
    });
    const after = withSetting(before, 'music', false);
    assert.deepEqual(after.settings, { ...DEFAULT_SETTINGS, music: false });
    assert.equal(before.settings.music, true);
    assert.equal(after.lastName, 'Coco');
    assert.equal(after.counters.totalCandies, 12);
    assert.notEqual(after, before);
  });

  it('accepte la commande aux flèches puis au glissement', () => {
    const arrows = withSetting(defaultProgress(), 'control', 'arrows');
    assert.equal(arrows.settings.control, 'arrows');
    assert.equal(withSetting(arrows, 'control', 'swipe').settings.control, 'swipe');
  });
});

describe('ct_34_constellation_decouverte : découverte du mode surprise (RG-40, RG-58, RG-79)', () => {
  const game = (mode: (typeof MODE_IDS)[number], score = 4) => ({
    mode,
    score,
    candiesEaten: score,
    dateTime: NOW,
  });

  it('tant que moins de 3 parties sont terminées, tous modes confondus, le mode est verrouillé et N parties restent', () => {
    const progress = defaultProgress();
    assert.equal(isModeDiscovered(progress), false);
    assert.equal(gamesLeftToDiscover(progress), 3);
    progress.counters.gamesByMode.zen = 1;
    assert.equal(gamesLeftToDiscover(progress), 2);
    progress.counters.gamesByMode.classic = 1;
    assert.equal(gamesLeftToDiscover(progress), 1);
    assert.equal(isModeDiscovered(progress), false);
    progress.counters.gamesByMode['time-attack'] = 1;
    assert.equal(gamesLeftToDiscover(progress), 0);
    assert.equal(isModeDiscovered(progress), true);
  });

  it('EF-15 CA-1 : la 3e partie terminée annonce le mode, quels que soient le mode joué et la fin', () => {
    let progress = defaultProgress();
    const first = applyFinishedGame(progress, game('classic'));
    assert.equal(first.newMode, false);
    progress = first.progress;
    const second = applyFinishedGame(progress, game('zen', 0));
    assert.equal(second.newMode, false, 'une partie à 0 point compte aussi');
    progress = second.progress;
    const third = applyFinishedGame(progress, game('bonus-traps'));
    assert.equal(third.newMode, true);
    assert.equal(isModeDiscovered(third.progress), true);
  });

  it('l’annonce n’a lieu qu’une fois : les parties suivantes ne l’annoncent plus', () => {
    const before = progressWith((p) => {
      p.counters.gamesByMode.classic = 3;
    });
    assert.equal(applyFinishedGame(before, game('classic')).newMode, false);
    const fourth = progressWith((p) => {
      p.counters.gamesByMode.classic = 5;
    });
    assert.equal(applyFinishedGame(fourth, game('constellation')).newMode, false);
  });

  it('une partie interrompue clôturée au lancement suivant annonce aussi la découverte (RG-79)', () => {
    const before = progressWith((p) => {
      p.counters.gamesByMode.classic = 2;
    });
    const outcome = applyFinishedGame(before, game('zen', 3));
    assert.equal(outcome.newMode, true);
  });

  it('un score au-delà de 9 999 est ramené à la limite du dictionnaire', () => {
    const outcome = applyFinishedGame(defaultProgress(), {
      mode: 'zen',
      score: 12_000,
      candiesEaten: 12_000,
      dateTime: NOW,
    });
    assert.equal(outcome.progress.records.zen[0]?.score, LIMITS.scoreMax);
  });
});

describe('ct_62_partie_interrompue : état enregistré pendant la partie (RG-79)', () => {
  it('reprend le mode, le score et les bonbons mangés, avec la date et l’heure données', () => {
    assert.deepEqual(toPendingGame({ mode: 'zen', score: 25, candiesEaten: 25 }, NOW), {
      mode: 'zen',
      score: 25,
      candiesEaten: 25,
      dateTime: NOW,
    });
  });

  it('une partie Zen de plus de 288 bonbons garde son compte exact, jusqu\u2019à la borne de 9 999', () => {
    const state = { mode: 'zen', score: 320, candiesEaten: 320 } as const;
    const pending = toPendingGame(state, NOW);
    assert.equal(pending.candiesEaten, 320);
    assert.equal(pending.score, 320);
    // Fermeture du jeu, relecture validée, puis clôture au lancement suivant : le total compte les 320 bonbons.
    const reread = validatePendingGame(JSON.parse(JSON.stringify(pending)), new Date(NOW));
    assert.deepEqual(reread, pending);
    const outcome = applyFinishedGame(
      progressWith((p) => (p.counters.totalCandies = 40)),
      pending,
    );
    assert.equal(outcome.progress.counters.totalCandies, 360);
    assert.equal(outcome.progress.records.zen[0]?.score, 320);
  });

  it('seule la borne de 9 999 tronque : 20 000 points et bonbons sont ramenés à 9 999', () => {
    const pending = toPendingGame({ mode: 'zen', score: 20_000, candiesEaten: 20_000 }, NOW);
    assert.equal(pending.score, LIMITS.scoreMax);
    assert.equal(pending.candiesEaten, LIMITS.candiesEatenMax);
    assert.ok(validatePendingGame(pending, new Date(NOW)));
  });
});
