import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sameCell } from '../../src/core/board.ts';
import {
  createGame,
  secondsLeft,
  sendCommand,
  speedOf,
  step,
  takeEvents,
  tick,
} from '../../src/core/engine.ts';
import { BONUS_TRAPS } from '../../src/core/modes/bonus-traps.ts';
import { BONUS, SPECIAL_TYPES } from '../../src/core/rules.ts';
import type { Game } from '../../src/core/types.ts';
import { createClock, feed, follow } from '../support/modes.ts';

type Special = NonNullable<Game['special']>;

/** Lit le bonbon spécial à cet instant (le compilateur ne suit pas les changements faits par le moteur). */
const specialOf = (game: Game): Game['special'] => game.special;

/** Pose un bonbon spécial du type voulu devant la tête et le fait manger. */
function eatSpecial(game: Game, type: Special['type'], color: Special['color'] = 'purple'): void {
  const head = game.snake[0];
  assert.ok(head);
  const front = { col: head.col + (game.direction === 'right' ? 1 : 0), row: head.row };
  if (game.direction === 'up') front.row -= 1;
  game.special = { cell: front, color, type, remainingMs: BONUS.lifeMs };
  step(game);
}

/** Un serpent qui monte, de la longueur voulue, loin des bords. */
function climbing(length: number): Game {
  const game = createGame(BONUS_TRAPS, 1);
  game.direction = 'up';
  game.candies = [{ cell: { col: 20, row: 2 }, color: 'pink' }];
  game.snake = Array.from({ length }, (_, index) => ({ col: 10, row: 8 + index }));
  return game;
}

describe('ct_31_bonus_duree_de_vie : apparition tous les 3 bonbons, disparition après 8 s de jeu (EF-13 CA-4, RG-35)', () => {
  it('aucun bonbon spécial au départ, vitesse de base 7 c/s', () => {
    const game = createGame(BONUS_TRAPS, 1);
    assert.equal(game.special, null);
    assert.equal(speedOf(game), 7);
  });

  it('un bonbon spécial apparaît aux 3e, 6e et 9e bonbons, en plus du bonbon normal, s’il n’y en a pas déjà un', () => {
    const game = createGame(BONUS_TRAPS, 4);
    feed(game, { short: true });
    feed(game, { short: true });
    assert.equal(game.special, null);
    feed(game, { short: true });
    const first = specialOf(game);
    assert.ok(first);
    assert.equal(game.candies.length, 1, 'le bonbon normal est toujours là');
    assert.ok(SPECIAL_TYPES.includes(first.type));
    assert.equal(first.remainingMs, 8000);
    assert.ok(!sameCell(first.cell, game.candies[0]?.cell ?? first.cell));
    assert.ok(!game.snake.some((part) => sameCell(part, first.cell)));
    // Le 6e bonbon n’en ajoute pas un second : il en reste un seul.
    for (let candy = 4; candy <= 6; candy += 1) feed(game, { short: true });
    assert.equal(game.candiesEaten, 6);
    assert.equal(game.special, first, 'le même bonbon spécial est toujours là');
    // Une fois disparu, le 9e en fait apparaître un autre.
    game.special = null;
    for (let candy = 7; candy <= 9; candy += 1) feed(game, { short: true });
    assert.ok(game.special);
  });

  it('il disparaît après 8 secondes de jeu', () => {
    const game = createGame(BONUS_TRAPS, 4);
    for (let candy = 0; candy < 3; candy += 1) feed(game, { short: true });
    assert.ok(game.special);
    const clock = createClock(game);
    clock.run(125, follow);
    tick(game, 7800);
    assert.ok(game.special, 'toujours là à 7,9 secondes');
    tick(game, 300);
    assert.equal(game.special, null);
  });

  it('une pause de 1 minute pendant ce délai ne le fait pas disparaître plus tôt', () => {
    const game = createGame(BONUS_TRAPS, 4);
    for (let candy = 0; candy < 3; candy += 1) feed(game, { short: true });
    const special = game.special;
    assert.ok(special);
    const clock = createClock(game);
    clock.run(4000, follow);
    const remaining = special.remainingMs;
    assert.ok(remaining < 5000 && remaining > 3500, `${remaining} ms restantes`);
    clock.pause(60_000);
    assert.equal(game.special, special);
    assert.equal(special.remainingMs, remaining);
    clock.run(remaining - 100, follow);
    assert.equal(game.special, special);
    clock.run(300, follow);
    assert.equal(game.special, null);
  });
});

