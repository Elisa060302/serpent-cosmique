/**
 * Sondes de recette : elles remplacent le contexte audio, la vibration et le verrou d'écran du navigateur par
 * des doublures qui notent ce que le jeu leur demande (script d'initialisation, avant le chargement du jeu).
 */
import type { Page } from '@playwright/test';
import { AUDIO } from '../../../src/core/rules.ts';

export interface AudioReport {
  /** Contextes audio créés par le jeu. */
  contexts: number;
  /** Fréquences des notes de bruitage, dans l'ordre où elles ont été programmées. */
  effects: number[];
  /** Nombre de notes de musique programmées. */
  musicNotes: number;
  /** Bus de musique débranchés (musique arrêtée). */
  musicStops: number;
  /** Appels à `resume` et `suspend`, dans l'ordre. */
  calls: string[];
}

export async function installAudioProbe(page: Page): Promise<void> {
  await page.addInitScript(
    (waves) => {
      const report = { contexts: 0, effects: [], musicNotes: 0, musicStops: 0, calls: [] } as {
        contexts: number;
        effects: number[];
        musicNotes: number;
        musicStops: number;
        calls: string[];
      };
      (window as unknown as { __audio: typeof report }).__audio = report;
      const start = Date.now();
      class ProbeContext {
        currentTime = 0;
        destination = {};
        constructor() {
          report.contexts += 1;
          Object.defineProperty(this, 'currentTime', {
            get: () => (Date.now() - start) / 1000,
          });
        }
        createOscillator() {
          const note = { type: '', frequency: { value: 0 } };
          return {
            set type(value: string) {
              note.type = value;
            },
            frequency: note.frequency,
            connect() {},
            start() {
              if (note.type === waves.music) report.musicNotes += 1;
              else report.effects.push(note.frequency.value);
            },
            stop() {},
          };
        }
        createGain() {
          const gain = {
            value: 1,
            setValueAtTime() {},
            linearRampToValueAtTime() {},
          };
          return {
            gain,
            connect() {},
            disconnect() {
              report.musicStops += 1;
            },
          };
        }
        resume() {
          report.calls.push('resume');
          return Promise.resolve();
        }
        suspend() {
          report.calls.push('suspend');
          return Promise.resolve();
        }
      }
      (window as unknown as { AudioContext: typeof ProbeContext }).AudioContext = ProbeContext;
    },
    { music: AUDIO.musicWave, effects: AUDIO.sfxWave },
  );
}

export async function audioReport(page: Page): Promise<AudioReport> {
  return page.evaluate(() =>
    structuredClone((window as unknown as { __audio: AudioReport }).__audio),
  );
}

/** Vibrations demandées, ou téléphone qui ne sait pas vibrer (`present` faux : iPhone). */
export async function installVibrationProbe(page: Page, present = true): Promise<void> {
  await page.addInitScript((available) => {
    const calls: number[] = [];
    (window as unknown as { __vibrations: number[] }).__vibrations = calls;
    if (available) {
      Object.defineProperty(navigator, 'vibrate', {
        configurable: true,
        value: (pattern: number) => {
          calls.push(pattern);
          return true;
        },
      });
    } else {
      delete (Navigator.prototype as { vibrate?: unknown }).vibrate;
    }
  }, present);
}

export async function vibrations(page: Page): Promise<number[]> {
  return page.evaluate(() => [...(window as unknown as { __vibrations: number[] }).__vibrations]);
}

export interface WakeLockReport {
  requests: number;
  /** Verrous encore tenus. */
  held: number;
}

/** Verrou d'écran simulé, ou API absente (`present` faux : iPhone avant iOS 18.4). */
export async function installWakeLockProbe(page: Page, present = true): Promise<void> {
  await page.addInitScript((available) => {
    const report = { requests: 0, held: 0 };
    (window as unknown as { __wakeLock: typeof report }).__wakeLock = report;
    if (!available) {
      delete (Navigator.prototype as { wakeLock?: unknown }).wakeLock;
      return;
    }
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: {
        request: () => {
          report.requests += 1;
          report.held += 1;
          const sentinel = new EventTarget() as EventTarget & { release(): Promise<void> };
          let released = false;
          sentinel.release = () => {
            if (!released) {
              released = true;
              report.held -= 1;
              sentinel.dispatchEvent(new Event('release'));
            }
            return Promise.resolve();
          };
          return Promise.resolve(sentinel);
        },
      },
    });
  }, present);
}

export async function wakeLockReport(page: Page): Promise<WakeLockReport> {
  return page.evaluate(() => ({
    ...(window as unknown as { __wakeLock: WakeLockReport }).__wakeLock,
  }));
}

/** Simule la perte du premier plan (verrouillage de l'écran, autre application) ou son retour. */
export async function setVisibility(page: Page, visible: boolean): Promise<void> {
  await page.evaluate((isVisible) => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => (isVisible ? 'visible' : 'hidden'),
    });
    document.dispatchEvent(new Event('visibilitychange'));
  }, visible);
}

/** Événement de fenêtre : `blur` (appel, volet de notifications), `pagehide`, `focus`, `pageshow`. */
export async function fireWindowEvent(
  page: Page,
  name: 'blur' | 'focus' | 'pagehide' | 'pageshow',
): Promise<void> {
  await page.evaluate((eventName) => window.dispatchEvent(new Event(eventName)), name);
}
