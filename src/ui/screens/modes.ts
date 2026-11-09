import { ASTEROIDS_MODE } from '../../core/modes/asteroids.ts';
import { BLACK_HOLE_MODE } from '../../core/modes/black-hole.ts';
import { BONUS_TRAPS } from '../../core/modes/bonus-traps.ts';
import { CLASSIC } from '../../core/modes/classic.ts';
import { CONSTELLATION_MODE } from '../../core/modes/constellation.ts';
import { TIME_ATTACK_MODE } from '../../core/modes/time-attack.ts';
import { ZEN_MODE } from '../../core/modes/zen.ts';
import { DRAW_COLORS, MYSTERY } from '../../core/rules.ts';
import type { ModeId } from '../../core/rules.ts';
import type { ModeRules } from '../../core/types.ts';
import { createButton, createElement } from '../dom.ts';
import type { Screen } from '../router.ts';
import { TEXTS, lockedModeMessage } from '../texts.ts';
import { showToast } from '../toast.ts';

/** Tous les modes, dans l'ordre de la liste (RG-02) ; le mode surprise est le dernier. */
const ALL_MODES: readonly ModeRules[] = [
  CLASSIC,
  TIME_ATTACK_MODE,
  ASTEROIDS_MODE,
  BLACK_HOLE_MODE,
  BONUS_TRAPS,
  ZEN_MODE,
  CONSTELLATION_MODE,
];

/** Identifiants des modes jouables, dans l'ordre de la liste : le mode surprise n'en fait partie qu'une fois découvert. */
export function availableModeIds(discovered: boolean): ModeId[] {
  return ALL_MODES.map((mode) => mode.id).filter((id) => discovered || id !== MYSTERY.mode);
}

/** Règles d'un mode, ou undefined s'il n'existe pas. */
export function findModeRules(id: ModeId): ModeRules | undefined {
  return ALL_MODES.find((mode) => mode.id === id);
}

export function modeName(id: ModeId): string {
  return TEXTS.modeNames[id];
}

/** Cadenas dessiné par le code, décoratif : le texte voisin dit que le mode est verrouillé. */
function createPadlock(): HTMLElement {
  const canvas = createElement('canvas', {
    className: 'mode-lock',
    attributes: { 'aria-hidden': 'true' },
  });
  canvas.width = 48;
  canvas.height = 48;
  const context = canvas.getContext('2d');
  if (context !== null) {
    context.strokeStyle = DRAW_COLORS.outline;
    context.fillStyle = DRAW_COLORS.outline;
    context.lineWidth = 4;
    context.beginPath();
    context.arc(24, 20, 9, Math.PI, 0);
    context.lineTo(33, 24);
    context.moveTo(15, 24);
    context.lineTo(15, 20);
    context.stroke();
    context.beginPath();
    context.roundRect(10, 24, 28, 20, 4);
    context.fill();
  }
  return canvas;
}

export interface ModesOptions {
  /** Parties qui restent à terminer avant la découverte du mode surprise ; 0 s'il est découvert (RG-40). */
  gamesLeft: number;
  onSelect: (rules: ModeRules) => void;
  onBack: () => void;
}

/**
 * E2 Choix du mode : chaque ligne est un bouton, un toucher lance la partie. Tant que le mode surprise n'est pas
 * découvert, sa place est un « Mode mystère » verrouillé : focalisable, lu comme désactivé, il n'affiche que son message.
 */
export function createModesScreen(options: ModesOptions): Screen {
  const discovered = options.gamesLeft === 0;
  const buttons = ALL_MODES.filter((mode) => discovered || mode.id !== MYSTERY.mode).map((mode) => {
    const button = createButton('', 'button mode-button', () => options.onSelect(mode));
    button.append(
      createElement('span', { className: 'mode-name', text: modeName(mode.id) }),
      createElement('span', { className: 'mode-rule', text: TEXTS.modes.rules[mode.id] }),
    );
    return button;
  });
  if (!discovered) {
    const message = lockedModeMessage(options.gamesLeft);
    const locked = createButton('', 'button mode-button mode-locked', () => showToast(message));
    locked.setAttribute('aria-disabled', 'true');
    locked.append(
      createElement('span', { className: 'mode-name' }, [
        createPadlock(),
        createElement('span', { text: TEXTS.modes.mystery }),
      ]),
      createElement('span', { className: 'mode-rule', text: message }),
    );
    buttons.push(locked);
  }
  const back = createButton(TEXTS.navigation.back, 'button button-back', options.onBack);
  const element = createElement('main', { className: 'screen' }, [
    createElement('header', { className: 'screen-header' }, [
      back,
      createElement('h1', { className: 'screen-title', text: TEXTS.modes.title }),
    ]),
    createElement('div', { className: 'mode-list' }, buttons),
  ]);
  return {
    element,
    start() {
      buttons[0]?.focus();
    },
    onEscape: options.onBack,
  };
}
