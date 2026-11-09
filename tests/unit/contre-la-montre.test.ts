import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createGame, playFrame, secondsLeft, speedOf, tick } from '../../src/core/engine.ts';
import { TIME_ATTACK_MODE } from '../../src/core/modes/time-attack.ts';
import { createScheduler } from '../../src/core/scheduler.ts';
import { TIME_ATTACK } from '../../src/core/rules.ts';
import { createClock, feed, follow } from '../support/modes.ts';

const remaining = (elapsedMs: number): number => secondsLeft(TIME_ATTACK.durationMs - elapsedMs);

describe('ct_25_contre_la_montre_chrono : 60 secondes, 3 bonbons en permanence (EF-10 CA-1, CA-4)', () => {
  it('3 bonbons au départ, vitesse fixe de 8 cases par seconde', () => {
    const game = createGame(TIME_ATTACK_MODE, 1);
    assert.equal(game.candies.length, 3);
    assert.equal(speedOf(game), 8);
    game.candiesEaten = 40;
    assert.equal(speedOf(game), 8);
  });

  it('le chrono ne démarre qu’au premier pas', () => {
    const game = createGame(TIME_ATTACK_MODE, 1);
    tick(game, 5000);
    assert.equal(game.elapsedMs, 0);
    assert.equal(remaining(game.elapsedMs), 60);
    const clock = createClock(game);
    clock.run(60, follow);
    assert.equal(game.steps, 0);
    assert.equal(game.elapsedMs, 0);
    clock.run(140, follow);
    assert.ok(game.steps >= 1);
    assert.ok(game.elapsedMs > 0 && game.elapsedMs <= 200);
  });

  it('le temps restant est arrondi à l’unité supérieure', () => {
    assert.equal(remaining(0), 60);
    assert.equal(remaining(1), 60);
    assert.equal(remaining(999), 60);
    assert.equal(remaining(1000), 59);
    assert.equal(remaining(59_001), 1);
    assert.equal(remaining(60_000), 0);
  });

  it('toujours 3 bonbons sur l’aire à chaque pas, 60 secondes de jeu sans collision', () => {
    const game = createGame(TIME_ATTACK_MODE, 1);
    const clock = createClock(game);
    let frames = 0;
    clock.run(70_000, (current) => {
      follow(current);
      frames += 1;
      assert.equal(current.candies.length, 3);
    });
    assert.ok(frames > 0);
    assert.equal(game.end, 'time');
    assert.ok(game.score > 0, 'le pilote mange des bonbons');
    assert.equal(game.candiesEaten, game.score);
    // La partie dure 60 secondes de jeu, à une image près après le premier pas.
    assert.ok(game.elapsedMs >= TIME_ATTACK.durationMs);
    assert.ok(game.elapsedMs < TIME_ATTACK.durationMs + 2 * 16);
  });

  it('une fois la partie finie, plus rien ne bouge ni ne compte', () => {
    const game = createGame(TIME_ATTACK_MODE, 1);
    const clock = createClock(game);
    clock.run(70_000, follow);
    const elapsed = game.elapsedMs;
    tick(game, 5000);
    assert.equal(game.elapsedMs, elapsed);
    assert.equal(game.end, 'time');
  });
});

describe('ct_25_contre_la_montre_chrono : aucun pas après les 60 secondes (revue de LOT-07)', () => {
  it('une image qui franchit la limite ne fait aucun pas : la partie finit sur la position de la dernière image', () => {
    const game = createGame(TIME_ATTACK_MODE, 1);
    const scheduler = createScheduler();
    scheduler.reset(0);
    // Premier pas, puis le chrono est à 59 900 ms avec un pas dû (125 ms écoulées depuis le dernier).
    playFrame(game, scheduler, 125, 0);
    assert.equal(game.steps, 1);
    game.elapsedMs = TIME_ATTACK.durationMs - 100;
    const head = { ...game.snake[0] };
    const steps = game.steps;
    // Une image de 130 ms : un pas serait dû (8 cases par seconde = 125 ms), mais le temps est écoulé avant.
    playFrame(game, scheduler, 125 + 130, 125);
    assert.equal(game.end, 'time');
    assert.equal(game.steps, steps, 'aucun pas après la fin du temps');
    assert.deepEqual(game.snake[0], head);
  });

  it('une image qui s’arrête avant la limite fait encore ses pas', () => {
    const game = createGame(TIME_ATTACK_MODE, 1);
    const scheduler = createScheduler();
    scheduler.reset(0);
    playFrame(game, scheduler, 125, 0);
    game.elapsedMs = TIME_ATTACK.durationMs - 1000;
    playFrame(game, scheduler, 250, 125);
    assert.equal(game.end, null);
    assert.equal(game.steps, 2);
  });
});

describe('ct_26_contre_la_montre_pause : pause d’un appel et collision (EF-10 CA-2, CA-3, RG-30)', () => {
  it('35 secondes restantes, 2 minutes de pause, la reprise affiche 35 et la partie dure encore 35 secondes de jeu', () => {
    const game = createGame(TIME_ATTACK_MODE, 1);
    const clock = createClock(game);
    clock.run(125, follow);
    clock.run(25_000, follow);
    const before = game.elapsedMs;
    assert.equal(remaining(before), 35);

    clock.pause(120_000);
    assert.equal(game.elapsedMs, before);
    assert.equal(remaining(game.elapsedMs), 35);

    clock.run(34_000, follow);
    assert.equal(game.end, null, 'il reste du temps après 34 secondes de jeu');
    clock.run(2000, follow);
    assert.equal(game.end, 'time');
    assert.ok(Math.abs(game.elapsedMs - TIME_ATTACK.durationMs) < 100);
  });

  it('une collision à 20 secondes restantes termine la partie par « Collision » avec le score atteint', () => {
    const game = createGame(TIME_ATTACK_MODE, 1);
    for (let candy = 0; candy < 4; candy += 1) feed(game, { short: true });
    game.elapsedMs = 40_000;
    assert.equal(remaining(game.elapsedMs), 20);
    const score = game.score;
    game.direction = 'up';
    const head = game.snake[0];
    assert.ok(head);
    head.row = 1;
    game.snake = [
      head,
      { col: head.col, row: 2 },
      { col: head.col, row: 3 },
      { col: head.col, row: 4 },
    ];
    createClock(game).run(500);
    assert.equal(game.end, 'collision');
    assert.equal(game.score, score);
  });
});
