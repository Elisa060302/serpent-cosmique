import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyFinishedGame, defaultProgress } from '../../src/core/progress.ts';
import { LIMITS, MODE_IDS } from '../../src/core/rules.ts';
import type { ProgressData } from '../../src/core/types.ts';
import {
  isValidName,
  validatePendingGame,
  validateProgressData,
} from '../../src/core/validation.ts';

const NOW = new Date(2026, 10, 2, 12, 0, 0);

/** Progression fictive non vide, passée par JSON comme le font le stockage et un fichier importé. */
function sample(): ProgressData {
  const played = applyFinishedGame(defaultProgress(), {
    mode: 'classic',
    score: 42,
    candiesEaten: 42,
    dateTime: '2026-11-01T14:02:11',
  });
  return played.progress;
}

type Path = (string | number)[];

/** Conteneur désigné par le chemin dans une valeur lue du JSON. */
function container(root: unknown, path: Path): Record<string, unknown> {
  let current = root;
  for (const key of path) current = (current as Record<string, unknown>)[key];
  return current as Record<string, unknown>;
}

/** Progression lue du JSON, abîmée par un cas de test. */
function mutated(change: (edit: Editor) => void): unknown {
  const root = JSON.parse(JSON.stringify(sample())) as unknown;
  change({
    set: (path, value) => {
      const parent = container(root, path.slice(0, -1));
      parent[String(path[path.length - 1])] = value;
    },
    remove: (path) => {
      delete container(root, path.slice(0, -1))[String(path[path.length - 1])];
    },
    push: (path, value) => {
      (container(root, path) as unknown as unknown[]).push(value);
    },
    define: (key, value) => Object.defineProperty(root, key, { value, enumerable: true }),
  });
  return root;
}

interface Editor {
  set(path: Path, value: unknown): void;
  remove(path: Path): void;
  push(path: Path, value: unknown): void;
  define(key: string, value: unknown): void;
}

function accepted(value: unknown): boolean {
  return validateProgressData(value, NOW) !== null;
}

describe('ct_118_validateur_complements : progression valide', () => {
  it('accepte la progression par défaut et une progression jouée, à l’identique', () => {
    assert.deepEqual(validateProgressData(defaultProgress(), NOW), defaultProgress());
    const progress = sample();
    assert.deepEqual(validateProgressData(JSON.parse(JSON.stringify(progress)), NOW), progress);
  });

  it('renvoie une structure neuve, jamais l’objet reçu', () => {
    const input = JSON.parse(JSON.stringify(sample())) as ProgressData;
    const output = validateProgressData(input, NOW);
    assert.notEqual(output, input);
    assert.notEqual(output?.records, input.records);
    assert.notEqual(output?.records.classic[0], input.records.classic[0]);
  });

  it('accepte le jeu de données maximal : 7 tableaux pleins, noms de 12 caractères, compteurs à 1 000 000 000', () => {
    const maximal = defaultProgress();
    for (const mode of MODE_IDS) {
      maximal.records[mode] = Array.from({ length: 10 }, (_, index) => ({
        name: '🐍'.repeat(12),
        score: 9999 - index,
        dateTime: '2026-11-01T10:00:00',
      }));
      maximal.counters.gamesByMode[mode] = LIMITS.counterMax;
    }
    maximal.counters.totalCandies = LIMITS.counterMax;
    maximal.lastName = 'Zoé'.repeat(4);
    assert.ok(accepted(JSON.parse(JSON.stringify(maximal))));
  });
});

