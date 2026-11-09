import { VERSION } from '../../core/version.ts';
import type { InstallStatus, Installer } from '../../platform/install.ts';
import { announce } from '../announcer.ts';
import { createButton, createElement } from '../dom.ts';
import type { Screen } from '../router.ts';
import { TEXTS, newVersionMessage } from '../texts.ts';

export interface AboutOptions {
  installer: Installer;
  /** Ouvre E11 « Sauvegarde » : conseillée avant d'installer une nouvelle version. */
  onSave: () => void;
  onBack: () => void;
}

const OFFLINE_TEXTS: Record<InstallStatus['offline'], string> = {
  ready: TEXTS.about.offlineReady,
  preparing: TEXTS.about.offlinePreparing,
  unavailable: TEXTS.about.offlineUnavailable,
};

/** E10 À propos : version, état hors ligne et mise à jour consentie (RG-64, EF-29). */
export function createAboutScreen(options: AboutOptions): Screen {
  const { installer } = options;
  const offline = createElement('p', { className: 'about-offline' });
  const updatePanel = createElement('div', { className: 'about-update' });
  let announced: string | null = null;
  let focusRetry = false;

  const say = (message: string): void => {
    if (announced === message) return;
    announced = message;
    announce(message);
  };

  const render = (status: InstallStatus): void => {
    offline.replaceChildren(
      createElement('span', {
        className: 'about-check',
        text: status.offline === 'ready' ? '✔ ' : '',
        attributes: { 'aria-hidden': 'true' },
      }),
      document.createTextNode(OFFLINE_TEXTS[status.offline]),
    );
    const children: Node[] = [
      createElement('h2', { text: TEXTS.about.updateTitle, className: 'about-heading' }),
    ];
    let retry: HTMLButtonElement | null = null;
    if (status.offer === null) {
      children.push(
        createElement('p', { text: TEXTS.about.upToDate }),
        createElement('p', { className: 'about-help', text: TEXTS.about.upToDateHelp }),
      );
    } else {
      children.push(createElement('p', { text: newVersionMessage(status.offer) }));
      if (status.update === 'running') {
        const busy = createButton(TEXTS.about.install, 'button button-primary', () => undefined);
        busy.disabled = true;
        children.push(busy, createElement('p', { text: TEXTS.about.installing }));
        say(TEXTS.about.installing);
      } else {
        if (status.update === 'failed') {
          children.push(
            createElement('p', { className: 'about-error', attributes: { role: 'alert' } }, [
              createElement('span', {
                className: 'toast-icon',
                text: '!',
                attributes: { 'aria-hidden': 'true' },
              }),
              createElement('span', { text: TEXTS.about.failed }),
            ]),
          );
          retry = createButton(TEXTS.about.retry, 'button button-primary', () =>
            installer.update(),
          );
          children.push(retry);
        } else {
          children.push(
            createButton(TEXTS.about.install, 'button button-primary', () => installer.update()),
          );
        }
        children.push(createElement('p', { text: TEXTS.about.progressKept }));
        if (status.update !== 'failed') {
          children.push(
            createElement('p', { text: TEXTS.about.backupAdvice }),
            createButton(TEXTS.about.backupLink, 'button button-link', options.onSave),
          );
        }
      }
    }
    updatePanel.replaceChildren(...children);
    if (retry !== null && !focusRetry) {
      focusRetry = true;
      retry.focus();
    }
    if (status.update !== 'failed') focusRetry = false;
  };

  const back = createButton(TEXTS.navigation.back, 'button button-back', options.onBack);
  const element = createElement('main', { className: 'screen' }, [
    createElement('header', { className: 'screen-header' }, [
      back,
      createElement('h1', { className: 'screen-title', text: TEXTS.about.title }),
    ]),
    createElement('section', { className: 'about-identity' }, [
      createElement('p', { className: 'about-name', text: TEXTS.appName }),
      createElement('p', { text: `Version ${VERSION}` }),
      createElement('p', { text: TEXTS.about.copyright }),
    ]),
    offline,
    updatePanel,
  ]);
  render(installer.status());
  let stop: (() => void) | null = null;
  return {
    element,
    start() {
      stop = installer.subscribe(render);
      back.focus();
    },
    dispose() {
      stop?.();
    },
    onEscape: options.onBack,
  };
}
