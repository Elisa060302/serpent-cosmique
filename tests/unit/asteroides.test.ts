import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { distance, sameCell } from '../../src/core/board.ts';
import { createGame, speedOf, step } from '../../src/core/engine.ts';
import { ASTEROIDS_MODE } from '../../src/core/modes/asteroids.ts';
import { ASTEROIDS } from '../../src/core/rules.ts';
import type { Cell, Game } from '../../src/core/types.ts';
import { feed } from '../support/modes.ts';

function isFree(game: Game, cell: Cell, except: Cell): boolean {
  return (
    !game.snake.some((part) => sameCell(part, cell)) &&
    !game.candies.some((candy) => sameCell(candy.cell, cell)) &&
    !game.obstacles.some((other) => other !== except && sameCell(other, cell))
  );
}

describe('ct_27_asteroides_progression : 3 au départ, 1 de plus tous les 5 bonbons, 30 au plus (EF-11 CA-1, CA-4)', () => {
  it('3 astéroïdes au départ, aucun sur la ligne 6, un seul bonbon, vitesse 7 c/s', () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const game = createGame(ASTEROIDS_MODE, seed);
      assert.equal(game.obstacles.length, 3, `graine ${seed}`);
      assert.ok(game.obstacles.every((cell) => cell.row !== 6));
      assert.equal(game.candies.length, 1);
    }
    assert.equal(speedOf(createGame(ASTEROIDS_MODE, 1)), 7);
  });

  it('7 astéroïdes au 20e bonbon : 3 de départ et 4 apparus, un à chaque multiple de 5', () => {
    const game = createGame(ASTEROIDS_MODE, 1);
    const counts: number[] = [];
    for (let candy = 1; candy <= 20; candy += 1) {
      feed(game, { short: true });
      assert.equal(game.end, null, `bonbon ${candy}`);
      counts.push(game.obstacles.length);
    }
    assert.deepEqual(counts.slice(0, 4), [3, 3, 3, 3]);
    assert.equal(counts[4], 4);
    assert.equal(counts[9], 5);
    assert.equal(counts[14], 6);
    assert.equal(counts[19], 7);
    assert.equal(game.candiesEaten, 20);
  });

  it('jamais plus de 30 astéroïdes : au 5e bonbon suivant, aucun nouvel astéroïde', () => {
    const game = createGame(ASTEROIDS_MODE, 2);
    for (let candy = 1; candy <= 140; candy += 1) {
      feed(game, { short: true });
      assert.equal(game.end, null, `bonbon ${candy}`);
      assert.ok(game.obstacles.length <= ASTEROIDS.max);
    }
    assert.equal(game.obstacles.length, 30);
    for (let candy = 1; candy <= 5; candy += 1) feed(game, { short: true });
    assert.equal(game.obstacles.length, 30);
  });
});

describe('ct_28_asteroides_placement_collision : placement valide et collision (EF-11 CA-2, CA-3)', () => {
  it('200 apparitions : aucun astéroïde à moins de 4 cases de la tête, ni sur un bonbon, un anneau ou un astéroïde', () => {
    let appearances = 0;
    for (let seed = 1; seed <= 20 && appearances < 200; seed += 1) {
      const game = createGame(ASTEROIDS_MODE, seed);
      const head = game.snake[0] as Cell;
      for (const cell of game.obstacles) {
        assert.ok(distance(cell, head) >= ASTEROIDS.minHeadDistance, `départ, graine ${seed}`);
        assert.ok(isFree(game, cell, cell));
      }
      for (let candy = 1; candy <= 100; candy += 1) {
        const before = game.obstacles.length;
        feed(game, { short: true });
        if (game.end !== null) break;
        if (game.obstacles.length === before) continue;
        appearances += 1;
        const cell = game.obstacles.at(-1) as Cell;
        const current = game.snake[0] as Cell;
        assert.ok(distance(cell, current) >= ASTEROIDS.minHeadDistance, `graine ${seed}`);
        assert.ok(isFree(game, cell, cell), `graine ${seed} : case libre`);
      }
    }
    assert.ok(appearances >= 200, `${appearances} apparitions`);
  });

  it('un astéroïde juste devant la tête : le pas suivant termine la partie par « Collision »', () => {
    const game = createGame(ASTEROIDS_MODE, 1);
    game.candies = [{ cell: { col: 20, row: 1 }, color: 'pink' }];
    game.obstacles = [{ col: 7, row: 6 }];
    step(game);
    assert.equal(game.end, 'collision');
    assert.deepEqual(game.snake[0], { col: 6, row: 6 });
  });

  it('les mêmes graines et commandes donnent les mêmes astéroïdes (ENF-19)', () => {
    const play = (): Cell[] => {
      const game = createGame(ASTEROIDS_MODE, 7);
      for (let candy = 1; candy <= 12; candy += 1) feed(game, { short: true });
      return game.obstacles;
    };
    assert.deepEqual(play(), play());
  });
});