describe('ct_118_validateur_complements : structures refusées', () => {
  const R0: Path = ['records', 'classic', 0];
  const refused: [string, (edit: Editor) => void][] = [
    ['une clé inconnue à la racine', (e) => e.set(['extra'], 1)],
    ['une clé manquante', (e) => e.remove(['settings'])],
    ['une clé inconnue dans les réglages', (e) => e.set(['settings', 'volume'], 3)],
    ['records sous forme de tableau', (e) => e.set(['records'], [])],
    ['skins sous forme de tableau', (e) => e.set(['skins'], [])],
    ['settings sous forme de tableau', (e) => e.set(['settings'], [])],
    ['counters sous forme de tableau', (e) => e.set(['counters'], [])],
    ['un tableau de records devenu un objet', (e) => e.set(['records', 'classic'], {})],
    ['un mode inconnu', (e) => e.set(['records', 'cosmos'], [])],
    ['un mode manquant', (e) => e.remove(['records', 'zen'])],
    [
      '11 records',
      (e) => e.set(['records', 'classic'], Array<unknown>(11).fill(sample().records.classic[0])),
    ],
    ['un score de 0', (e) => e.set([...R0, 'score'], 0)],
    ['un score de 10 000', (e) => e.set([...R0, 'score'], 10_000)],
    ['un score décimal', (e) => e.set([...R0, 'score'], 1.5)],
    ['un score négatif', (e) => e.set([...R0, 'score'], -4)],
    ['un score en texte', (e) => e.set([...R0, 'score'], '42')],
    ['un score à 1e308', (e) => e.set([...R0, 'score'], 1e308)],
    ['un score nul (null)', (e) => e.set([...R0, 'score'], null)],
    ['un compteur négatif', (e) => e.set(['counters', 'totalCandies'], -1)],
    [
      'un compteur au-delà de 1 000 000 000',
      (e) => e.set(['counters', 'totalCandies'], 1_000_000_001),
    ],
    ['un compteur décimal', (e) => e.set(['counters', 'gamesByMode', 'classic'], 0.5)],
    ['un nombre trop grand pour être sûr', (e) => e.set(['counters', 'totalCandies'], 2 ** 60)],
    ['un réglage de commande inconnu', (e) => e.set(['settings', 'control'], 'voice')],
    ['un réglage booléen en texte', (e) => e.set(['settings', 'sounds'], 'true')],
    ['un skin inconnu', (e) => e.push(['skins', 'unlocked'], 'shape-dragon')],
    ['un skin en double', (e) => e.push(['skins', 'unlocked'], 'shape-rings')],
    ['un skin par défaut retiré', (e) => e.set(['skins', 'unlocked'], ['shape-rings'])],
    ['un skin choisi non débloqué', (e) => e.set(['skins', 'selected', 'shape'], 'shape-saucer')],
    [
      'un skin choisi d’une autre catégorie',
      (e) => e.set(['skins', 'selected', 'shape'], 'trail-none'),
    ],
    ['une catégorie de skin manquante', (e) => e.remove(['skins', 'selected', 'decor'])],
    ['un dernier nom de 13 caractères', (e) => e.set(['lastName'], 'a'.repeat(13))],
    ['un dernier nom qui n’est pas du texte', (e) => e.set(['lastName'], 7)],
    ['une date impossible', (e) => e.set([...R0, 'dateTime'], '2026-02-30T10:00:00')],
    ['une date sans heure', (e) => e.set([...R0, 'dateTime'], '2026-11-01')],
    ['une date antérieure à 2026', (e) => e.set([...R0, 'dateTime'], '2025-12-31T23:59:59')],
    [
      'une date à plus de 24 heures dans le futur',
      (e) => e.set([...R0, 'dateTime'], '2026-11-03T12:00:01'),
    ],
    [
      'des records mal triés',
      (e) =>
        e.set(
          ['records', 'classic'],
          [
            { name: 'A', score: 3, dateTime: '2026-11-01T10:00:00' },
            { name: 'B', score: 9, dateTime: '2026-11-01T10:00:00' },
          ],
        ),
    ],
    ['un record avec un champ en plus', (e) => e.set([...R0, 'mode'], 'classic')],
  ];
  for (const [label, change] of refused) {
    it(`${label.startsWith('une date') ? 'ct_125_controle_des_dates : ' : ''}refuse ${label}`, () => {
      assert.equal(accepted(mutated(change)), false);
    });
  }

  it('refuse tout ce qui n’est pas un objet simple', () => {
    for (const value of [null, undefined, 3, 'texte', true, [], () => 1]) {
      assert.equal(accepted(value), false);
    }
    assert.equal(accepted(Object.create({ records: {} })), false);
    assert.equal(accepted(new Map()), false);
  });

  it('ct_125_controle_des_dates : une date à moins de 24 heures dans le futur est acceptée (changement de fuseau)', () => {
    assert.ok(accepted(mutated((e) => e.set([...R0, 'dateTime'], '2026-11-03T11:59:59'))));
  });

  it('ct_125_controle_des_dates : HYP-49, pour la progression locale, une date future ne fait jamais rejeter la progression', () => {
    const farFuture = mutated((e) => e.set([...R0, 'dateTime'], '2031-01-01T00:00:00'));
    assert.equal(validateProgressData(farFuture, NOW), null);
    assert.ok(validateProgressData(farFuture, NOW, true));
    // La borne basse (avant 2026) et le reste du contrôle restent stricts.
    const old = mutated((e) => e.set([...R0, 'dateTime'], '2025-12-31T23:59:59'));
    assert.equal(validateProgressData(old, NOW, true), null);
    const impossible = mutated((e) => e.set([...R0, 'dateTime'], '2031-02-30T00:00:00'));
    assert.equal(validateProgressData(impossible, NOW, true), null);
  });

  it('la clé __proto__ (créée par JSON.parse) est une clé inconnue : refus, prototype intact', () => {
    const text = JSON.stringify(sample()).replace(
      '{"records"',
      '{"__proto__":{"polluted":true},"records"',
    );
    assert.equal(accepted(JSON.parse(text)), false);
    for (const key of ['constructor', 'prototype']) {
      assert.equal(accepted(mutated((e) => e.define(key, {}))), false, key);
    }
    assert.equal(({} as Record<string, unknown>)['polluted'], undefined);
    assert.equal(Object.prototype.hasOwnProperty.call(Object.prototype, 'polluted'), false);
  });
});

