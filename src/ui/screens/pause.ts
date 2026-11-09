import { createButton, createElement } from '../dom.ts';
import { TEXTS, abandonMessage } from '../texts.ts';

export interface PauseDialogs {
  element: HTMLElement;
  /** Écran de pause ; `automatic` ajoute « Partie mise en pause » (interruption, orientation verticale). */
  showPause(automatic: boolean): void;
  hide(): void;
  /** Échap : « Non » dans la confirmation d'abandon, « Reprendre » dans la pause. */
  escape(): void;
}

/** E5 Pause et abandon : boîtes de dialogue qui enferment le focus. */
export function createPauseDialogs(handlers: {
  getScore: () => number;
  onResume: () => void;
  onAbandon: () => void;
}): PauseDialogs {
  const overlay = createElement('div', { className: 'overlay' });
  overlay.hidden = true;
  let confirmOpen = false;
  // « Partie mise en pause » reste affiché si le joueur ouvre la confirmation d'abandon puis répond « Non ».
  let automaticNote = false;

  const open = (dialog: HTMLElement, focused: HTMLElement): void => {
    overlay.replaceChildren(dialog);
    overlay.hidden = false;
    focused.focus();
  };

  const showPause = (automatic: boolean): void => {
    confirmOpen = false;
    automaticNote = automatic;
    const resume = createButton(TEXTS.pause.resume, 'button button-primary', handlers.onResume);
    const abandon = createButton(TEXTS.pause.abandon, 'button', () =>
      showConfirm(handlers.getScore()),
    );
    const children: Node[] = [];
    if (automatic)
      children.push(createElement('p', { className: 'dialog-note', text: TEXTS.pause.automatic }));
    children.push(
      createElement('h2', { text: TEXTS.pause.title, attributes: { id: 'pause-title' } }),
      resume,
      abandon,
    );
    open(
      createElement(
        'div',
        {
          className: 'dialog',
          attributes: { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'pause-title' },
        },
        children,
      ),
      resume,
    );
  };

  const showConfirm = (score: number): void => {
    confirmOpen = true;
    const no = createButton(TEXTS.pause.no, 'button button-primary', () =>
      showPause(automaticNote),
    );
    const yes = createButton(TEXTS.pause.yes, 'button', handlers.onAbandon);
    open(
      createElement(
        'div',
        {
          className: 'dialog',
          attributes: { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'confirm-title' },
        },
        [
          createElement('h2', {
            text: TEXTS.pause.confirmTitle,
            attributes: { id: 'confirm-title' },
          }),
          createElement('p', { text: abandonMessage(score) }),
          createElement('div', { className: 'dialog-actions' }, [no, yes]),
        ],
      ),
      no,
    );
  };

  // Le focus reste dans la boîte ouverte (Tab et Maj+Tab font le tour de ses boutons).
  overlay.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const buttons = [...overlay.querySelectorAll('button')];
    const first = buttons[0];
    const last = buttons.at(-1);
    if (first === undefined || last === undefined) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  return {
    element: overlay,
    showPause,
    hide() {
      confirmOpen = false;
      overlay.hidden = true;
      overlay.replaceChildren();
    },
    escape() {
      if (confirmOpen) showPause(automaticNote);
      else if (!overlay.hidden) handlers.onResume();
    },
  };
}
