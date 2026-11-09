import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { abandon, createGame, placeCandy, speedOf, step } from '../../src/core/engine.ts';
import { enqueueCommand } from '../../src/core/commands.ts';
import { CLASSIC } from '../../src/core/modes/classic.ts';
import { CANDY_COLORS, GRID, START } from '../../src/core/rules.ts';
import type { Cell, Game } from '../../src/core/types.ts';
import { eatCandies, pathToCandy, pathToOwnBody, play } from '../support/pilote.ts';

function sameCell(a: Cell, b: Cell): boolean {
  return a.col === b.col && a.row === b.row;
}

/** Les 288 cases en serpentin, ligne par ligne, chaque case voisine de la suivante. */
function serpentine(): Cell[] {
  const cells: Cell[] = [];
  for (let row = 1; row <= GRID.rows; row += 1) {
    for (let index = 1; index <= GRID.columns; index += 1) {
      cells.push({ col: row % 2 === 1 ? index : GRID.columns + 1 - index, row });
    }
  }
  return cells;
}

describe('ct_04_depart_et_pas : départ de partie', () => {
  it('serpent rose de 4 cases, tête en colonne 6 ligne 6 vers la droite, un bonbon, score 0', () => {
    const game = createGame(CLASSIC, 1);
    assert.deepEqual(game.snake, [
      { col: 6, row: 6 },
      { col: 5, row: 6 },
      { col: 4, row: 6 },
      { col: 3, row: 6 },
    ]);
    assert.equal(game.snake.length, START.length);
    assert.equal(game.direction, 'right');
    assert.equal(game.color, 'pink');
    assert.equal(game.score, 0);
    assert.equal(game.candies.length, 1);
    assert.equal(game.end, null);
  });

  it('chaque pas avance la tête d’une case vers la droite sans changer la longueur', () => {
    const game = createGame(CLASSIC, 1);
    game.candies = [];
    step(game);
    step(game);
    assert.deepEqual(game.snake[0], { col: 8, row: 6 });
    assert.equal(game.snake.length, 4);
  });
});

describe('ct_05_croissance_et_score : un bonbon mangé fait grandir le serpent', () => {
  it('7 cases deviennent 8 au pas où la tête entre sur le bonbon, la queue ne bouge pas, le score monte', () => {
    const game = createGame(CLASSIC, 1);
    eatCandies(game, 3);
    assert.equal(game.snake.length, 7);
    assert.equal(game.score, 3);
    const path = pathToCandy(game);
    assert.ok(path);
    play(game, path.slice(0, -1));
    const tailBefore = game.snake.at(-1);
    const lengthBefore = game.snake.length;
    play(game, path.slice(-1));
    assert.equal(lengthBefore, 7);
    assert.equal(game.snake.length, 8);
    assert.deepEqual(game.snake.at(-1), tailBefore);
    assert.equal(game.score, 4);
    assert.equal(game.candiesEaten, 4);
  });

  it('un nouveau bonbon apparaît aussitôt sur une case libre', () => {
    const game = createGame(CLASSIC, 3);
    eatCandies(game, 1);
    assert.equal(game.candies.length, 1);
    const candy = game.candies[0];
    assert.ok(candy);
    assert.ok(!game.snake.some((part) => sameCell(part, candy.cell)));
  });
});

describe('ct_06_collision_bord_fin_1s : collision contre un bord', () => {
  it('le pas qui sort de la grille termine la partie et fige le serpent', () => {
    const game = createGame(CLASSIC, 1);
    game.candies = [];
    for (let index = 0; index < GRID.columns - START.headColumn; index += 1) step(game);
    assert.equal(game.snake[0]?.col, GRID.columns);
    assert.equal(game.end, null);
    const before = structuredClone(game.snake);
    step(game);
    assert.equal(game.end, 'collision');
    assert.deepEqual(game.snake, before);
    step(game);
    assert.deepEqual(game.snake, before, 'aucun mouvement après la fin');
  });
});

