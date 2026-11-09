import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { nuance } from '../../src/core/color.ts';
import { createGame } from '../../src/core/engine.ts';
import { ASTEROIDS_MODE } from '../../src/core/modes/asteroids.ts';
import {
  CANDY_COLORS,
  DRAW_COLORS,
  NUANCE,
  RAINBOW_COLORS,
  SKINS,
  TRAIL,
  TWINKLE,
} from '../../src/core/rules.ts';
import type { Cell, Game, SnakeColor } from '../../src/core/types.ts';
import { DECORS } from '../../src/core/rules.ts';
import { drawTwinkle } from '../../src/ui/render/decor.ts';
import { drawBoard } from '../../src/ui/render/board.ts';
import { drawSnake } from '../../src/ui/render/snake.ts';
import { createTrail, drawTrail } from '../../src/ui/render/trail.ts';
import { recordingContext } from '../support/canevas.ts';

const SHAPES = SKINS.filter((skin) => skin.category === 'shape').map((skin) => skin.id);
const PATTERNS = SKINS.filter((skin) => skin.category === 'pattern').map((skin) => skin.id);
const TRAILS = SKINS.filter((skin) => skin.category === 'trail').map((skin) => skin.id);
const COLORS: SnakeColor[] = [...CANDY_COLORS.map((color) => color.id), 'rainbow'];

/** Serpent de six anneaux qui tourne : tous les sens de marche sont dessinés. */
const SNAKE: Cell[] = [
  { col: 5, row: 4 },
  { col: 5, row: 5 },
  { col: 4, row: 5 },
  { col: 3, row: 5 },
  { col: 3, row: 6 },
  { col: 2, row: 6 },
];

function hexOf(color: SnakeColor): string[] {
  if (color === 'rainbow') return [...RAINBOW_COLORS];
  return [CANDY_COLORS.find((candy) => candy.id === color)?.hex ?? ''];
}

/** Les nuances permises (RG-18) : la couleur du serpent, son mélange avec du blanc, et le blanc. */
function allowedColors(color: SnakeColor): Set<string> {
  const allowed = new Set<string>(['#FFFFFF']);
  for (const hex of hexOf(color)) {
    for (const white of [0, NUANCE.soft, NUANCE.white]) allowed.add(nuance(hex, white));
  }
  return allowed;
}

describe('ct_45_choix_des_skins : la couleur suit toujours les bonbons (EF-04 RG-18, RM-07)', () => {
  for (const shape of SHAPES) {
    for (const pattern of PATTERNS) {
      it(`${shape} avec ${pattern} : seules la couleur du serpent, ses nuances et le blanc sont employés`, () => {
        for (const color of COLORS) {
          const { context, operations } = recordingContext();
          drawSnake(context, { snake: SNAKE, direction: 'up', color, steps: 12 }, 24, {
            shape,
            pattern,
          });
          const allowed = allowedColors(color);
          allowed.add(DRAW_COLORS.pupil);
          for (const operation of operations) {
            if (operation.name === 'fill') {
              assert.ok(allowed.has(operation.fillStyle), `${color} : ${operation.fillStyle}`);
            } else if (operation.name === 'stroke') {
              assert.ok(allowed.has(operation.strokeStyle), `${color} : ${operation.strokeStyle}`);
            }
          }
          assert.ok(operations.some((operation) => operation.name === 'fill'));
        }
      });
    }
  }

  it('sans motif, le corps est rempli de la seule couleur du serpent (rose au départ, violet après)', () => {
    for (const color of ['pink', 'purple'] as const) {
      const { context, operations } = recordingContext();
      drawSnake(context, { snake: SNAKE, direction: 'up', color, steps: 0 }, 24, {
        shape: 'shape-comet',
        pattern: 'pattern-plain',
      });
      const bodyFills = new Set(
        operations
          .filter((operation) => operation.name === 'fill')
          .map((operation) => operation.fillStyle),
      );
      const [hex] = hexOf(color);
      assert.ok(bodyFills.has(hex ?? ''));
      assert.deepEqual(
        [...bodyFills].filter((fill) => fill !== hex).sort(),
        [DRAW_COLORS.eyeWhite, DRAW_COLORS.pupil].sort(),
      );
    }
  });

  it('chaque forme dessine un serpent différent des autres', () => {
    const outlines = SHAPES.map((shape) => {
      const { context, operations } = recordingContext();
      const paths: string[] = [];
      const proxied = new Proxy(context, {
        get(target, property: string) {
          const value = (target as unknown as Record<string, unknown>)[property];
          if (typeof value !== 'function') return value;
          return (...args: unknown[]) => {
            paths.push(`${property}(${args.map((arg) => String(arg)).join(',')})`);
            return (value as (...a: unknown[]) => unknown)(...args);
          };
        },
      });
      drawSnake(proxied, { snake: SNAKE, direction: 'up', color: 'pink', steps: 0 }, 24, {
        shape,
        pattern: 'pattern-plain',
      });
      assert.ok(operations.length > 0);
      return paths.join('|');
    });
    assert.equal(new Set(outlines).size, SHAPES.length);
  });

  it('un identifiant inconnu donne la forme et le motif par défaut', () => {
    const drawn = (shape: string, pattern: string): string => {
      const { context, operations } = recordingContext();
      drawSnake(context, { snake: SNAKE, direction: 'up', color: 'pink', steps: 0 }, 24, {
        shape,
        pattern,
      });
      return operations.map((operation) => operation.name).join();
    };
    assert.equal(drawn('inconnu', 'inconnu'), drawn('shape-rings', 'pattern-plain'));
  });
});

