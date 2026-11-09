import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { nuance } from '../../src/core/color.ts';
import {
  BLACK_HOLES,
  CANDY_COLORS,
  DECORS,
  DEFAULT_DECOR,
  DRAW_COLORS,
  NUANCE,
  RAINBOW_COLORS,
  SKY,
  SKINS,
  TWINKLE,
} from '../../src/core/rules.ts';
import { contrast, luminance } from '../support/contraste.ts';

const css = readFileSync('public/styles.css', 'utf8');

function cssColor(name: string): string {
  const match = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css);
  assert.ok(match?.[1], `variable CSS --${name} introuvable`);
  return match[1];
}

describe('ct_21_silhouettes_et_contrastes : contrastes calculés sur la palette (ENF-11)', () => {
  const base = DEFAULT_DECOR.base;

  it('chaque couleur de bonbon et de serpent fait au moins 3:1 avec le décor par défaut', () => {
    for (const color of CANDY_COLORS) {
      const ratio = contrast(color.hex, base);
      assert.ok(ratio >= 3, `${color.id} : ${ratio.toFixed(2)}:1`);
    }
  });

  it('chaque teinte de l’arc-en-ciel fait au moins 3:1 avec le décor, et il y en a au moins 5', () => {
    assert.ok(new Set(RAINBOW_COLORS).size >= 5);
    for (const color of RAINBOW_COLORS) {
      const ratio = contrast(color, base);
      assert.ok(ratio >= 3, `${color} : ${ratio.toFixed(2)}:1`);
    }
  });

  it('le contour blanc des éléments de jeu fait au moins 3:1 avec le décor', () => {
    assert.ok(contrast(DRAW_COLORS.outline, base) >= 3);
    assert.ok(contrast(DRAW_COLORS.pupil, DRAW_COLORS.eyeWhite) >= 3);
  });

  it('les détails du décor restent à une luminance de 0,08 au plus', () => {
    assert.ok(luminance(DEFAULT_DECOR.star) <= 0.08);
    assert.ok(luminance(DEFAULT_DECOR.grid) <= 0.08);
  });

  it('les textes de la feuille de style font au moins 4,5:1 avec leur fond', () => {
    const background = cssColor('background');
    const surface = cssColor('surface');
    const text = cssColor('text');
    const accent = cssColor('accent');
    assert.ok(contrast(text, background) >= 4.5, 'texte sur fond');
    assert.ok(contrast(text, surface) >= 4.5, 'texte sur surface');
    assert.ok(contrast(background, accent) >= 4.5, 'texte du bouton principal');
    assert.ok(contrast(cssColor('border'), background) >= 3, 'bordure des boutons');
    assert.ok(contrast(cssColor('focus'), background) >= 3, 'contour du focus');
  });
});

describe('ct_107_charte_couleurs : astéroïdes, trous noirs et pictogrammes sur le décor par défaut (ENF-11)', () => {
  const base = DEFAULT_DECOR.base;

  it('l’astéroïde, cerné de blanc, et ses cratères sombres se distinguent du décor et de la roche', () => {
    assert.ok(contrast(DRAW_COLORS.asteroid, base) >= 3, 'roche sur décor');
    assert.ok(contrast(DRAW_COLORS.outline, base) >= 3, 'contour sur décor');
    assert.ok(contrast(DRAW_COLORS.crater, DRAW_COLORS.asteroid) >= 1.5, 'cratère sur roche');
  });

  it('chaque halo de trou noir fait au moins 3:1 avec le décor et avec le centre sombre', () => {
    for (const halo of BLACK_HOLES.halos) {
      assert.ok(contrast(halo.hex, base) >= 3, `${halo.hex} sur décor`);
      assert.ok(contrast(halo.hex, DRAW_COLORS.holeCore) >= 3, `${halo.hex} sur le centre`);
    }
    assert.notEqual(BLACK_HOLES.halos[0].hex, BLACK_HOLES.halos[1].hex);
  });

  it('le pictogramme blanc, cerné de sombre, reste lisible sur chacune des quatre couleurs de bonbon', () => {
    assert.ok(contrast(DRAW_COLORS.pictogram, DRAW_COLORS.pictogramOutline) >= 3);
    for (const color of CANDY_COLORS) {
      assert.ok(
        contrast(DRAW_COLORS.pictogramOutline, color.hex) >= 3,
        `contour sombre sur ${color.id}`,
      );
    }
    assert.ok(contrast(DRAW_COLORS.pictogram, base) >= 4.5, 'pictogramme du bandeau sur le fond');
  });
});

describe('ct_21_silhouettes_et_contrastes : les 4 décors (ENF-11, RG-61)', () => {
  const decors = Object.entries(DECORS);
  const text = cssColor('text');
  const secondary = cssColor('text-secondary');
  const elements: [string, string][] = [
    ...CANDY_COLORS.map((color): [string, string] => [color.id, color.hex]),
    ...RAINBOW_COLORS.map((color): [string, string] => [`arc-en-ciel ${color}`, color]),
    ['astéroïde', DRAW_COLORS.asteroid],
    ...BLACK_HOLES.halos.map((halo, index): [string, string] => [
      `trou noir ${index + 1}`,
      halo.hex,
    ]),
    ['contour', DRAW_COLORS.outline],
    ['pictogramme', DRAW_COLORS.pictogram],
  ];
  const detailColors = (decor: (typeof DECORS)[keyof typeof DECORS]): string[] => [
    decor.grid,
    decor.star,
    decor.twinkle,
    ...(decor.feature?.colors ?? []),
  ];
  const maxChannel = (hex: string): number =>
    Math.max(...[1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)));

  it('le catalogue a un décor par skin de décor, et le premier est celui par défaut', () => {
    const ids = SKINS.filter((skin) => skin.category === 'decor').map((skin) => skin.id);
    assert.deepEqual(Object.keys(DECORS), ids);
    assert.equal(DEFAULT_DECOR, DECORS[ids[0] as keyof typeof DECORS]);
  });

  for (const [id, decor] of decors) {
    it(`${id} : chaque élément de jeu fait au moins 3:1 avec le fond, chaque texte au moins 4,5:1`, () => {
      for (const [name, hex] of elements) {
        const ratio = contrast(hex, decor.base);
        assert.ok(ratio >= 3, `${name} : ${ratio.toFixed(2)}:1`);
      }
      assert.ok(contrast(text, decor.base) >= 4.5, 'texte principal');
      assert.ok(contrast(secondary, decor.base) >= 4.5, 'texte secondaire');
    });

    it(`${id} : les nuances des motifs et des traînées, plus claires que le serpent, gardent 3:1`, () => {
      for (const color of CANDY_COLORS) {
        for (const white of [NUANCE.soft, NUANCE.white]) {
          assert.ok(contrast(nuance(color.hex, white), decor.base) >= 3, `${color.id} ${white}`);
        }
      }
    });

    it(`${id} : les détails restent sombres (luminance de 0,08 au plus) et le contour blanc les domine`, () => {
      for (const hex of [...detailColors(decor), SKY.color]) {
        assert.ok(luminance(hex) <= 0.08, `${hex} : ${luminance(hex).toFixed(4)}`);
        assert.ok(maxChannel(hex) < 0x90, `${hex} : canal trop clair`);
        assert.ok(contrast(DRAW_COLORS.outline, hex) >= 3, `contour sur ${hex}`);
      }
    });
  }

  it('le scintillement change au plus 3 fois par seconde', () => {
    assert.ok(1000 / TWINKLE.stateMs <= 3);
  });
});
