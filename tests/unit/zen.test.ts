import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { abandon, createGame, sendCommand, speedOf, step } from '../../src/core/engine.ts';
import { ZEN_MODE } from '../../src/core/modes/zen.ts';
import { GRID } from '../../src/core/rules.ts';
import type { Game } from '../../src/core/types.ts';
import { createClock, feed, follow } from '../support/modes.ts';

function zenAt(col: number, row: number, direction: Game['direction']): Game {
  const game = createGame(ZEN_MODE, 1);
  game.candies = [{ cell: { col: 12, row: 12 }, color: 'pink' }];
  game.direction = direction;
  const delta = { right: [-1, 0], left: [1, 0], up: [0, 1], down: [0, -1] }[direction];
  game.snake = [0, 1, 2, 3].map((index) => ({
    col: col + (delta?.[0] ?? 0) * index,
    row: row + (delta?.[1] ?? 0) * index,
  }));
  return game;
}

describe('ct_32_zen : traversée des bords et du corps, abandon et score (EF-14)', () => {
  it('vitesse fixe de 6 cases par seconde, un bonbon à la fois', () => {
    const game = createGame(ZEN_MODE, 1);
    assert.equal(speedOf(game), 6);
    game.candiesEaten = 50;
    assert.equal(speedOf(game), 6);
    assert.equal(game.candies.length, 1);
  });

  it('la tête en colonne 24 ligne 3 vers la droite réapparaît en colonne 1 ligne 3', () => {
    const game = zenAt(24, 3, 'right');
    step(game);
    assert.equal(game.end, null);
    assert.deepEqual(game.snake[0], { col: 1, row: 3 });
    assert.equal(game.snake.length, 4);
  });

  it('les quatre bords se traversent, même ligne ou même colonne', () => {
    const cases: [number, number, Game['direction'], number, number][] = [
      [1, 5, 'left', GRID.columns, 5],
      [7, 1, 'up', 7, GRID.rows],
      [7, GRID.rows, 'down', 7, 1],
      [GRID.columns, 9, 'right', 1, 9],
    ];
    for (const [col, row, direction, expectedCol, expectedRow] of cases) {
      const game = zenAt(col, row, direction);
      step(game);
      assert.equal(game.end, null, direction);
      assert.deepEqual(game.snake[0], { col: expectedCol, row: expectedRow }, direction);
    }
  });

  it('la tête qui entre dans son propre corps ne termine pas la partie', () => {
    const game = createGame(ZEN_MODE, 1);
    game.candies = [{ cell: { col: 20, row: 12 }, color: 'pink' }];
    game.snake = [
      { col: 5, row: 5 },
      { col: 6, row: 5 },
      { col: 6, row: 6 },
      { col: 5, row: 6 },
      { col: 4, row: 6 },
    ];
    game.direction = 'left';
    sendCommand(game, 'down');
    step(game);
    assert.equal(game.end, null);
    assert.deepEqual(game.snake[0], { col: 5, row: 6 });
    assert.equal(game.snake.length, 5);
  });

  it('le demi-tour reste ignoré en Zen (RG-26)', () => {
    const game = createGame(ZEN_MODE, 1);
    assert.equal(sendCommand(game, 'left'), false);
    assert.deepEqual(game.queue, []);
  });

  it('un bonbon mangé fait grandir le serpent et rapporte 1 point', () => {
    const game = createGame(ZEN_MODE, 3);
    feed(game);
    assert.equal(game.score, 1);
    assert.equal(game.snake.length, 5);
  });

  it('5 minutes de jeu sans fin de partie', () => {
    const game = createGame(ZEN_MODE, 1);
    createClock(game).run(300_000, follow);
    assert.equal(game.end, null);
    assert.ok(game.steps >= 300 * 6 - 10);
  });

  it('une partie qui reste dans la boucle sans manger garde la couleur du dernier bonbon (EF-04 CA-2)', () => {
    const game = createGame(ZEN_MODE, 1);
    feed(game, { color: 'light-blue', short: true });
    game.candies = [];
    createClock(game).run(20_000);
    assert.equal(game.color, 'light-blue');
    assert.equal(game.end, null);
  });

  it('abandon à 25 points : « Abandon » avec le score de 25', () => {
    const game = createGame(ZEN_MODE, 1);
    for (let candy = 0; candy < 25; candy += 1) feed(game, { short: true });
    assert.equal(game.score, 25);
    abandon(game);
    assert.equal(game.end, 'abandon');
    assert.equal(game.score, 25);
  });
});
