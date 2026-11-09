import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SEED_MAX, createRandom, parseSeed, resolveSeed } from '../../src/core/random.ts';

function draw(seed: number, count: number): number[] {
  const random = createRandom(seed);
  return Array.from({ length: count }, () => random.next());
}

describe('ct_90_graine_et_regles : tirages à graine', () => {
  it('deux suites de 1 000 tirages avec la même graine sont identiques', () => {
    assert.deepEqual(draw(42, 1000), draw(42, 1000));
  });

  it('deux graines différentes donnent des suites différentes', () => {
    assert.notDeepEqual(draw(42, 1000), draw(43, 1000));
  });

  it('chaque tirage est dans [0, 1)', () => {
    for (const value of draw(7, 10_000)) {
      assert.ok(value >= 0 && value < 1, `valeur hors intervalle : ${value}`);
    }
  });

  it('les entiers tirés sont dans [0, max) et équilibrés', () => {
    const random = createRandom(2026);
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < 4000; i += 1) {
      const value = random.nextInt(4);
      assert.ok(Number.isInteger(value) && value >= 0 && value < 4);
      counts[value] = (counts[value] ?? 0) + 1;
    }
    for (const count of counts) {
      assert.ok(count > 800 && count < 1200, `répartition déséquilibrée : ${counts.join(', ')}`);
    }
  });

  it('nextInt refuse une borne qui n’est pas un entier positif', () => {
    const random = createRandom(1);
    for (const bad of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      assert.throws(() => random.nextInt(bad), RangeError);
    }
  });

  it('la graine 0 et la graine maximale fonctionnent', () => {
    assert.deepEqual(draw(0, 10), draw(0, 10));
    assert.deepEqual(draw(SEED_MAX, 10), draw(SEED_MAX, 10));
  });
});

describe('ct_119_parametre_seed : analyse stricte de ?seed=', () => {
  const accepted: [string, number][] = [
    ['?seed=42', 42],
    ['?seed=0', 0],
    ['?seed=7', 7],
    ['?seed=4294967295', 4294967295],
    ['?seed=0000000042', 42],
    ['?autre=3&seed=9', 9],
    ['?seed=9&autre=3', 9],
  ];
  for (const [search, expected] of accepted) {
    it(`${search} est accepté`, () => {
      assert.equal(parseSeed(search), expected);
    });
  }

  const ignored = [
    '',
    '?',
    '?seed=',
    '?seed',
    '?seed=abc',
    '?seed=-1',
    '?seed=+5',
    '?seed=1.5',
    '?seed=1e3',
    '?seed=0x10',
    '?seed=99999999999',
    '?seed=4294967296',
    '?seed=00000000042',
    '?seed=%34%32',
    '?seed=42%00',
    '?seed= 42',
    '?seed=<img src=x onerror=alert(1)>',
    '?seed=1&seed=2',
    '?Seed=5',
    '?autre=3',
    '?autreseed=5',
    '#seed=5',
    '?x=1#seed=5',
  ];
  for (const search of ignored) {
    it(`${JSON.stringify(search)} est ignoré`, () => {
      assert.equal(parseSeed(search), null);
    });
  }

  it('une valeur ignorée donne une graine entière valide tirée au hasard', () => {
    const seed = resolveSeed('?seed=abc');
    assert.ok(Number.isInteger(seed) && seed >= 0 && seed <= SEED_MAX);
  });

  it('une valeur acceptée est reprise telle quelle', () => {
    assert.equal(resolveSeed('?seed=42'), 42);
  });
});
