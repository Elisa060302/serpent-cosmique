/**
 * Bruitages et musique synthétisés par Web Audio (03 § 7) : aucun fichier sonore, aucune permission.
 * Chaque catégorie ne dépend que de son réglage (RG-67) et rien ne sonne hors du premier plan.
 */
import { AUDIO } from '../core/rules.ts';
import type { Note, SoundEvent } from '../core/rules.ts';
import type { Settings } from '../core/types.ts';
import type { Foreground } from './lifecycle.ts';

export interface Audio {
  /**
   * À appeler à chaque geste du joueur : le navigateur n'autorise le son qu'après un geste, donc le
   * contexte audio est créé (puis réveillé s'il dort) à ce moment-là.
   */
  unlock(): void;
  /** Joue le bruitage de l'événement, après `delaySeconds` ; sans effet si les bruitages sont coupés. */
  play(event: SoundEvent, delaySeconds?: number): void;
  /** À appeler après un changement de réglage : démarre ou arrête la musique aussitôt. */
  refresh(): void;
  /** La musique s'arrête pendant la pause (RG-75) et repart à la reprise. */
  setMusicPaused(paused: boolean): void;
}

export interface AudioOptions {
  getSettings: () => Settings;
  foreground: Foreground;
  createContext: () => AudioContext;
}

export function createAudio(options: AudioOptions): Audio {
  let context: AudioContext | null = null;
  let musicBus: GainNode | null = null;
  let musicTimer: ReturnType<typeof setTimeout> | undefined;
  let nextCycleAt = 0;
  let paused = false;

  /** Programme les notes `notes` à partir de `start` (secondes du contexte) sur la sortie `output`. */
  const schedule = (
    ctx: AudioContext,
    output: AudioNode,
    notes: readonly Note[],
    wave: OscillatorType,
    volume: number,
    start: number,
  ): void => {
    for (const note of notes) {
      const oscillator = ctx.createOscillator();
      const envelope = ctx.createGain();
      const begin = start + note.at;
      const end = begin + note.seconds;
      oscillator.type = wave;
      oscillator.frequency.value = note.hz;
      envelope.gain.setValueAtTime(0, begin);
      envelope.gain.linearRampToValueAtTime(volume, begin + AUDIO.fadeSeconds);
      envelope.gain.linearRampToValueAtTime(0, end);
      oscillator.connect(envelope);
      envelope.connect(output);
      oscillator.start(begin);
      oscillator.stop(end);
    }
  };

  const scheduleCycle = (): void => {
    if (context === null || musicBus === null) return;
    const start = Math.max(context.currentTime, nextCycleAt);
    schedule(context, musicBus, AUDIO.music.notes, AUDIO.musicWave, 1, start);
    nextCycleAt = start + AUDIO.music.cycleSeconds;
    const waitMs = (nextCycleAt - context.currentTime - AUDIO.music.leadSeconds) * 1000;
    musicTimer = setTimeout(scheduleCycle, Math.max(waitMs, 0));
  };

  const startMusic = (): void => {
    if (context === null || musicBus !== null) return;
    musicBus = context.createGain();
    musicBus.gain.value = AUDIO.musicVolume;
    musicBus.connect(context.destination);
    nextCycleAt = 0;
    scheduleCycle();
  };

  const stopMusic = (): void => {
    clearTimeout(musicTimer);
    // Débrancher le bus fait taire aussitôt les notes déjà programmées.
    musicBus?.disconnect();
    musicBus = null;
  };

  const refresh = (): void => {
    const wanted = options.foreground.isActive() && !paused && options.getSettings().music;
    if (context !== null && wanted) startMusic();
    else stopMusic();
  };

  const wake = (): void => {
    void context?.resume().catch(() => undefined);
  };

  options.foreground.watch(
    () => {
      stopMusic();
      void context?.suspend().catch(() => undefined);
    },
    () => {
      wake();
      refresh();
    },
  );

  return {
    unlock() {
      if (!options.foreground.isActive()) return;
      try {
        context ??= options.createContext();
      } catch {
        // Pas de Web Audio : le jeu reste jouable en silence.
        return;
      }
      wake();
      refresh();
    },
    play(event, delaySeconds = 0) {
      if (context === null || !options.foreground.isActive() || !options.getSettings().sounds) {
        return;
      }
      schedule(
        context,
        context.destination,
        AUDIO.sfx[event],
        AUDIO.sfxWave,
        AUDIO.sfxVolume,
        context.currentTime + delaySeconds,
      );
    },
    refresh,
    setMusicPaused(value) {
      paused = value;
      refresh();
    },
  };
}
