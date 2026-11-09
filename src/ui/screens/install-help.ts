import type { Installer, Phone } from '../../platform/install.ts';
import { announce } from '../announcer.ts';
import { createButton, createElement } from '../dom.ts';
import type { Screen } from '../router.ts';
import { TEXTS } from '../texts.ts';

export interface InstallHelpOptions {
  installer: Installer;
  onBack: () => void;
}

const HEADINGS: Record<Phone, string> = {
  android: TEXTS.installHelp.android,
  iphone: TEXTS.installHelp.iphone,
};
const STEPS: Record<Phone, readonly string[]> = {
  android: TEXTS.installHelp.androidSteps,
  iphone: TEXTS.installHelp.iphoneSteps,
};

/** E14 Panneau « Installer le jeu » : les gestes d'installation du téléphone utilisé (RG-92). */
export function createInstallHelpScreen(options: InstallHelpOptions): Screen {
  const { installer } = options;
  const own = installer.phone();
  const other: Phone = own === 'android' ? 'iphone' : 'android';
  let showOther = false;
  const body = createElement('div', { className: 'install-body' });
  let announcedInstalled = false;

  const steps = (phone: Phone): Node => {
    const children: Node[] = [
      createElement('h2', { text: HEADINGS[phone] }),
      createElement(
        'ol',
        { className: 'install-steps' },
        STEPS[phone].map((text) => createElement('li', { text })),
      ),
    ];
    if (phone === 'iphone') {
      children.push(createElement('p', { text: TEXTS.installHelp.iphoneReminder }));
    }
    return createElement('section', { className: 'install-section' }, children);
  };

  const render = (): void => {
    const status = installer.status();
    const children: Node[] = [createElement('p', { text: TEXTS.installHelp.intro })];
    if (status.justInstalled) {
      children.push(
        createElement('p', {
          className: 'install-done',
          text: TEXTS.installHelp.installed,
          attributes: { role: 'status' },
        }),
      );
      if (!announcedInstalled) {
        announcedInstalled = true;
        announce(TEXTS.installHelp.installed);
      }
    } else {
      if (own === 'android' && status.canPrompt) {
        children.push(
          createButton(TEXTS.installHelp.promptButton, 'button button-primary', () =>
            installer.promptInstall(),
          ),
        );
      }
      children.push(steps(own));
      if (showOther) children.push(steps(other));
      else {
        children.push(
          createButton(TEXTS.installHelp.otherPhone, 'button button-secondary', () => {
            showOther = true;
            render();
          }),
        );
      }
    }
    body.replaceChildren(...children);
  };

  const back = createButton(TEXTS.navigation.back, 'button button-back', options.onBack);
  const element = createElement('main', { className: 'screen' }, [
    createElement('header', { className: 'screen-header' }, [
      back,
      createElement('h1', { className: 'screen-title', text: TEXTS.installHelp.title }),
    ]),
    body,
  ]);
  render();
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
