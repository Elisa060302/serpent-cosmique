import type { Installer } from '../../platform/install.ts';
import { createButton, createElement } from '../dom.ts';
import type { Screen } from '../router.ts';
import { TEXTS } from '../texts.ts';

export interface MenuOptions {
  onPlay: () => void;
  onRecords: () => void;
  onSkins: () => void;
  onSettings: () => void;
  onSave: () => void;
  onInstallHelp: () => void;
  installer: Installer;
  /** Au retour d'un sous-écran, le focus revient au bouton qui l'a ouvert (05 § 6). */
  focus: 'play' | 'records' | 'skins' | 'settings' | 'save' | 'install' | null;
}

/** E1 Menu principal : « Jouer » en grand, les quatre autres entrées en colonne. */
export function createMenuScreen(options: MenuOptions): Screen {
  const play = createButton(TEXTS.menu.play, 'button button-primary', options.onPlay);
  const records = createButton(TEXTS.menu.records, 'button button-secondary', options.onRecords);
  const skins = createButton(TEXTS.menu.skins, 'button button-secondary', options.onSkins);
  const settings = createButton(TEXTS.menu.settings, 'button button-secondary', options.onSettings);
  const save = createButton(TEXTS.menu.save, 'button button-secondary', options.onSave);

  // Repère de mise à jour (RG-89) : du texte, pas seulement un point.
  const marker = createElement('span', {
    className: 'menu-badge',
    text: ` ${TEXTS.menu.updateMarker}`,
  });
  const install = createButton(TEXTS.menu.installButton, 'button button-secondary', () =>
    options.onInstallHelp(),
  );
  // Bandeau d'installation (RG-92) : seulement dans le navigateur, pas dans l'application installée.
  const banner = createElement('div', { className: 'install-banner' }, [
    createElement('p', { text: TEXTS.menu.installPrompt }),
    install,
  ]);

  const refresh = (): void => {
    const status = options.installer.status();
    const offered = status.offer !== null;
    if (offered && marker.parentElement === null) settings.append(marker);
    if (!offered) marker.remove();
    banner.hidden = options.installer.isInstalled() || status.justInstalled;
  };
  refresh();

  const element = createElement('main', { className: 'menu' }, [
    createElement('section', { className: 'menu-main' }, [
      createElement('h1', { className: 'menu-title', text: TEXTS.appName }),
      play,
      banner,
    ]),
    createElement('nav', { className: 'menu-side' }, [records, skins, settings, save]),
  ]);
  let stop: (() => void) | null = null;
  return {
    element,
    start() {
      stop = options.installer.subscribe(refresh);
      if (options.focus === 'play') play.focus();
      else if (options.focus === 'records') records.focus();
      else if (options.focus === 'skins') skins.focus();
      else if (options.focus === 'settings') settings.focus();
      else if (options.focus === 'save') save.focus();
      else if (options.focus === 'install') install.focus();
    },
    dispose() {
      stop?.();
    },
  };
}
