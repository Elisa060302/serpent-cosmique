import type { Settings } from '../../core/types.ts';
import type { Installer } from '../../platform/install.ts';
import { createButton, createElement } from '../dom.ts';
import type { Screen } from '../router.ts';
import { TEXTS } from '../texts.ts';

export interface SettingsOptions {
  settings: Settings;
  /** Faux quand le téléphone ne permet pas de vibrer (RG-63) : le réglage est grisé et expliqué. */
  vibrationsAvailable: boolean;
  /** Le réglage est enregistré et appliqué aussitôt par l'appelant (RG-62). */
  onChange: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  onAbout: () => void;
  onBack: () => void;
  installer: Installer;
}

type SwitchKey = 'sounds' | 'music' | 'vibrations';

interface SwitchRow {
  key: SwitchKey;
  label: string;
  states: { on: string; off: string };
}

const SWITCHES: readonly SwitchRow[] = [
  { key: 'sounds', label: TEXTS.settings.effects, states: TEXTS.settings.effectsState },
  { key: 'music', label: TEXTS.settings.music, states: TEXTS.settings.musicState },
  {
    key: 'vibrations',
    label: TEXTS.settings.vibrations,
    states: TEXTS.settings.vibrationsState,
  },
];

const CONTROLS = [
  { value: 'swipe', label: TEXTS.settings.swipe, help: TEXTS.settings.swipeHelp },
  { value: 'arrows', label: TEXTS.settings.arrows, help: TEXTS.settings.arrowsHelp },
] as const;

const ARROW_STEPS: Record<string, number | undefined> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
};

/** Pastille ou case dessinée par sa forme (pleine ou vide), jamais par la couleur seule. */
function marker(className: string): HTMLElement {
  return createElement('span', { className, attributes: { 'aria-hidden': 'true' } });
}

function withKeydown(element: HTMLElement, handler: (event: KeyboardEvent) => void): HTMLElement {
  element.addEventListener('keydown', handler);
  return element;
}

/** E9 Réglages : commande et trois interrupteurs, enregistrés à chaque toucher (05 § 4.9). */
export function createSettingsScreen(options: SettingsOptions): Screen {
  const current: Settings = { ...options.settings };
  const refreshers: (() => void)[] = [];

  const select = (value: Settings['control']): void => {
    if (current.control === value) return;
    current.control = value;
    options.onChange('control', value);
    refreshers.forEach((refresh) => refresh());
  };

  const radios = CONTROLS.map((choice) => {
    const dot = marker('choice-dot');
    const button = createElement(
      'button',
      {
        className: 'button choice',
        attributes: { type: 'button', role: 'radio', 'aria-checked': 'false', tabindex: '-1' },
      },
      [
        dot,
        createElement('span', { className: 'choice-text' }, [
          createElement('span', { className: 'choice-label', text: choice.label }),
          createElement('span', { className: 'choice-help', text: choice.help }),
        ]),
      ],
    );
    button.addEventListener('click', () => select(choice.value));
    refreshers.push(() => {
      const selected = current.control === choice.value;
      button.setAttribute('aria-checked', String(selected));
      // Un seul arrêt de tabulation : le choix coché ; les flèches du clavier passent de l'un à l'autre.
      button.tabIndex = selected ? 0 : -1;
      button.classList.toggle('is-selected', selected);
    });
    return button;
  });

  /** Flèches du clavier dans le groupe : le choix voisin est coché et reçoit le focus, en boucle. */
  const moveChoice = (event: KeyboardEvent): void => {
    const offset = ARROW_STEPS[event.key];
    if (offset === undefined) return;
    event.preventDefault();
    const index = CONTROLS.findIndex((choice) => choice.value === current.control);
    const next = CONTROLS[(index + offset + CONTROLS.length) % CONTROLS.length];
    if (next === undefined) return;
    select(next.value);
    radios.find((radio) => radio.tabIndex === 0)?.focus();
  };

  const rows = SWITCHES.map((row) => {
    const unavailable = row.key === 'vibrations' && !options.vibrationsAvailable;
    const box = marker('choice-box');
    const state = createElement('span', {
      className: 'choice-state',
      attributes: { 'aria-hidden': 'true' },
    });
    const button = createElement(
      'button',
      {
        className: 'button choice choice-switch',
        attributes: { type: 'button', role: 'switch', 'aria-checked': 'false' },
      },
      [createElement('span', { className: 'choice-label', text: row.label }), state, box],
    );
    const children: Node[] = [button];
    if (unavailable) {
      const note = createElement('p', {
        className: 'choice-note',
        text: TEXTS.settings.vibrationsUnavailable,
        attributes: { id: 'vibrations-note' },
      });
      button.disabled = true;
      button.setAttribute('aria-describedby', 'vibrations-note');
      children.push(note);
    }
    button.addEventListener('click', () => {
      current[row.key] = !current[row.key];
      options.onChange(row.key, current[row.key]);
      refreshers.forEach((refresh) => refresh());
    });
    refreshers.push(() => {
      const on = current[row.key];
      button.setAttribute('aria-checked', String(on));
      button.classList.toggle('is-selected', on);
      state.textContent = unavailable ? '' : on ? row.states.on : row.states.off;
    });
    return createElement('div', { className: 'choice-row' }, children);
  });
  refreshers.forEach((refresh) => refresh());

  const aboutBadge = createElement('span', {
    className: 'menu-badge',
    text: ` ${TEXTS.menu.updateMarker}`,
  });
  const about = createButton(TEXTS.settings.about, 'button choice-about', options.onAbout);
  about.append(
    createElement('span', {
      className: 'choice-arrow',
      text: '›',
      attributes: { 'aria-hidden': 'true' },
    }),
  );
  const refreshBadge = (): void => {
    if (options.installer.status().offer === null) aboutBadge.remove();
    else about.insertBefore(aboutBadge, about.lastChild);
  };
  refreshBadge();

  const back = createButton(TEXTS.navigation.back, 'button button-back', options.onBack);
  const element = createElement('main', { className: 'screen' }, [
    createElement('header', { className: 'screen-header' }, [
      back,
      createElement('h1', { className: 'screen-title', text: TEXTS.settings.title }),
    ]),
    createElement('div', { className: 'settings-columns' }, [
      createElement('section', { className: 'settings-section' }, [
        createElement('h2', { text: TEXTS.settings.control, attributes: { id: 'control-title' } }),
        withKeydown(
          createElement(
            'div',
            {
              className: 'choice-group',
              attributes: { role: 'radiogroup', 'aria-labelledby': 'control-title' },
            },
            radios,
          ),
          moveChoice,
        ),
        createElement('p', { className: 'choice-note', text: TEXTS.settings.nextGame }),
      ]),
      createElement('section', { className: 'settings-section' }, [
        createElement('h2', { text: TEXTS.settings.sounds }),
        createElement('div', { className: 'choice-group' }, rows),
        createElement('div', { className: 'choice-group choice-about-group' }, [about]),
      ]),
    ]),
  ]);
  let stop: (() => void) | null = null;
  return {
    element,
    start() {
      stop = options.installer.subscribe(refreshBadge);
      back.focus();
    },
    dispose() {
      stop?.();
    },
    onEscape: options.onBack,
  };
}
