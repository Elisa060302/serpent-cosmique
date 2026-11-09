import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { colorAfterCandy, rainbowColor, START_COLOR } from '../../src/core/color.ts';
import { CANDY_COLORS } from '../../src/core/rules.ts';

describe('ct_19_couleur_du_serpent : couleur du dernier bonbon', () => {
  it('le serpent est rose au départ', () => {
    assert.equal(START_COLOR, 'pink');
  });

  it('un bonbon violet puis un rose clair donnent violet puis rose clair', () => {
    assert.equal(colorAfterCandy(1, 'purple'), 'purple');
    assert.equal(colorAfterCandy(2, 'light-pink'), 'light-pink');
  });

  it('chacune des quatre couleurs est reprise telle quelle hors dizaine', () => {
    for (const color of CANDY_COLORS) assert.equal(colorAfterCandy(7, color.id), color.id);
  });
});

describe('ct_20_arc_en_ciel : à chaque dizaine', () => {
  it('le 10e, le 20e et le 30e bonbon donnent l’arc-en-ciel, le 11e et le 19e non', () => {
    for (const eaten of [10, 20, 30]) assert.equal(colorAfterCandy(eaten, 'purple'), 'rainbow');
    for (const eaten of [9, 11, 19, 21])
      assert.notEqual(colorAfterCandy(eaten, 'purple'), 'rainbow');
  });

  it('un serpent de 14 cases montre au moins 5 teintes différentes', () => {
    const hues = new Set(Array.from({ length: 14 }, (_, index) => rainbowColor(30, index)));
    assert.ok(hues.size >= 5);
  });

  it('une case garde sa teinte quand le serpent avance : rien ne scintille', () => {
    for (let steps = 0; steps < 20; steps += 1) {
      for (let index = 0; index < 13; index += 1) {
        assert.equal(rainbowColor(steps, index), rainbowColor(steps + 1, index + 1));
      }
    }
  });

  it('la teinte reste définie pour un nombre de pas inférieur à l’indice', () => {
    assert.match(rainbowColor(0, 5), /^#[0-9A-F]{6}$/);
  });
});
