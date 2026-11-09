/** Vibrations (RG-63, RG-66, RG-67) : seulement si le téléphone sait vibrer, si le réglage est actif et au premier plan. */
import type { Settings } from '../core/types.ts';
import type { Foreground } from './lifecycle.ts';

export interface Haptics {
  /** Faux sur iPhone : le réglage des vibrations est alors grisé. */
  isAvailable(): boolean;
  vibrate(milliseconds: number): void;
}

export interface HapticsOptions {
  getSettings: () => Settings;
  foreground: Foreground;
  /** `navigator.vibrate` du téléphone, ou rien s'il n'existe pas. */
  vibrate: ((pattern: number) => boolean) | undefined;
}

export function createHaptics(options: HapticsOptions): Haptics {
  return {
    isAvailable() {
      return options.vibrate !== undefined;
    },
    vibrate(milliseconds) {
      if (options.vibrate === undefined) return;
      if (!options.getSettings().vibrations || !options.foreground.isActive()) return;
      try {
        options.vibrate(milliseconds);
      } catch {
        // Le navigateur peut refuser (aucun geste récent) : les vibrations ne sont qu'un confort.
      }
    },
  };
}