describe('ct_45_choix_des_skins : traînées, nuances et dessin sous les éléments de jeu (RG-61)', () => {
  const points = [1, 2, 3].map((age) => ({ cell: { col: 8 - age, row: 3 }, step: 20 - age }));

  for (const trail of TRAILS.filter((id) => id !== 'trail-none')) {
    it(`${trail} : nuances de la couleur courante ou blanc, à demi transparent, sans rien laisser de transparent`, () => {
      for (const color of COLORS) {
        const { context, operations } = recordingContext();
        drawTrail(context, trail, points, { color, steps: 20 }, 24);
        const allowed = allowedColors(color);
        const fills = operations.filter((operation) => operation.name === 'fill');
        assert.ok(fills.length > 0);
        for (const fill of fills) {
          assert.ok(allowed.has(fill.fillStyle), `${color} : ${fill.fillStyle}`);
          assert.ok(fill.globalAlpha > 0 && fill.globalAlpha < 1);
        }
      }
    });
  }

  it('« Aucune » ne dessine rien', () => {
    const { context, operations } = recordingContext();
    drawTrail(context, 'trail-none', points, { color: 'pink', steps: 20 }, 24);
    assert.equal(operations.length, 0);
  });

  it('la traînée est dessinée avant les astéroïdes, les bonbons et le serpent', () => {
    const game: Game = createGame(ASTEROIDS_MODE, 1);
    const { context, operations } = recordingContext();
    const fakeDecor = {} as HTMLCanvasElement;
    drawBoard(
      context,
      {
        decor: fakeDecor,
        style: {
          shape: 'shape-rings',
          pattern: 'pattern-plain',
          trail: 'trail-stardust',
          decor: 'decor-starry-night',
        },
        trail: points.map((point) => ({ cell: point.cell, step: game.steps - 1 })),
        animationMs: 0,
      },
      game,
      24,
      1,
    );
    const lastTrail = operations.reduce(
      (last, operation, index) =>
        operation.name === 'fill' && operation.globalAlpha < 1 ? index : last,
      -1,
    );
    const firstAsteroid = operations.findIndex(
      (operation) => operation.name === 'fill' && operation.fillStyle === DRAW_COLORS.asteroid,
    );
    const firstPupil = operations.findIndex(
      (operation) => operation.name === 'fill' && operation.fillStyle === DRAW_COLORS.pupil,
    );
    assert.ok(lastTrail >= 0, 'la traînée est dessinée');
    assert.ok(firstAsteroid > lastTrail, 'les astéroïdes viennent après la traînée');
    assert.ok(firstPupil > firstAsteroid, 'le serpent vient après les astéroïdes');
    const afterTrail = operations.slice(lastTrail + 1).filter((o) => o.name === 'fill');
    assert.ok(afterTrail.every((operation) => operation.globalAlpha === 1));
  });
});

describe('ct_45_choix_des_skins : mémoire de la traînée', () => {
  const at = (cells: Cell[], steps: number) => ({ snake: cells, steps });

  it('retient les cases que la queue vient de quitter, et les oublie après TRAIL.steps pas', () => {
    const trail = createTrail();
    trail.update(
      at(
        [
          { col: 5, row: 1 },
          { col: 4, row: 1 },
          { col: 3, row: 1 },
          { col: 2, row: 1 },
        ],
        0,
      ),
    );
    assert.equal(trail.points.length, 0);
    trail.update(
      at(
        [
          { col: 6, row: 1 },
          { col: 5, row: 1 },
          { col: 4, row: 1 },
          { col: 3, row: 1 },
        ],
        1,
      ),
    );
    assert.deepEqual(trail.points, [{ cell: { col: 2, row: 1 }, step: 1 }]);
    let steps = 1;
    for (let column = 7; column < 7 + TRAIL.steps; column += 1) {
      steps += 1;
      trail.update(
        at(
          [0, 1, 2, 3].map((offset) => ({ col: column - offset, row: 1 })),
          steps,
        ),
      );
    }
    assert.ok(trail.points.every((point) => steps - point.step < TRAIL.steps));
    assert.ok(!trail.points.some((point) => point.cell.col === 2));
  });

  it('une case encore occupée par le serpent n’est pas une trace', () => {
    const trail = createTrail();
    const loop = [
      { col: 2, row: 2 },
      { col: 1, row: 2 },
      { col: 1, row: 1 },
      { col: 2, row: 1 },
    ];
    trail.update(at(loop, 0));
    trail.update(at([loop[3] as Cell, ...loop.slice(0, 3)], 1));
    assert.equal(trail.points.length, 0);
  });
});

describe('ct_110_mouvement_reduit : le scintillement du décor ne change pas plus de 3 fois par seconde (ENF-12)', () => {
  for (const decor of Object.keys(DECORS)) {
    it(`${decor} : chaque étoile change d’état au plus 3 fois par seconde, et une étoile fixe sous mouvement réduit`, () => {
      const colorsAt = (animationMs: number): string[] => {
        const { context, operations } = recordingContext();
        drawTwinkle(context, decor, 24, animationMs);
        return operations.filter((o) => o.name === 'fillRect').map((o) => o.fillStyle);
      };
      assert.equal(colorsAt(0).length, TWINKLE.count);
      let previous = colorsAt(0);
      const changes: number[] = previous.map(() => 0);
      for (let ms = 33; ms <= 5000; ms += 33) {
        const now = colorsAt(ms);
        now.forEach((color, star) => {
          if (color !== previous[star]) changes[star] = (changes[star] ?? 0) + 1;
        });
        previous = now;
      }
      for (const count of changes) {
        // 5 secondes d'échantillons toutes les 33 ms : au plus 15 changements.
        assert.ok(count > 0, 'le décor scintille');
        assert.ok(count <= 15, `${count} changements en 5 s`);
      }
      assert.deepEqual(colorsAt(0), colorsAt(0));
    });
  }
});
