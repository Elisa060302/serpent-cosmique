import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createScheduler } from '../../src/core/scheduler.ts';

/** Instants des pas pour des images simulées à `hertz`, pendant `seconds`, à `speed` cases par seconde. */
function stepTimes(hertz: number, speed: number, seconds: number): number[] {
  const scheduler = createScheduler();
  const frame = 1000 / hertz;
  const interval = 1000 / speed;
  scheduler.reset(0);
  const times: number[] = [];
  for (let index = 1; index <= seconds * hertz; index += 1) {
    const now = index * frame;
    for (let step = scheduler.advance(now, interval); step > 0; step -= 1) times.push(now);
  }
  return times;
}

describe('ct_84_regularite_des_pas : ordonnanceur à 60 Hz et 120 Hz simulés', () => {
  for (const hertz of [60, 120]) {
    for (const speed of [6, 7, 8, 9, 10, 11, 12]) {
      it(`${hertz} Hz, ${speed} c/s : 95 % des intervalles à ± 10 %, aucun au-delà du double`, () => {
        const times = stepTimes(hertz, speed, 60);
        const nominal = 1000 / speed;
        const gaps = times.slice(1).map((time, index) => time - (times[index] ?? 0));
        assert.ok(gaps.length > 50);
        // À 60 Hz, un intervalle de 6 ou 7 images tombe exactement sur la limite de 10 % : marge d'arrondi.
        const close = gaps.filter((gap) => Math.abs(gap - nominal) <= 0.1 * nominal + 1e-6);
        assert.ok(
          close.length / gaps.length >= 0.95,
          `${close.length}/${gaps.length} intervalles proches de ${nominal.toFixed(1)} ms`,
        );
        assert.ok(Math.max(...gaps) <= 2 * nominal);
      });
    }
  }

  it('le nombre de pas suit la vitesse sur une minute (pas de dérive)', () => {
    assert.ok(Math.abs(stepTimes(60, 12, 60).length - 720) <= 1);
    assert.ok(Math.abs(stepTimes(120, 7, 60).length - 420) <= 1);
  });

  it('aucun pas n’est rattrapé après une reprise', () => {
    const scheduler = createScheduler();
    scheduler.reset(0);
    assert.equal(scheduler.advance(10, 100), 0);
    // La partie est restée en pause 60 s : reset à la reprise, puis une image normale.
    scheduler.reset(60_000);
    assert.equal(scheduler.advance(60_016, 100), 0);
    assert.equal(scheduler.advance(60_100, 100), 1);
  });

  it('une image très longue ne produit jamais plus de 2 pas et le retard est abandonné', () => {
    const scheduler = createScheduler();
    scheduler.reset(0);
    assert.equal(scheduler.advance(5_000, 100), 2);
    assert.equal(scheduler.advance(5_016, 100), 0);
    assert.equal(scheduler.advance(5_100, 100), 1);
  });

  it('un instant qui recule ne produit aucun pas', () => {
    const scheduler = createScheduler();
    scheduler.reset(1000);
    assert.equal(scheduler.advance(900, 100), 0);
  });

  it('un changement de vitesse s’applique dès le pas suivant', () => {
    const scheduler = createScheduler();
    scheduler.reset(0);
    assert.equal(scheduler.advance(100, 200), 0);
    assert.equal(scheduler.advance(100.1, 100), 1);
  });
});
