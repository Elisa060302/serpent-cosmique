import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PX_PER_MM, SIZES_MM } from '../../src/core/rules.ts';
import { createSwipeDetector } from '../../src/ui/input.ts';

const THRESHOLD = SIZES_MM.swipe * PX_PER_MM;

describe('ct_11_glissement : seuil de 5 mm, une commande par contact', () => {
  it('le seuil vaut 31,5 pixels CSS', () => {
    assert.equal(THRESHOLD, 31.5);
  });

  it('1 cm vers le haut donne « haut », dès le seuil atteint', () => {
    const swipe = createSwipeDetector(THRESHOLD);
    swipe.start(1, 100, 100);
    assert.equal(swipe.move(1, 100, 100 - 31), null);
    assert.equal(swipe.move(1, 100, 100 - 32), 'up');
  });

  it('un même contact ne donne qu’une commande, un nouveau contact en donne une autre', () => {
    const swipe = createSwipeDetector(THRESHOLD);
    swipe.start(1, 100, 100);
    assert.equal(swipe.move(1, 100, 160), 'down');
    assert.equal(swipe.move(1, 100, 260), null);
    assert.equal(swipe.move(1, 0, 260), null);
    swipe.end(1);
    swipe.start(2, 100, 100);
    assert.equal(swipe.move(2, 40, 100), 'left');
  });

  it('chaque contact est suivi séparément', () => {
    const swipe = createSwipeDetector(THRESHOLD);
    swipe.start(1, 0, 0);
    swipe.start(2, 500, 0);
    assert.equal(swipe.move(2, 500, 40), 'down');
    assert.equal(swipe.move(1, 40, 0), 'right');
  });

  it('un mouvement sans contact connu est ignoré', () => {
    const swipe = createSwipeDetector(THRESHOLD);
    assert.equal(swipe.move(9, 500, 500), null);
  });
});

describe('ct_12_toucher_bref_et_diagonale : toucher bref, glissement trop court, diagonale', () => {
  it('un toucher bref et 4 mm ne donnent aucune commande', () => {
    const swipe = createSwipeDetector(THRESHOLD);
    swipe.start(1, 100, 100);
    swipe.end(1);
    swipe.start(2, 100, 100);
    assert.equal(swipe.move(2, 100, 100 - 4 * PX_PER_MM), null);
  });

  it('8 mm à droite et 4 mm vers le haut donnent « droite » (axe dominant)', () => {
    const swipe = createSwipeDetector(THRESHOLD);
    swipe.start(1, 100, 100);
    assert.equal(swipe.move(1, 100 + 8 * PX_PER_MM, 100 - 4 * PX_PER_MM), 'right');
  });

  it('en diagonale, le seuil s’applique à l’axe dominant', () => {
    const swipe = createSwipeDetector(THRESHOLD);
    swipe.start(1, 100, 100);
    assert.equal(swipe.move(1, 100 + 25, 100 - 25), null);
    assert.equal(swipe.move(1, 100 + 33, 100 - 20), 'right');
  });
});