describe('ct_118_validateur_complements : noms', () => {
  const FORBIDDEN = [
    ['substitut isolé haut', 'Co\ud800co'],
    ['substitut isolé bas', 'Co\udc00co'],
    ['U+200F', 'Co\u200fco'],
    ['U+200E', 'Co\u200eco'],
    ['U+061C', 'Co\u061cco'],
    ['U+202A', 'Co\u202aco'],
    ['U+202E', 'Co\u202eco'],
    ['U+2066', 'Co\u2066co'],
    ['U+2069', 'Co\u2069co'],
    ['caractère de contrôle', 'Co\u0007co'],
    ['retour à la ligne', 'Co\nco'],
    ['U+0085', 'Co\u0085co'],
    ['13 caractères', 'a'.repeat(13)],
    ['nom vide', ''],
    ['espace de début', ' Coco'],
    ['espace de fin', 'Coco '],
    ['nom fait d’espaces', '   '],
    ['nom de 10 000 caractères', 'a'.repeat(10_000)],
  ] as const;
  for (const [label, name] of FORBIDDEN) {
    it(`refuse ${label}`, () => {
      assert.equal(isValidName(name), false);
      assert.equal(accepted(mutated((e) => e.set(['records', 'classic', 0, 'name'], name))), false);
    });
  }

  it('accepte un emoji composé avec U+200D, des lettres accentuées et la ponctuation', () => {
    const family = '\u{1F468}‍\u{1F469}‍\u{1F467}';
    for (const name of [family, family.repeat(12), 'Zoé-42 !', '<script>Coco', '🐍'.repeat(12)]) {
      assert.equal(isValidName(name), true, name);
    }
    assert.equal(isValidName(family.repeat(13)), false);
  });

  it('refuse ce qui n’est pas du texte', () => {
    for (const value of [null, 3, undefined, ['a'], { length: 3 }])
      assert.equal(isValidName(value), false);
  });
});

describe('ct_62_partie_interrompue : partie en cours (pendingGame)', () => {
  const pending = { mode: 'classic', score: 12, candiesEaten: 12, dateTime: '2026-11-01T10:00:00' };

  it('accepte une partie valide et renvoie une structure neuve', () => {
    const result = validatePendingGame(pending, NOW);
    assert.deepEqual(result, pending);
    assert.notEqual(result, pending);
    assert.ok(validatePendingGame({ ...pending, score: 0, candiesEaten: 0 }, NOW));
    assert.ok(validatePendingGame({ ...pending, score: 9999, candiesEaten: 9999 }, NOW));
    // Zen et Bonus et pièges permettent plus de 288 bonbons : le compte exact est relu (HYP-51).
    assert.equal(
      validatePendingGame({ ...pending, score: 300, candiesEaten: 300 }, NOW)?.candiesEaten,
      300,
    );
  });

  it('ct_118_validateur_complements : bonbons mangés de 0 à 9 999 acceptés (0, 288, 289, 9 999)', () => {
    for (const candiesEaten of [0, 288, 289, 9999]) {
      assert.equal(
        validatePendingGame({ ...pending, score: 0, candiesEaten }, NOW)?.candiesEaten,
        candiesEaten,
        `${candiesEaten}`,
      );
    }
  });

  it('ct_118_validateur_complements : bonbons mangés hors plage ou non entiers refusés (10 000, -1, 1,5, NaN)', () => {
    for (const candiesEaten of [10_000, -1, 1.5, Number.NaN]) {
      assert.equal(validatePendingGame({ ...pending, candiesEaten }, NOW), null, `${candiesEaten}`);
    }
  });

  const refused: [string, unknown][] = [
    ['un mode inconnu', { ...pending, mode: 'cosmos' }],
    ['un score négatif', { ...pending, score: -1 }],
    ['un score de 10 000', { ...pending, score: 10_000 }],
    ['10 000 bonbons mangés', { ...pending, candiesEaten: 10_000 }],
    ['un champ en plus', { ...pending, extra: 1 }],
    ['un champ en moins', { mode: 'classic', score: 1, candiesEaten: 1 }],
    ['une date impossible', { ...pending, dateTime: '2026-13-01T10:00:00' }],
    ['un tableau', [pending]],
    ['null', null],
    ['un texte', 'classic'],
  ];
  it('ct_125_controle_des_dates : une date future est refusée par défaut, acceptée pour la progression locale (HYP-49)', () => {
    const future = { ...pending, dateTime: '2031-01-01T00:00:00' };
    assert.equal(validatePendingGame(future, NOW), null);
    assert.ok(validatePendingGame(future, NOW, true));
  });

  for (const [label, value] of refused) {
    it(`refuse ${label}`, () => {
      assert.equal(validatePendingGame(value, NOW), null);
    });
  }
});
