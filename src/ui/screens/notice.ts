import { createButton, createElement } from '../dom.ts';
import type { Screen } from '../router.ts';

export interface NoticeOptions {
  title?: string;
  lines: string[];
  buttonLabel: string;
  /** Une erreur est annoncée tout de suite aux lecteurs d'écran (rôle `alert`). */
  isError?: boolean;
  onContinue: () => void;
}

/** E13 Messages au lancement : boîte de dialogue affichée avant le menu (partie interrompue, progression illisible). */
export function createNoticeScreen(options: NoticeOptions): Screen {
  const button = createButton(options.buttonLabel, 'button button-primary', options.onContinue);
  const messageAttributes: Record<string, string> = { id: 'notice-message' };
  if (options.isError === true) messageAttributes['role'] = 'alert';
  const [first, ...others] = options.lines;
  const message = createElement('p', { text: first ?? '', attributes: messageAttributes });
  const children: Node[] = [];
  if (options.title !== undefined) {
    children.push(createElement('h2', { text: options.title, attributes: { id: 'notice-title' } }));
  }
  // Une erreur porte l'icône « ! », masquée aux lecteurs d'écran, en plus du texte et du code (05 § 6).
  children.push(
    options.isError === true
      ? createElement('div', { className: 'about-error' }, [
          createElement('span', {
            className: 'toast-icon',
            text: '!',
            attributes: { 'aria-hidden': 'true' },
          }),
          message,
        ])
      : message,
  );
  for (const line of others) children.push(createElement('p', { text: line }));
  children.push(button);
  const dialog = createElement(
    'div',
    {
      className: 'dialog',
      attributes: {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': options.title === undefined ? 'notice-message' : 'notice-title',
        'aria-describedby': 'notice-message',
      },
    },
    children,
  );
  return {
    element: createElement('main', { className: 'notice' }, [dialog]),
    start() {
      button.focus();
    },
    onEscape: options.onContinue,
  };
}
