import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createGame, sendCommand, step } from '../../src/core/engine.ts';
import { CLASSIC } from '../../src/core/modes/classic.ts';
import type { Cell, Direction } from '../../src/core/types.ts';
import { runFor, startRunning, stepOnce, swipe } from './support/jeu.ts';

const STEP_MS = 1000 / 6;
const ARROW_NAMES: Record<Direction, string> = {
  up: 'Haut',
  down: 'Bas',
  left: 'Gauche',
  right: 'Droite',
};

/** Zigzag qui reste dans la grille : haut, droite, bas, droite… (20 commandes). */
const SEQUENCE: Direction[] = Array.from({ length: 20 }, (_, index) =>
  index % 4 === 0 ? 'up' : index % 4 === 2 ? 'down' : 'right',
);

/**
 * Chaque commande est envoyée presque à la fin de l'intervalle, juste avant le pas : le moteur de recette,
 * qui reçoit les mêmes commandes aux mêmes instants, dit où doit être la tête au pas suivant.
 */
async function sendJustBeforeEachStep(
  page: Page,
  send: (direction: Direction) => Promise<void>,
): Promise<void> {
  const oracle = createGame(CLASSIC, 1);
  step(oracle);
  // Synchronisation sur un pas : ensuite, la phase de l'horloge est connue à une image près.
  await stepOnce(page, 0);
  step(oracle);
  for (const [index, direction] of SEQUENCE.entries()) {
    await runFor(page, STEP_MS - 60);
    const accepted = sendCommand(oracle, direction);
    await send(direction);
    step(oracle);
    const reading = await stepOnce(page, 0);
    const head = oracle.snake[0] as Cell;
    expect(
      reading.head,
      `commande ${index + 1} (${direction}, acceptée : ${accepted})`,
    ).toMatchObject({
      col: head.col,
      row: head.row,
      direction: oracle.direction,
    });
  }
}

test('ct_85_reactivite : 20 commandes au glissement, chacune juste avant un pas, sont appliquées à ce pas', async ({
  page,
}) => {
  await startRunning(page);
  await sendJustBeforeEachStep(page, (direction) => swipe(page, direction));
});

test('ct_85_reactivite : 20 commandes aux flèches, chacune juste avant un pas, sont appliquées à ce pas', async ({
  page,
}) => {
  await startRunning(page, { control: 'arrows' });
  await sendJustBeforeEachStep(page, (direction) =>
    page.getByRole('button', { name: ARROW_NAMES[direction], exact: true }).tap(),
  );
});

test('ct_85_reactivite : le retour visuel d’une flèche touchée apparaît en 100 ms au plus (horloge réelle, 20 touchers)', async ({
  page,
}) => {
  // Horloge réelle : on mesure le délai entre le toucher et le changement d'état de la flèche.
  await page.goto('/?seed=1');
  await page.getByRole('button', { name: 'Réglages' }).tap();
  await page.getByRole('radio', { name: 'Flèches' }).tap();
  await page.getByRole('button', { name: '‹ Retour' }).tap();
  await page.getByRole('button', { name: 'Jouer' }).tap();
  await page.getByRole('button', { name: 'Classique' }).tap();
  const delays: number[] = [];
  for (let round = 0; round < 5; round += 1) {
    for (const direction of ['up', 'right', 'down', 'left'] as const) {
      const arrow = page.getByRole('button', { name: ARROW_NAMES[direction], exact: true });
      const delay = await arrow.evaluate(
        (element) =>
          new Promise<number>((resolve) => {
            const started = performance.now();
            const observer = new MutationObserver(() => {
              if (element.classList.contains('is-pressed')) {
                observer.disconnect();
                resolve(performance.now() - started);
              }
            });
            observer.observe(element, { attributes: true, attributeFilter: ['class'] });
            element.dispatchEvent(
              new PointerEvent('pointerdown', {
                pointerId: 5,
                pointerType: 'touch',
                bubbles: true,
                cancelable: true,
              }),
            );
            if (element.classList.contains('is-pressed')) {
              observer.disconnect();
              resolve(performance.now() - started);
            }
            setTimeout(() => resolve(10_000), 2000);
          }),
      );
      delays.push(delay);
      await arrow.evaluate((element) =>
        element.dispatchEvent(
          new PointerEvent('pointerup', { pointerId: 5, pointerType: 'touch', bubbles: true }),
        ),
      );
    }
  }
  expect(delays).toHaveLength(20);
  expect(Math.max(...delays)).toBeLessThanOrEqual(100);
});
