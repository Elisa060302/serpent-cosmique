import { ERROR_TOAST_MS, TOAST_MS } from '../core/rules.ts';
import { announce } from './announcer.ts';
import { createElement } from './dom.ts';

let current: HTMLElement | null = null;
let timer = 0;

/** Ferme le message passager affiché, s'il y en a un (par exemple au lancement d'une partie). */
export function closeToast(): void {
  window.clearTimeout(timer);
  current?.remove();
  current = null;
}

/**
 * Message passager en bas d'écran (05 § 3) : annoncé aux lecteurs d'écran, il se ferme au toucher ou de lui-même
 * (6 s ; 8 s pour une erreur, qui porte l'icône « ! » en plus du texte et du code : la couleur ne dit rien seule).
 */
export function showToast(message: string, options: { error?: boolean } = {}): void {
  closeToast();
  if (options.error === true) {
    current = createElement('p', { className: 'toast toast-error' }, [
      createElement('span', {
        className: 'toast-icon',
        text: '!',
        attributes: { 'aria-hidden': 'true' },
      }),
      createElement('span', { className: 'toast-text', text: message }),
    ]);
  } else {
    current = createElement('p', { className: 'toast', text: message });
  }
  current.addEventListener('pointerdown', closeToast);
  document.body.append(current);
  announce(message);
  timer = window.setTimeout(closeToast, options.error === true ? ERROR_TOAST_MS : TOAST_MS);
}