describe('ct_07_case_de_la_queue : la case que la queue quitte est libre', () => {
  function loop(): Game {
    const game = createGame(CLASSIC, 1);
    game.candies = [{ cell: { col: 20, row: 2 }, color: 'pink' }];
    return game;
  }

  it('haut, gauche, bas ferment une boucle de 4 cases et la partie continue pendant des tours', () => {
    const game = loop();
    play(game, ['up', 'left', 'down']);
    assert.deepEqual(game.snake[0], { col: 5, row: 6 });
    assert.equal(game.end, null);
    // Quatre tours de plus dans la boucle : la tête entre chaque fois dans la case de la queue.
    for (let tour = 0; tour < 4; tour += 1) play(game, ['right', 'up', 'left', 'down']);
    assert.equal(game.end, null);
    assert.equal(game.snake.length, 4);
  });

  it('si le serpent grandit à ce pas, la case de la queue reste occupée : collision', () => {
    const game = loop();
    play(game, ['up', 'left']);
    const tail = game.snake.at(-1);
    assert.ok(tail);
    game.candies = [{ cell: { ...tail }, color: 'pink' }];
    play(game, ['down']);
    assert.equal(game.end, 'collision');
  });
});

describe('ct_08_victoire_aire_pleine : victoire sur une aire presque pleine', () => {
  it('manger le dernier bonbon avec 287 cases remplies termine par la victoire à 288 cases', () => {
    const path = serpentine();
    const game = createGame(CLASSIC, 1);
    game.snake = path.slice(0, 287).reverse();
    // Le serpentin finit en ligne 12 : la tête (colonne 2) va vers la gauche, le dernier bonbon est en colonne 1.
    game.direction = 'left';
    game.candies = [{ cell: { ...(path[287] as Cell) }, color: 'purple' }];
    game.score = 283;
    game.candiesEaten = 283;
    step(game);
    assert.equal(game.end, 'victory');
    assert.equal(game.snake.length, 288);
    assert.equal(game.score, 284);
    assert.deepEqual(game.candies, []);
  });
});

describe('ct_18_bonbons_couleurs_placement : couleurs équilibrées et placement valide', () => {
  it('400 bonbons : chaque couleur apparaît entre 70 et 130 fois, pour les graines 1 à 20', () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const game = createGame(CLASSIC, seed);
      const counts = new Map<string, number>();
      for (let count = 0; count < 400; count += 1) {
        game.candies = [];
        assert.ok(placeCandy(game));
        const color = game.candies[0]?.color ?? 'aucune';
        counts.set(color, (counts.get(color) ?? 0) + 1);
      }
      assert.deepEqual([...counts.keys()].sort(), CANDY_COLORS.map((c) => c.id).sort());
      for (const [color, count] of counts) {
        assert.ok(count >= 70 && count <= 130, `graine ${seed} : ${color} apparaît ${count} fois`);
      }
    }
  });

  it('100 apparitions avec un serpent de 200 cases : jamais sur le serpent', () => {
    const game = createGame(CLASSIC, 5);
    game.snake = serpentine().slice(0, 200);
    for (let count = 0; count < 100; count += 1) {
      game.candies = [];
      assert.ok(placeCandy(game));
      const candy = game.candies[0];
      assert.ok(candy);
      assert.ok(!game.snake.some((part) => sameCell(part, candy.cell)));
    }
  });

  it('des bonbons successifs ne se superposent pas', () => {
    const game = createGame(CLASSIC, 9);
    game.snake = serpentine().slice(0, 200);
    game.candies = [];
    for (let count = 0; count < 88; count += 1) assert.ok(placeCandy(game));
    assert.equal(new Set(game.candies.map((c) => `${c.cell.col},${c.cell.row}`)).size, 88);
    assert.equal(placeCandy(game), false, 'aucune case libre ne reste');
  });

  it('la même graine donne les mêmes bonbons (ENF-19)', () => {
    const first = createGame(CLASSIC, 42);
    const second = createGame(CLASSIC, 42);
    const other = createGame(CLASSIC, 43);
    eatCandies(first, 5);
    eatCandies(second, 5);
    assert.deepEqual(first.candies, second.candies);
    assert.notDeepEqual(createGame(CLASSIC, 42).candies, other.candies);
  });
});

