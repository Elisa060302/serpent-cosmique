import { createElement } from '../dom.ts';
import { TEXTS } from '../texts.ts';

/** E12 Tournez votre téléphone : seul contenu affiché en orientation verticale (la feuille de style le montre ou le cache). */
export function createRotateNotice(): HTMLElement {
  return createElement('div', { className: 'rotate-notice', attributes: { role: 'status' } }, [
    createElement('div', { className: 'rotate-icon', attributes: { 'aria-hidden': 'true' } }),
    createElement('p', { text: TEXTS.rotate }),
  ]);
}
