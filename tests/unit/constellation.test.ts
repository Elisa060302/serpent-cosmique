import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createGame, speedOf, takeEvents } from '../../src/core/engine.ts';
import { CONSTELLATION_MODE } from '../../src/core/modes/constellation.ts';
import { CANDY_COLORS } from '../../src/core/rules.ts';
import type { CandyColorId, Game } from '../../src/core/types.ts';
import { feed } from '../support/modes.ts';

const COLORS = CANDY_COLORS.map((color) => color.id);

function constellation(): Game {
  const game = createGame(CONSTELLATION_MODE, 5);
  assert.ok(game.constellation);
  game.constellation.sequence = ['pink', 'purple', 'light-blue'];
  return game;
}

function candiesByColor(game: Game): CandyColorId[] {
  return game.candies.map((candy) => candy.color).sort();
}

describe('ct_33_constellation_regles : suite de couleurs, points et bonbons permanents (EF-15 CA-2 à CA-4)', () => {
  it('4 bonbons, un de chaque couleur, vitesse fixe de 7 c/s', () => {
    for (let seed = 1; seed <= 10; seed += 1) {
      const game = createGame(CONSTELLATION_MODE, seed);
      assert.deepEqual(candiesByColor(game), [...COLORS].sort());
    }
    assert.equal(speedOf(createGame(CONSTELLATION_MODE, 1)), 7);
  });

  it('la suite est de 3 couleurs différentes, tirée avec la graine', () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      const sequence = createGame(CONSTELLATION_MODE, seed).constellation?.sequence ?? [];
      assert.equal(sequence.length, 3);
      assert.equal(new Set(sequence).size, 3);
      assert.ok(sequence.every((color) => COLORS.includes(color)));
    }
    const first = createGame(CONSTELLATION_MODE, 9).constellation?.sequence;
    assert.deepEqual(createGame(CONSTELLATION_MODE, 9).constellation?.sequence, first);
  });

  it('rose, violet, bleu clair dans l’ordre : le score vaut 8 et une nouvelle suite est tirée', () => {
    const game = constellation();
    feed(game, { color: 'pink', short: true });
    assert.equal(game.score, 1);
    assert.equal(game.constellation?.progress, 1);
    feed(game, { color: 'purple', short: true });
    assert.equal(game.score, 2);
    feed(game, { color: 'light-blue', short: true });
    assert.equal(game.score, 8);
    assert.equal(game.constellation?.progress, 0);
    assert.equal(game.constellation?.completed, 1);
    assert.equal(game.constellation?.sequence.length, 3);
    assert.equal(new Set(game.constellation?.sequence).size, 3);
    assert.equal(game.candiesEaten, 3);
    assert.deepEqual(
      takeEvents(game).map((event) => event.kind),
      ['eat', 'eat', 'constellation'],
    );
  });

  it('un mauvais bonbon après le rose : 0 point, la couleur attendue redevient rose, le serpent grandit et prend sa couleur', () => {
    const game = constellation();
    feed(game, { color: 'pink', short: true });
    assert.equal(game.constellation?.progress, 1);
    const length = game.snake.length;
    feed(game, { color: 'light-pink' });
    assert.equal(game.score, 1);
    assert.equal(game.constellation?.progress, 0);
    assert.equal(game.constellation?.sequence[0], 'pink');
    assert.equal(game.color, 'light-pink');
    assert.equal(game.snake.length, length + 1);
    assert.equal(game.candiesEaten, 2);
  });

  it('le mauvais bonbon peut être la première couleur de la suite : la progression revient quand même au début', () => {
    const game = constellation();
    feed(game, { color: 'pink', short: true });
    feed(game, { color: 'pink', short: true });
    assert.equal(game.score, 1);
    assert.equal(game.constellation?.progress, 0);
  });

  it('toujours 4 bonbons, un de chaque couleur, un bonbon mangé étant remplacé par la même couleur', () => {
    const game = constellation();
    for (const color of ['pink', 'purple', 'light-pink', 'light-blue', 'purple', 'pink'] as const) {
      feed(game, { color, short: true });
      assert.deepEqual(candiesByColor(game), [...COLORS].sort());
    }
  });

  it('l’arc-en-ciel compte les bonbons mangés, pas les points', () => {
    const game = constellation();
    // Dix bonbons dont aucun de la couleur attendue : 0 point, mais le dixième rend le serpent arc-en-ciel.
    for (let candy = 1; candy <= 10; candy += 1) {
      feed(game, { color: 'light-pink', short: true });
      if (game.constellation) game.constellation.sequence = ['pink', 'purple', 'light-blue'];
    }
    assert.equal(game.score, 0);
    assert.equal(game.candiesEaten, 10);
    assert.equal(game.color, 'rainbow');
  });

  it('les mêmes graines et commandes donnent les mêmes bonbons et les mêmes suites (ENF-19)', () => {
    const play = (): unknown => {
      const game = createGame(CONSTELLATION_MODE, 12);
      for (const color of ['pink', 'purple', 'light-blue', 'light-pink'] as const) {
        feed(game, { color, short: true });
      }
      return [game.candies, game.constellation, game.score];
    };
    assert.deepEqual(play(), play());
  });
});
