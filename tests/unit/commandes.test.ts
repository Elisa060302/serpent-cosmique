import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { enqueueCommand, opposite } from '../../src/core/commands.ts';
import type { Direction } from '../../src/core/types.ts';

function run(
  current: Direction,
  commands: Direction[],
): { queue: Direction[]; accepted: boolean[] } {
  const queue: Direction[] = [];
  const accepted = commands.map((command) => enqueueCommand(queue, current, command));
  return { queue, accepted };
}

describe('ct_15_file_de_commandes : deux commandes au plus, dans l’ordre', () => {
  it('haut puis gauche pendant un déplacement vers la droite sont gardées dans l’ordre', () => {
    assert.deepEqual(run('right', ['up', 'left']).queue, ['up', 'left']);
  });

  it('une troisième commande valide est ignorée', () => {
    const { queue, accepted } = run('right', ['up', 'left', 'down']);
    assert.deepEqual(queue, ['up', 'left']);
    assert.deepEqual(accepted, [true, true, false]);
  });
});

describe('ct_16_demi_tour_ignore : demi-tour et répétition ignorés', () => {
  it('« gauche » pendant un déplacement vers la droite est ignoré', () => {
    const { queue, accepted } = run('right', ['left']);
    assert.deepEqual(queue, []);
    assert.deepEqual(accepted, [false]);
  });

  it('une commande identique à la direction n’occupe pas la file', () => {
    assert.deepEqual(run('right', ['right', 'right', 'right']).queue, []);
    assert.deepEqual(run('right', ['right', 'up', 'left', 'down']).queue, ['up', 'left']);
  });

  it('la direction de référence est la dernière commande de la file', () => {
    // vers la droite, « haut » est en file : « bas » est un demi-tour par rapport à « haut ».
    assert.deepEqual(run('right', ['up', 'down']).queue, ['up']);
    assert.deepEqual(run('right', ['up', 'up']).queue, ['up']);
  });

  it('opposite renvoie la direction contraire', () => {
    assert.equal(opposite('up'), 'down');
    assert.equal(opposite('down'), 'up');
    assert.equal(opposite('left'), 'right');
    assert.equal(opposite('right'), 'left');
  });
});
