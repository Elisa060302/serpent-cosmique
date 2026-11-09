/**
 * Événements du téléphone qui concernent le jeu : bouton retour, orientation, perte du premier plan
 * et maintien de l'écran allumé.
 */

const MARKER = { serpentGame: true };

/**
 * Bouton retour du téléphone (RG-74, HYP-45). Sur le menu principal, aucun niveau d'historique n'est ouvert :
 * le retour quitte le jeu comme toute application. Sur tout autre écran, un seul niveau est ouvert et son
 * gestionnaire dit ce que fait le retour : « ‹ Retour » vers le menu, ou la pause pendant une partie.
 */
export interface BackButton {
  /**
   * Définit ce que fait le retour sur l'écran affiché : ouvre le niveau d'historique s'il n'est pas ouvert,
   * sinon remplace le gestionnaire.
   */
  set(handler: () => void): void;
  /** Retour demandé par le jeu (« ‹ Retour », « Menu », Échap) : même chemin que le bouton du téléphone. */
  press(): void;
}

export function createBackButton(): BackButton {
  let handler: (() => void) | null = null;
  window.addEventListener('popstate', () => {
    // Le niveau est consommé par le navigateur avant que son gestionnaire soit appelé.
    const current = handler;
    handler = null;
    current?.();
  });
  return {
    set(next) {
      if (handler === null) history.pushState(MARKER, '');
      handler = next;
    },
    press() {
      if (handler !== null) history.back();
    },
  };
}

const PORTRAIT = '(orientation: portrait)';

/** Appelle `onPortrait` quand le téléphone passe à la verticale (RG-81). Renvoie la fonction qui arrête l'écoute. */
export function watchPortrait(onPortrait: () => void): () => void {
  const query = window.matchMedia(PORTRAIT);
  const listener = (event: MediaQueryListEvent): void => {
    if (event.matches) onPortrait();
  };
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}

/** Le jeu est au premier plan tant que la page est visible, affichée et qu'elle n'a pas perdu la saisie (RG-77). */
export interface Foreground {
  isActive(): boolean;
  /** Appelle `onLost` à chaque perte du premier plan et `onGained` à chaque retour. Renvoie la fonction qui arrête l'écoute. */
  watch(onLost: () => void, onGained: () => void): () => void;
}

export interface ForegroundEnv {
  window: EventTarget;
  document: EventTarget & { visibilityState: string };
}

/**
 * Suit les événements qui disent que le jeu n'est plus devant le joueur : page cachée (`visibilitychange`,
 * verrouillage, autre application), page quittée (`pagehide`), saisie perdue (`blur` : appel, volet de notifications).
 * Une page de nouveau visible est de nouveau au premier plan, même si `focus` n'est jamais arrivé.
 */
export function createForeground(env: ForegroundEnv = { window, document }): Foreground {
  let hidden = env.document.visibilityState === 'hidden';
  let left = false;
  let blurred = false;
  const watchers = new Set<{ onLost: () => void; onGained: () => void }>();
  const isActive = (): boolean => !hidden && !left && !blurred;
  let wasActive = isActive();

  const update = (): void => {
    const active = isActive();
    if (active === wasActive) return;
    wasActive = active;
    for (const watcher of [...watchers]) {
      if (active) watcher.onGained();
      else watcher.onLost();
    }
  };
  env.document.addEventListener('visibilitychange', () => {
    hidden = env.document.visibilityState === 'hidden';
    if (!hidden) {
      left = false;
      blurred = false;
    }
    update();
  });
  env.window.addEventListener('pagehide', () => {
    left = true;
    update();
  });
  env.window.addEventListener('pageshow', () => {
    left = false;
    update();
  });
  env.window.addEventListener('blur', () => {
    blurred = true;
    update();
  });
  env.window.addEventListener('focus', () => {
    blurred = false;
    update();
  });
  return {
    isActive,
    watch(onLost, onGained) {
      const watcher = { onLost, onGained };
      watchers.add(watcher);
      return () => {
        watchers.delete(watcher);
      };
    },
  };
}

export interface WakeLockProvider {
  request(type: 'screen'): Promise<WakeLockSentinel>;
}

/** Maintien de l'écran allumé pendant une partie en cours (RG-10). */
export interface WakeLock {
  /** Demande le verrou et le redemande à chaque retour au premier plan, tant que `release` n'est pas appelé. */
  hold(): void;
  release(): void;
}

/** Sans l'API (iPhone avant iOS 18.4), toutes les opérations sont sans effet : la mise en veille met la partie en pause. */
export function createWakeLock(
  foreground: Foreground,
  provider: WakeLockProvider | undefined,
): WakeLock {
  let wanted = false;
  let requesting = false;
  let sentinel: WakeLockSentinel | null = null;

  const acquire = async (): Promise<void> => {
    if (provider === undefined || !wanted || requesting || sentinel !== null) return;
    if (!foreground.isActive()) return;
    requesting = true;
    try {
      const granted = await provider.request('screen');
      if (wanted) {
        sentinel = granted;
        granted.addEventListener('release', () => {
          if (sentinel === granted) sentinel = null;
        });
      } else {
        await granted.release();
      }
    } catch {
      // Refus (batterie faible, page cachée) : le verrou est un confort, la partie continue sans lui.
    } finally {
      requesting = false;
    }
  };

  foreground.watch(
    () => undefined,
    () => void acquire(),
  );
  return {
    hold() {
      wanted = true;
      void acquire();
    },
    release() {
      wanted = false;
      const held = sentinel;
      sentinel = null;
      held?.release().catch(() => undefined);
    },
  };
}