describe('ct_20_arc_en_ciel : à chaque dizaine de bonbons', () => {
  it('rose au départ, la couleur du bonbon ensuite, arc-en-ciel au 10e et au 20e', () => {
    const game = createGame(CLASSIC, 11);
    assert.equal(game.color, 'pink');
    for (let eaten = 1; eaten <= 21; eaten += 1) {
      const color = game.candies[0]?.color;
      eatCandies(game, 1);
      assert.equal(game.candiesEaten, eaten);
      assert.equal(game.color, eaten % 10 === 0 ? 'rainbow' : color, `bonbon ${eaten}`);
    }
  });

  it('un bonbon qui suit un arc-en-ciel donne sa couleur', () => {
    const game = createGame(CLASSIC, 11);
    eatCandies(game, 10);
    assert.equal(game.color, 'rainbow');
    const color = game.candies[0]?.color;
    eatCandies(game, 1);
    assert.equal(game.color, color);
  });

  it('l’arc-en-ciel ne protège de rien : collision au bord à 10 points', () => {
    const game = createGame(CLASSIC, 11);
    eatCandies(game, 10);
    game.candies = [];
    const vitesseAvant = speedOf(game);
    for (let index = 0; index < GRID.columns && game.end === null; index += 1) {
      enqueueCommand(game.queue, game.direction, 'right');
      step(game);
    }
    assert.equal(game.end, 'collision');
    assert.equal(game.score, 10);
    assert.equal(speedOf(game), vitesseAvant);
  });
});

describe('ct_22_classique_vitesse : 6 c/s + 0,2 par bonbon, plafond 12 c/s', () => {
  function interval(eaten: number): number {
    const game = createGame(CLASSIC, 1);
    game.candiesEaten = eaten;
    return 1000 / speedOf(game);
  }

  it('167 ms à 0 bonbon, 111 ms à 15, 83 ms à 45 (± 10 %)', () => {
    for (const [eaten, nominal] of [
      [0, 167],
      [15, 111],
      [45, 83],
    ] as const) {
      assert.ok(Math.abs(interval(eaten) - nominal) <= 0.1 * nominal, `${eaten} bonbons`);
    }
  });

  it('jamais en dessous de 83 ms, de 0 à 60 bonbons, et la vitesse ne baisse jamais', () => {
    let previous = 0;
    for (let eaten = 0; eaten <= 60; eaten += 1) {
      assert.ok(interval(eaten) >= 1000 / 12 - 1e-9);
      const speed = 1000 / interval(eaten);
      assert.ok(speed >= previous);
      previous = speed;
    }
    assert.ok(Math.abs(1000 / interval(30) - 12) < 1e-9);
  });
});

describe('ct_23_classique_collision_queue : se mordre la queue', () => {
  it('11 bonbons puis une case du corps : collision à 11 points', () => {
    const game = createGame(CLASSIC, 1);
    eatCandies(game, 11);
    assert.equal(game.end, null);
    const path = pathToOwnBody(game);
    assert.ok(path, 'aucun chemin vers le corps');
    play(game, path);
    assert.equal(game.end, 'collision');
    assert.equal(game.score, 11);
    assert.equal(game.candiesEaten, 11);
  });
});

describe('abandon', () => {
  it('termine la partie en gardant le score, une seule fois', () => {
    const game = createGame(CLASSIC, 1);
    eatCandies(game, 2);
    abandon(game);
    assert.equal(game.end, 'abandon');
    assert.equal(game.score, 2);
    game.end = 'collision';
    abandon(game);
    assert.equal(game.end, 'collision');
  });
});