describe('ct_30_bonus_effets : Ralenti, Turbo, Inversion, Rétrécissement (EF-13 CA-1 à CA-3, RG-36, RG-37, RG-38)', () => {
  it('Ralenti : 4 c/s pendant 6 secondes, puis la vitesse de base', () => {
    const game = climbing(5);
    eatSpecial(game, 'slow');
    assert.deepEqual(game.effect, { type: 'slow', remainingMs: 6000 });
    assert.equal(speedOf(game), 4);
    tick(game, 5900);
    assert.equal(secondsLeft(game.effect?.remainingMs ?? 0), 1);
    assert.equal(speedOf(game), 4);
    tick(game, 200);
    assert.equal(game.effect, null);
    assert.equal(speedOf(game), 7);
  });

  it('Turbo : 11 c/s ; il remplace le Ralenti en cours et dure 6 secondes entières', () => {
    const game = climbing(5);
    eatSpecial(game, 'slow');
    tick(game, 2000);
    assert.equal(secondsLeft(game.effect?.remainingMs ?? 0), 4);
    eatSpecial(game, 'turbo', 'pink');
    assert.equal(game.effect?.type, 'turbo');
    assert.equal(game.effect.remainingMs, 6000);
    assert.equal(secondsLeft(game.effect.remainingMs), 6);
    assert.equal(speedOf(game), 11);
  });

  it('Inversion : pendant 6 secondes, « gauche » donne droite ; ensuite « gauche » donne gauche', () => {
    const game = climbing(5);
    eatSpecial(game, 'invert');
    assert.equal(game.effect?.type, 'invert');
    sendCommand(game, 'left');
    assert.deepEqual(game.queue, ['right']);
    step(game);
    assert.equal(game.direction, 'right');
    tick(game, 5900);
    assert.equal(game.effect?.type, 'invert');
    tick(game, 200);
    assert.equal(game.effect, null);
    assert.deepEqual(
      takeEvents(game).filter((event) => event.kind === 'effect-end'),
      [{ kind: 'effect-end' }],
    );
    game.direction = 'up';
    game.queue.length = 0;
    sendCommand(game, 'left');
    assert.deepEqual(game.queue, ['left']);
  });

  it('Inversion : haut et bas s’inversent aussi, et le demi-tour est jugé sur la direction effective (RG-26)', () => {
    const game = climbing(5);
    eatSpecial(game, 'invert');
    game.direction = 'left';
    game.queue.length = 0;
    // « haut » donne « bas » : un virage, gardé.
    assert.equal(sendCommand(game, 'up'), true);
    assert.deepEqual(game.queue, ['down']);
    // « droite » donne « gauche » : identique à la dernière commande de la file ? Non, c’est « bas » : gardé.
    assert.equal(sendCommand(game, 'right'), true);
    game.queue.length = 0;
    // « droite » donne « gauche » alors que le serpent va déjà à gauche : répétition ignorée.
    assert.equal(sendCommand(game, 'right'), false);
    // « gauche » donne « droite » : demi-tour ignoré.
    assert.equal(sendCommand(game, 'left'), false);
    assert.deepEqual(game.queue, []);
  });

  it('Rétrécissement : 5 cases deviennent 4, le serpent ne grandit pas, le score augmente de 1', () => {
    const game = climbing(5);
    eatSpecial(game, 'shrink', 'light-blue');
    assert.equal(game.snake.length, 4);
    assert.equal(game.score, 1);
    assert.equal(game.color, 'light-blue');
    assert.equal(game.effect, null);
  });

  it('Rétrécissement : jamais moins de 4 cases ; 10 cases deviennent 7', () => {
    const short = climbing(4);
    eatSpecial(short, 'shrink');
    assert.equal(short.snake.length, 4);
    const long = climbing(10);
    eatSpecial(long, 'shrink');
    assert.equal(long.snake.length, 10 - BONUS.shrinkBy);
  });

  it('Rétrécissement : ne modifie pas l’effet à durée en cours', () => {
    const game = climbing(8);
    eatSpecial(game, 'turbo');
    tick(game, 2000);
    const remaining = game.effect?.remainingMs;
    eatSpecial(game, 'shrink');
    assert.equal(game.effect?.type, 'turbo');
    assert.equal(game.effect.remainingMs, remaining);
  });

  it('un bonbon spécial compte pour l’arc-en-ciel comme un bonbon normal (RG-38)', () => {
    const game = climbing(5);
    game.candiesEaten = 9;
    eatSpecial(game, 'slow');
    assert.equal(game.candiesEaten, 10);
    assert.equal(game.color, 'rainbow');
    assert.deepEqual(takeEvents(game), [{ kind: 'special', type: 'slow' }]);
  });

  it('un bonbon spécial ne fait pas disparaître le bonbon normal ni n’en fait apparaître un autre', () => {
    const game = climbing(5);
    eatSpecial(game, 'turbo');
    assert.equal(game.candies.length, 1);
  });
});
