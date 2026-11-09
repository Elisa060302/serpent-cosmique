import { createElement } from './dom.ts';

let region: HTMLElement | null = null;

/**
 * Crée la zone vivante polie (invisible), valable pour tous les écrans. Elle doit exister avant le premier
 * message : les lecteurs d'écran n'annoncent pas le contenu initial d'une zone qui vient d'apparaître.
 */
export function installAnnouncer(): void {
  if (region !== null) return;
  region = createElement('div', {
    className: 'sr-only',
    attributes: { role: 'status', 'aria-live': 'polite' },
  });
  document.body.append(region);
}

/** Annonce un message aux lecteurs d'écran. */
export function announce(message: string): void {
  if (region !== null) region.textContent = message;
}
