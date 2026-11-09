import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { distance, sameCell } from '../../src/core/board.ts';
import { createGame, placeCandy, speedOf, step } from '../../src/core/engine.ts';
import { BLACK_HOLE_MODE } from '../../src/core/modes/black-hole.ts';
import { CLASSIC } from '../../src/core/modes/classic.ts';
import { BLACK_HOLES, CANDY_COLORS } from '../../src/core/rules.ts';
import type { Game } from '../../src/core/types.ts';
import { feed } from '../support/modes.ts';

/** Partie de recette : deux trous jumelés (colonne 5 ligne 4 et colonne 18 ligne 9), serpent en colonne 4 ligne 4. */
function holesGame(): Game {
  const game = createGame(BLACK_HOLE_MODE, 1);
  game.holes = [
    { cell: { col: 5, row: 4 }, pair: 0, twin: { col: 18, row: 9 } },
    { cell: { col: 18, row: 9 }, pair: 0, twin: { col: 5, row: 4 } },
  ];
  game.snake = [
    { col: 4, row: 4 },
    { col: 3, row: 4 },
    { col: 2, row: 4 },
    { col: 1, row: 4 },
  ];
  game.candies = [{ cell: { col: 20, row: 1 }, color: 'pink' }];
  return game;
}

describe('ct_29_trou_noir : placement des paires, téléportation, collision à la sortie (EF-12)', () => {
  it('20 graines : 4 trous dans la zone, hors ligne 6, à 4 cases au moins les uns des autres, paires liées', () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const game = createGame(BLACK_HOLE_MODE, seed);
      assert.equal(game.holes.length, 4, `graine ${seed}`);
      for (const hole of game.holes) {
        assert.ok(hole.cell.col >= 3 && hole.cell.col <= 22, `colonne, graine ${seed}`);
        assert.ok(hole.cell.row >= 3 && hole.cell.row <= 10, `ligne, graine ${seed}`);
        assert.notEqual(hole.cell.row, 6);
        const twin = game.holes.find((other) => sameCell(other.cell, hole.twin));
        assert.ok(twin, 'le jumeau existe');
        assert.equal(twin.pair, hole.pair);
        assert.notEqual(twin, hole);
        assert.ok(sameCell(twin.twin, hole.cell));
      }
      for (const first of game.holes) {
        for (const second of game.holes) {
          if (first !== second) {
            assert.ok(distance(first.cell, second.cell) >= BLACK_HOLES.minDistance);
          }
        }
      }
      assert.deepEqual(game.holes.map((hole) => hole.pair).sort(), [0, 0, 1, 1]);
      assert.ok(
        game.candies.every((candy) => !game.holes.some((h) => sameCell(h.cell, candy.cell))),
      );
    }
  });

  it('les deux paires ont des halos différents, d’une teinte distincte des quatre couleurs de bonbon', () => {
    const [first, second] = BLACK_HOLES.halos;
    assert.notEqual(first.hex, second.hex);
    assert.notEqual(first.style, second.style);
    for (const halo of BLACK_HOLES.halos) {
      assert.ok(!CANDY_COLORS.some((color) => (color.hex as string) === halo.hex));
    }
  });

  it('vitesse du mode Classique', () => {
    const game = createGame(BLACK_HOLE_MODE, 1);
    assert.equal(speedOf(game), 6);
    game.candiesEaten = 15;
    assert.equal(speedOf(game), CLASSIC.speed(15));
  });

  it('la tête qui entre dans le trou en colonne 5 ligne 4 ressort en colonne 19 ligne 9 et continue vers la droite, les anneaux suivent', () => {
    const game = holesGame();
    step(game);
    assert.deepEqual(game.snake[0], { col: 19, row: 9 });
    assert.equal(game.direction, 'right');
    assert.equal(game.end, null);
    assert.equal(game.snake.length, 4);
    assert.deepEqual(game.snake.slice(1), [
      { col: 4, row: 4 },
      { col: 3, row: 4 },
      { col: 2, row: 4 },
    ]);
    step(game);
    step(game);
    assert.deepEqual(game.snake[0], { col: 21, row: 9 });
    // Les anneaux ont suivi le chemin de la tête : la queue est encore devant le trou, puis ressort à son tour.
    assert.deepEqual(game.snake.at(-1), { col: 4, row: 4 });
    step(game);
    assert.deepEqual(game.snake.at(-1), { col: 19, row: 9 });
    for (const hole of game.holes) {
      assert.ok(!game.snake.some((part) => sameCell(part, hole.cell)), 'jamais sur un trou');
    }
  });

  it('le trou jumeau fonctionne dans les deux sens et dans toutes les directions', () => {
    const game = holesGame();
    game.snake = [
      { col: 18, row: 8 },
      { col: 18, row: 7 },
      { col: 18, row: 6 },
      { col: 18, row: 5 },
    ];
    game.direction = 'down';
    step(game);
    assert.deepEqual(game.snake[0], { col: 5, row: 5 });
    assert.equal(game.direction, 'down');
  });

  it('un anneau sur la case de sortie : « Collision »', () => {
    const game = holesGame();
    game.snake = [
      { col: 4, row: 4 },
      { col: 3, row: 4 },
      { col: 3, row: 5 },
      { col: 19, row: 9 },
      { col: 20, row: 9 },
    ];
    step(game);
    assert.equal(game.end, 'collision');
  });

  it('la queue qui quitte la case de sortie au même pas la libère', () => {
    const game = holesGame();
    game.snake = [
      { col: 4, row: 4 },
      { col: 3, row: 4 },
      { col: 3, row: 5 },
      { col: 19, row: 9 },
    ];
    step(game);
    assert.equal(game.end, null);
    assert.deepEqual(game.snake[0], { col: 19, row: 9 });
  });

  it('un bonbon sur la case de sortie est mangé', () => {
    const game = holesGame();
    game.candies = [{ cell: { col: 19, row: 9 }, color: 'purple' }];
    step(game);
    assert.equal(game.score, 1);
    assert.equal(game.color, 'purple');
    assert.equal(game.snake.length, 5);
    assert.equal(game.candies.length, 1);
  });

  it('200 bonbons apparus : aucun n’est placé sur un trou', () => {
    let placed = 0;
    for (let seed = 1; seed <= 20; seed += 1) {
      const game = createGame(BLACK_HOLE_MODE, seed);
      for (let candy = 0; candy < 10; candy += 1) {
        game.candies = [];
        assert.ok(placeCandy(game));
        placed += 1;
        const cell = game.candies[0]?.cell;
        assert.ok(cell);
        assert.ok(!game.holes.some((hole) => sameCell(hole.cell, cell)));
      }
      for (let candy = 0; candy < 5; candy += 1) {
        feed(game, { short: true });
        if (game.end !== null) break;
        assert.ok(!game.candies.some((c) => game.holes.some((h) => sameCell(h.cell, c.cell))));
      }
    }
    assert.ok(placed >= 200);
  });
});
