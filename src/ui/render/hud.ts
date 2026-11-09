import type { SpecialType } from '../../core/rules.ts';
import type { CandyColorId } from '../../core/types.ts';
import { createElement } from '../dom.ts';
import { TEXTS, effectLabel, nextColorLabel, sequenceLabel, timeLabel } from '../texts.ts';
import { drawCandy, drawPictogram } from './candies.ts';

/** Information propre au mode, au centre du bandeau (RG-04) ; null quand le mode n'en a pas. */
export type HudInfo =
  | { kind: 'time'; seconds: number }
  /** `seconds` vaut null pour l'annonce brève d'un effet immédiat (Rétrécissement). */
  | { kind: 'effect'; type: SpecialType; seconds: number | null }
  | { kind: 'constellation'; sequence: readonly CandyColorId[]; progress: number }
  | null;

export interface Hud {
  element: HTMLElement;
  setScore: (score: number) => void;
  /** Met à jour l'information du mode ; le DOM n'est réécrit que si elle a changé. */
  setInfo: (info: HudInfo) => void;
  /** Rend le focus au bouton pause (fermeture de la boîte de pause). */
  focusPause: () => void;
}

const ICON_PX = 28;

/**
 * Petite image décorative dessinée par le code : le sens est porté par le texte voisin. C'est une image et non un
 * canevas, pour que le canevas de l'aire de jeu reste le seul de la partie.
 */
function createIcon(draw: (context: CanvasRenderingContext2D, size: number) => void): HTMLElement {
  const canvas = document.createElement('canvas');
  const ratio = 2;
  canvas.width = ICON_PX * ratio;
  canvas.height = ICON_PX * ratio;
  const context = canvas.getContext('2d');
  const image = createElement('img', {
    className: 'hud-icon',
    attributes: { 'aria-hidden': 'true' },
  });
  image.alt = '';
  if (context !== null) {
    context.scale(ratio, ratio);
    draw(context, ICON_PX);
    image.src = canvas.toDataURL('image/png');
  }
  return image;
}

function infoKey(info: HudInfo): string {
  if (info === null) return '';
  if (info.kind === 'time') return `time:${info.seconds}`;
  if (info.kind === 'effect') return `effect:${info.type}:${info.seconds ?? ''}`;
  return `constellation:${info.sequence.join(',')}:${info.progress}`;
}

function infoElement(info: NonNullable<HudInfo>): HTMLElement {
  if (info.kind === 'time') {
    // Le temps change chaque seconde : un minuteur n'est pas lu à chaque changement.
    return createElement('p', {
      className: 'hud-info hud-time',
      text: timeLabel(info.seconds),
      attributes: { role: 'timer' },
    });
  }
  if (info.kind === 'effect') {
    return createElement('p', { className: 'hud-info hud-effect' }, [
      createIcon((context, size) => drawPictogram(context, info.type, 0, 0, size)),
      createElement('span', { text: effectLabel(info.type, info.seconds) }),
    ]);
  }
  // La constellation à tracer : trois silhouettes dans l'ordre, la couleur attendue entourée d'un cadre épais.
  const expected = info.sequence[info.progress];
  const stars = info.sequence.map((color, index) =>
    createElement(
      'span',
      {
        className: `hud-star${index === info.progress ? ' is-next' : index < info.progress ? ' is-done' : ''}`,
      },
      [createIcon((context, size) => drawCandy(context, color, 1, 1, size - 2))],
    ),
  );
  return createElement(
    'div',
    {
      className: 'hud-info hud-constellation',
      attributes: { role: 'group', 'aria-label': sequenceLabel(info.sequence) },
    },
    [
      ...stars,
      createElement('span', {
        text: expected === undefined ? '' : nextColorLabel(expected),
      }),
    ],
  );
}

/** Bandeau d'information, hors de la grille (RG-04) : score à gauche, information du mode au centre, bouton pause à droite. */
export function createHud(onPause: () => void): Hud {
  const score = createElement('p', { className: 'hud-score' });
  const center = createElement('div', { className: 'hud-center' });
  let shown: number | null = null;
  let shownInfo = '';
  // Pictogramme et nom visible : le nom accessible est le texte affiché.
  const pause = createElement(
    'button',
    { className: 'hud-pause', attributes: { type: 'button' } },
    [
      createElement('span', {
        className: 'hud-pause-symbol',
        text: TEXTS.game.pauseSymbol,
        attributes: { 'aria-hidden': 'true' },
      }),
      createElement('span', { className: 'hud-pause-label', text: TEXTS.game.pause }),
    ],
  );
  // La pause se prend dès que le doigt touche : le navigateur peut ne pas produire de `click` pour un toucher
  // qui suit de près un glissement. Annuler `pointerdown` évite les événements souris qui suivraient et
  // reprendraient le focus que la boîte de pause vient de recevoir. Au clavier, Entrée ou Espace passent par `click`.
  pause.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    onPause();
  });
  pause.addEventListener('click', (event) => {
    if (event.detail === 0) onPause();
  });
  const hud: Hud = {
    element: createElement('header', { className: 'hud' }, [score, center, pause]),
    setScore(value) {
      // Appelé à chaque image : le texte n'est réécrit que si le score a changé.
      if (value === shown) return;
      shown = value;
      score.textContent = `${TEXTS.game.score} ${value}`;
    },
    setInfo(info) {
      const key = infoKey(info);
      if (key === shownInfo) return;
      shownInfo = key;
      center.replaceChildren(...(info === null ? [] : [infoElement(info)]));
    },
    focusPause() {
      pause.focus();
    },
  };
  hud.setScore(0);
  return hud;
}
