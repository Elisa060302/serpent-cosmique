import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sameCell } from '../../src/core/board.ts';
import { createGame, secondsLeft, speedOf, takeEvents } from '../../src/core/engine.ts';
import { ASTEROIDS_MODE } from '../../src/core/modes/asteroids.ts';
import { BLACK_HOLE_MODE } from '../../src/core/modes/black-hole.ts';
import { BONUS_TRAPS } from '../../src/core/modes/bonus-traps.ts';
import { CLASSIC } from '../../src/core/modes/classic.ts';
import { CONSTELLATION_MODE } from '../../src/core/modes/constellation.ts';
import { TIME_ATTACK_MODE } from '../../src/core/modes/time-attack.ts';
import { ZEN_MODE } from '../../src/core/modes/zen.ts';
import { ASTEROIDS, BONUS, GRID } from '../../src/core/rules.ts';
import type { Game, ModeRules } from '../../src/core/types.ts';
import { createClock, robot } from '../support/modes.ts';

const MODES: readonly ModeRules[] = [
  CLASSIC,
  TIME_ATTACK_MODE,
  ASTEROIDS_MODE,
  BLACK_HOLE_MODE,
  BONUS_TRAPS,
  ZEN_MODE,
  CONSTELLATION_MODE,
];

/** Photographie de ce qui doit être identique entre deux parties rejouées avec la même graine. */
function snapshot(game: Game): unknown {
  return {
    snake: game.snake,
    candies: game.candies,
    obstacles: game.obstacles,
    holes: game.holes,
    special: game.special,
    effect: game.effect,
    constellation: game.constellation,
    score: game.score,
    end: game.end,
    color: game.color,
  };
}

/** Les invariants du moteur : rien hors de la grille, rien de superposé, les comptes des règles. */
function assertConsistent(game: Game): void {
  const { rules } = game;
  for (const part of game.snake) {
    assert.ok(part.col >= 1 && part.col <= GRID.columns && part.row >= 1 && part.row <= GRID.rows);
  }
  if (rules.wraps !== true) {
    const keys = new Set(game.snake.map((part) => part.row * 100 + part.col));
    assert.equal(keys.size, game.snake.length, 'aucun anneau superposé');
  }
  if (game.end === null) assert.equal(game.candies.length, rules.candyCount);
  const blocked = [
    ...game.snake,
    ...game.obstacles,
    ...game.holes.map((hole) => hole.cell),
    ...(game.special === null ? [] : [game.special.cell]),
  ];
  for (const candy of game.candies) {
    assert.ok(!blocked.some((cell) => sameCell(cell, candy.cell)), 'bonbon sur un obstacle');
  }
  assert.ok(game.obstacles.length <= ASTEROIDS.max);
  assert.ok(game.holes.length === 0 || game.holes.length === 4);
  assert.ok(
    game.holes.every((hole) => !game.snake.some((part) => sameCell(part, hole.cell))),
    'le serpent n’occupe jamais un trou noir',
  );
  assert.ok(game.special === null || game.special.remainingMs > 0);
  assert.ok(game.effect === null || game.effect.remainingMs > 0);
  assert.ok(speedOf(game) > 0 && speedOf(game) <= 12);
  if (rules.timeLimitMs !== undefined) {
    assert.ok(secondsLeft(rules.timeLimitMs - game.elapsedMs) <= 60);
  }
  if (game.snake.length >= BONUS.minLength) assert.ok(game.snake.length <= 4 + game.candiesEaten);
}

describe('ct_90_aleatoire_reproductible : mêmes graine et commandes, mêmes positions (ENF-19)', () => {
  for (const mode of MODES) {
    it(`${mode.id} : bonbons, astéroïdes, trous noirs et bonbons spéciaux identiques à chaque pas`, () => {
      const play = (seed: number): unknown[] => {
        const game = createGame(mode, seed);
        const clock = createClock(game);
        const history: unknown[] = [snapshot(game)];
        for (let second = 0; second < 90 && game.end === null; second += 1) {
          clock.run(1000, robot);
          history.push(snapshot(game));
        }
        return history;
      };
      assert.deepEqual(play(11), play(11));
      assert.notDeepEqual(play(11)[0], play(12)[0]);
    });
  }
});

describe('ct_89_endurance_modes : 2 heures de jeu simulé sur les 7 modes, 50 cycles de pause (ENF-20)', () => {
  it('aucune exception, des invariants toujours vrais, un temps figé pendant les pauses', () => {
    const perModeMs = (7200 / MODES.length) * 1000;
    const pauseEveryMs = 100_000;
    let pauses = 0;
    let games = 0;
    let playedTotal = 0;
    for (const mode of MODES) {
      let seed = 100;
      let game = createGame(mode, seed);
      let clock = createClock(game);
      games += 1;
      let played = 0;
      let nextPause = pauseEveryMs;
      while (played < perModeMs) {
        const before = clock.now;
        clock.run(1000, robot);
        played += clock.now - before;
        assertConsistent(game);
        takeEvents(game);
        if (game.end !== null) {
          // La partie est finie (collision, temps écoulé) : on en lance une autre, comme le joueur qui rejoue.
          seed += 1;
          game = createGame(mode, seed);
          clock = createClock(game);
          games += 1;
        } else if (played >= nextPause) {
          // Pause d'une durée variable : rien ne bouge ni ne compte pendant qu'elle dure.
          nextPause += pauseEveryMs;
          const frozen = JSON.stringify(snapshot(game));
          const elapsed = game.elapsedMs;
          clock.pause(30_000 + pauses * 1000);
          assert.equal(JSON.stringify(snapshot(game)), frozen);
          assert.equal(game.elapsedMs, elapsed);
          pauses += 1;
        }
      }
      playedTotal += played;
    }
    assert.ok(playedTotal >= 7_200_000, `${playedTotal / 1000} secondes de jeu simulées`);
    assert.ok(pauses >= 50, `${pauses} pauses`);
    assert.ok(games >= MODES.length);
  });
});
