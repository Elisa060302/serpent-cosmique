import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { GRID, LAYOUT, PX_PER_MM, SIZES_MM } from '../../src/core/rules.ts';
import { computeLayout } from '../../src/ui/layout.ts';

/** Profils de 07 § 1.2 : largeur, hauteur (pixels CSS) et taille réelle d'un pixel CSS (mm). */
const PROFILES = [
  { name: 'S22', width: 780, height: 360, mmPerPx: 0.18, minMm: 4 },
  { name: 'iPhone SE 3', width: 667, height: 375, mmPerPx: 0.156, minMm: 3 },
  { name: '16:9 de 5 pouces', width: 640, height: 360, mmPerPx: 0.173, minMm: 3 },
  { name: '21:9 de 6,9 pouces', width: 960, height: 411, mmPerPx: 0.168, minMm: 3 },
] as const;

describe('ct_82_grille_entiere_et_cases : disposition de la partie', () => {
  for (const profile of PROFILES) {
    for (const control of ['swipe', 'arrows'] as const) {
      it(`${profile.name}, ${control} : grille 24 × 12 entière, cases d’au moins ${profile.minMm} mm`, () => {
        const layout = computeLayout(profile.width, profile.height, control);
        const columns = control === 'arrows' ? 2 * layout.arrowColumn : 0;
        assert.equal(layout.gridWidth, layout.cell * GRID.columns);
        assert.equal(layout.gridHeight, layout.cell * GRID.rows);
        assert.ok(layout.gridWidth + columns <= profile.width, 'la grille déborde en largeur');
        assert.ok(
          layout.gridHeight + LAYOUT.hudHeightPx <= profile.height,
          'la grille déborde en hauteur',
        );
        assert.ok(layout.cell >= LAYOUT.minCellPx, `case de ${layout.cell} px`);
        assert.ok(
          layout.cell * profile.mmPerPx >= profile.minMm,
          `${layout.cell * profile.mmPerPx} mm`,
        );
      });
    }
  }

  it('en « Flèches », deux colonnes encadrent la grille et rien ne la recouvre', () => {
    const layout = computeLayout(667, 375, 'arrows');
    assert.equal(layout.arrowColumn, LAYOUT.arrowPx + 2 * layout.arrowPad);
    assert.ok(layout.arrowColumn - 2 * layout.arrowPad >= SIZES_MM.arrow * PX_PER_MM);
    assert.equal(computeLayout(667, 375, 'swipe').arrowColumn, 0);
  });

  it('ct_82_marges : la marge de 8 px entoure les colonnes de flèches, sauf case sous le minimum', () => {
    const roomy = computeLayout(780, 360, 'arrows');
    assert.equal(roomy.arrowPad, LAYOUT.marginPx);
    const free = 780 - roomy.gridWidth - 2 * roomy.arrowColumn;
    assert.ok(free >= 0, 'les colonnes débordent');
    const tight = computeLayout(560, LAYOUT.hudHeightPx + GRID.rows * LAYOUT.minCellPx, 'arrows');
    assert.equal(tight.arrowPad, 0);
  });

  it('les tailles tactiles minimales viennent de SIZES_MM (une seule valeur)', () => {
    assert.ok(LAYOUT.pauseButtonPx >= SIZES_MM.pauseButton * PX_PER_MM, 'bouton pause trop petit');
    assert.ok(LAYOUT.hudHeightPx >= LAYOUT.pauseButtonPx + LAYOUT.marginPx, 'marge haute absente');
    assert.ok(LAYOUT.arrowPx >= SIZES_MM.arrow * PX_PER_MM, 'flèche trop petite');
    assert.equal(computeLayout(780, 360, 'swipe').hudHeight, LAYOUT.hudHeightPx);
  });

  it('les marges sont retirées avant de réduire la case sous le minimum', () => {
    const tight = computeLayout(560, LAYOUT.hudHeightPx + GRID.rows * LAYOUT.minCellPx, 'swipe');
    assert.equal(tight.cell, LAYOUT.minCellPx);
  });
});
