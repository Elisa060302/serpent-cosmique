import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { createAudio } from '../../src/platform/audio.ts';
import { createHaptics } from '../../src/platform/haptics.ts';
import { createForeground, createWakeLock } from '../../src/platform/lifecycle.ts';
import type { Foreground } from '../../src/platform/lifecycle.ts';
import { AUDIO, DEFAULT_SETTINGS, SOUND_EVENTS, VIBRATION_MS } from '../../src/core/rules.ts';
import type { Settings } from '../../src/core/types.ts';

/** Fenêtre et document simulés : un seul objet d'événements chacun, et l'état de visibilité modifiable. */
function fakePage() {
  const window = new EventTarget();
  const document = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  return {
    window,
    document,
    hide(): void {
      document.visibilityState = 'hidden';
      document.dispatchEvent(new Event('visibilitychange'));
    },
    show(): void {
      document.visibilityState = 'visible';
      document.dispatchEvent(new Event('visibilitychange'));
    },
  };
}

function settings(change: Partial<Settings> = {}): Settings {
  return { ...DEFAULT_SETTINGS, ...change };
}

describe('ct_61_pause_automatique : suivi du premier plan (RG-77)', () => {
  it('chaque événement de perte est signalé une fois, et le retour une fois', () => {
    const page = fakePage();
    const foreground = createForeground(page);
    const log: string[] = [];
    foreground.watch(
      () => log.push('perdu'),
      () => log.push('revenu'),
    );
    assert.equal(foreground.isActive(), true);
    page.hide();
    page.window.dispatchEvent(new Event('pagehide'));
    page.window.dispatchEvent(new Event('blur'));
    assert.deepEqual(log, ['perdu']);
    assert.equal(foreground.isActive(), false);
    page.show();
    assert.deepEqual(log, ['perdu', 'revenu']);
    assert.equal(foreground.isActive(), true);
  });

  it('un appel ou le volet de notifications (blur) fait perdre le premier plan, focus le rend', () => {
    const page = fakePage();
    const foreground = createForeground(page);
    const log: string[] = [];
    foreground.watch(
      () => log.push('perdu'),
      () => log.push('revenu'),
    );
    page.window.dispatchEvent(new Event('blur'));
    assert.equal(foreground.isActive(), false);
    page.window.dispatchEvent(new Event('focus'));
    assert.deepEqual(log, ['perdu', 'revenu']);
  });

  it('pagehide puis pageshow', () => {
    const page = fakePage();
    const foreground = createForeground(page);
    page.window.dispatchEvent(new Event('pagehide'));
    assert.equal(foreground.isActive(), false);
    page.window.dispatchEvent(new Event('pageshow'));
    assert.equal(foreground.isActive(), true);
  });

  it('une page de nouveau visible est au premier plan même si focus n’est jamais arrivé', () => {
    const page = fakePage();
    const foreground = createForeground(page);
    page.hide();
    page.window.dispatchEvent(new Event('blur'));
    page.show();
    assert.equal(foreground.isActive(), true);
  });

  it('une page déjà cachée au chargement n’est pas au premier plan', () => {
    const page = fakePage();
    page.document.visibilityState = 'hidden';
    assert.equal(createForeground(page).isActive(), false);
  });

  it('l’écoute arrêtée ne reçoit plus rien', () => {
    const page = fakePage();
    const foreground = createForeground(page);
    let lost = 0;
    const stop = foreground.watch(
      () => (lost += 1),
      () => undefined,
    );
    stop();
    page.hide();
    assert.equal(lost, 0);
  });
});

/** Premier plan commandé à la main. */
function manualForeground(): Foreground & { lose(): void; gain(): void } {
  const watchers: { onLost: () => void; onGained: () => void }[] = [];
  let active = true;
  return {
    isActive: () => active,
    watch(onLost, onGained) {
      watchers.push({ onLost, onGained });
      return () => undefined;
    },
    lose() {
      active = false;
      for (const watcher of watchers) watcher.onLost();
    },
    gain() {
      active = true;
      for (const watcher of watchers) watcher.onGained();
    },
  };
}

class FakeSentinel extends EventTarget {
  released = false;
  release(): Promise<void> {
    this.released = true;
    this.dispatchEvent(new Event('release'));
    return Promise.resolve();
  }
}

function fakeWakeLock(failures = 0) {
  const sentinels: FakeSentinel[] = [];
  let remaining = failures;
  return {
    sentinels,
    request(): Promise<WakeLockSentinel> {
      if (remaining > 0) {
        remaining -= 1;
        return Promise.reject(new DOMException('refus', 'NotAllowedError'));
      }
      const sentinel = new FakeSentinel();
      sentinels.push(sentinel);
      return Promise.resolve(sentinel as unknown as WakeLockSentinel);
    },
    active: () => sentinels.filter((sentinel) => !sentinel.released).length,
  };
}

const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

describe('ct_09_ecran_allume : verrou d’écran (RG-10)', () => {
  it('demandé au début, relâché en pause, redemandé à la reprise', async () => {
    const provider = fakeWakeLock();
    const lock = createWakeLock(manualForeground(), provider);
    lock.hold();
    await settle();
    assert.equal(provider.active(), 1);
    lock.release();
    await settle();
    assert.equal(provider.active(), 0);
    lock.hold();
    await settle();
    assert.equal(provider.sentinels.length, 2);
    assert.equal(provider.active(), 1);
  });

  it('une seule demande tant que le verrou est tenu', async () => {
    const provider = fakeWakeLock();
    const lock = createWakeLock(manualForeground(), provider);
    lock.hold();
    lock.hold();
    await settle();
    lock.hold();
    await settle();
    assert.equal(provider.sentinels.length, 1);
  });

  it('relâché par le navigateur hors du premier plan, redemandé au retour', async () => {
    const provider = fakeWakeLock();
    const foreground = manualForeground();
    const lock = createWakeLock(foreground, provider);
    lock.hold();
    await settle();
    foreground.lose();
    await provider.sentinels[0]?.release();
    foreground.gain();
    await settle();
    assert.equal(provider.sentinels.length, 2);
    assert.equal(provider.active(), 1);
  });

  it('rien n’est demandé hors du premier plan, ni quand le verrou n’est plus voulu', async () => {
    const provider = fakeWakeLock();
    const foreground = manualForeground();
    const lock = createWakeLock(foreground, provider);
    foreground.lose();
    lock.hold();
    await settle();
    assert.equal(provider.sentinels.length, 0);
    lock.release();
    foreground.gain();
    await settle();
    assert.equal(provider.sentinels.length, 0);
  });

  it('un verrou accordé après le relâchement est aussitôt rendu', async () => {
    const provider = fakeWakeLock();
    const lock = createWakeLock(manualForeground(), provider);
    lock.hold();
    lock.release();
    await settle();
    assert.equal(provider.active(), 0);
  });

  it('un refus du navigateur ne produit aucune erreur et la demande suivante réussit', async () => {
    const provider = fakeWakeLock(1);
    const lock = createWakeLock(manualForeground(), provider);
    lock.hold();
    await settle();
    assert.equal(provider.active(), 0);
    lock.hold();
    await settle();
    assert.equal(provider.active(), 1);
  });

  it('sans l’API, aucune erreur', async () => {
    const lock = createWakeLock(manualForeground(), undefined);
    lock.hold();
    lock.release();
    await settle();
  });
});

interface FakeNode {
  kind: 'oscillator' | 'gain';
  type?: string;
  hz?: number;
  started?: number;
  stopped?: number;
  disconnected?: boolean;
  gain?: { value: number };
}

function fakeContext() {
  const nodes: FakeNode[] = [];
  const log: string[] = [];
  const context = {
    currentTime: 10,
    destination: { kind: 'destination' },
    createOscillator() {
      const node: FakeNode = { kind: 'oscillator' };
      nodes.push(node);
      return {
        set type(value: string) {
          node.type = value;
        },
        frequency: {
          set value(hz: number) {
            node.hz = hz;
          },
        },
        connect() {},
        start(at: number) {
          node.started = at;
        },
        stop(at: number) {
          node.stopped = at;
        },
      };
    },
    createGain() {
      const node: FakeNode = { kind: 'gain', gain: { value: 1 } };
      nodes.push(node);
      return {
        gain: {
          set value(value: number) {
            if (node.gain) node.gain.value = value;
          },
          setValueAtTime() {},
          linearRampToValueAtTime() {},
        },
        connect() {},
        disconnect() {
          node.disconnected = true;
        },
      };
    },
    resume() {
      log.push('resume');
      return Promise.resolve();
    },
    suspend() {
      log.push('suspend');
      return Promise.resolve();
    },
  };
  return { context: context as unknown as AudioContext, nodes, log };
}

function audioWith(initial: Settings, foreground: Foreground = manualForeground()) {
  const fake = fakeContext();
  let current = initial;
  const audio = createAudio({
    getSettings: () => current,
    foreground,
    createContext: () => fake.context,
  });
  return {
    audio,
    ...fake,
    change(next: Partial<Settings>) {
      current = settings({ ...current, ...next });
      audio.refresh();
    },
    oscillators: (wave: string) =>
      fake.nodes.filter((node) => node.kind === 'oscillator' && node.type === wave),
  };
}

let pending: { callback: () => void; milliseconds: number }[] = [];

describe('ct_48_sons_et_vibrations : bruitages et musique suivent leur réglage (RG-66, RG-67)', () => {
  // La musique programme son tour suivant par un minuteur : il est simulé pour ne pas attendre ni laisser tourner.
  const realSetTimeout = globalThis.setTimeout;
  const realClearTimeout = globalThis.clearTimeout;
  beforeEach(() => {
    pending = [];
    globalThis.setTimeout = ((callback: () => void, milliseconds: number) => {
      pending.push({ callback, milliseconds });
      return pending.length;
    }) as unknown as typeof setTimeout;
    globalThis.clearTimeout = ((handle: number) => {
      pending[handle - 1] = { callback: () => undefined, milliseconds: 0 };
    }) as unknown as typeof clearTimeout;
  });
  afterEach(() => {
    globalThis.setTimeout = realSetTimeout;
    globalThis.clearTimeout = realClearTimeout;
  });

  it('EF-22 CA-1 : musique coupée, un bonbon mangé fait sonner son bruitage et aucune note de musique', () => {
    const run = audioWith(settings({ music: false }));
    run.audio.unlock();
    run.audio.play('candy');
    assert.deepEqual(
      run.oscillators(AUDIO.sfxWave).map((node) => node.hz),
      AUDIO.sfx.candy.map((note) => note.hz),
    );
    assert.equal(run.oscillators(AUDIO.musicWave).length, 0);
  });

  it('chacun des six événements joue ses notes', () => {
    for (const event of SOUND_EVENTS) {
      const run = audioWith(settings({ music: false }));
      run.audio.unlock();
      run.audio.play(event);
      assert.deepEqual(
        run.oscillators(AUDIO.sfxWave).map((node) => node.hz),
        AUDIO.sfx[event].map((note) => note.hz),
        event,
      );
    }
  });

  it('un bruitage différé commence après le délai', () => {
    const run = audioWith(settings({ music: false }));
    run.audio.unlock();
    run.audio.play('unlock', 0.5);
    assert.equal(run.oscillators(AUDIO.sfxWave)[0]?.started, 10.5);
  });

  it('bruitages coupés : aucune note, la musique joue encore', () => {
    const run = audioWith(settings({ sounds: false }));
    run.audio.unlock();
    run.audio.play('candy');
    assert.equal(run.oscillators(AUDIO.sfxWave).length, 0);
    assert.equal(run.oscillators(AUDIO.musicWave).length, AUDIO.music.notes.length);
  });

  it('avant le premier geste du joueur, rien ne sonne et aucun contexte n’est créé', () => {
    const run = audioWith(settings());
    run.audio.play('candy');
    run.audio.refresh();
    assert.equal(run.nodes.length, 0);
  });

  it('la musique démarre au geste, s’arrête dès qu’elle est coupée et repart quand elle est réactivée', () => {
    const run = audioWith(settings());
    run.audio.unlock();
    const bus = run.nodes.find(
      (node) => node.kind === 'gain' && node.gain?.value === AUDIO.musicVolume,
    );
    assert.ok(bus);
    assert.equal(bus.disconnected, undefined);
    run.change({ music: false });
    assert.equal(bus.disconnected, true);
    const before = run.oscillators(AUDIO.musicWave).length;
    run.change({ music: true });
    assert.equal(run.oscillators(AUDIO.musicWave).length, before + AUDIO.music.notes.length);
  });

  it('la musique est en boucle : le tour suivant est programmé avant la fin du cycle', () => {
    const run = audioWith(settings());
    run.audio.unlock();
    assert.equal(run.oscillators(AUDIO.musicWave).length, AUDIO.music.notes.length);
    const next = pending.at(-1);
    assert.equal(next?.milliseconds, (AUDIO.music.cycleSeconds - AUDIO.music.leadSeconds) * 1000);
    next?.callback();
    assert.equal(run.oscillators(AUDIO.musicWave).length, 2 * AUDIO.music.notes.length);
    const starts = run.oscillators(AUDIO.musicWave).map((node) => node.started ?? 0);
    assert.ok(Math.min(...starts.slice(AUDIO.music.notes.length)) >= 10 + AUDIO.music.cycleSeconds);
  });

  it('EF-22 CA-3 : hors du premier plan la musique s’arrête et le contexte dort ; elle ne reprend qu’au retour', () => {
    const foreground = manualForeground();
    const run = audioWith(settings(), foreground);
    run.audio.unlock();
    const count = run.oscillators(AUDIO.musicWave).length;
    foreground.lose();
    assert.equal(run.log.at(-1), 'suspend');
    run.audio.play('candy');
    assert.equal(run.oscillators(AUDIO.sfxWave).length, 0);
    foreground.gain();
    assert.equal(run.log.at(-1), 'resume');
    assert.equal(run.oscillators(AUDIO.musicWave).length, count + AUDIO.music.notes.length);
  });

  it('en pause la musique est arrêtée, à la reprise elle repart ; un bruitage reste possible', () => {
    const run = audioWith(settings());
    run.audio.unlock();
    const count = run.oscillators(AUDIO.musicWave).length;
    run.audio.setMusicPaused(true);
    run.audio.play('candy');
    assert.equal(run.oscillators(AUDIO.musicWave).length, count);
    assert.ok(run.oscillators(AUDIO.sfxWave).length > 0);
    run.audio.setMusicPaused(false);
    assert.equal(run.oscillators(AUDIO.musicWave).length, count + AUDIO.music.notes.length);
  });

  it('un geste pendant que le jeu n’est pas au premier plan ne crée rien', () => {
    const foreground = manualForeground();
    const run = audioWith(settings(), foreground);
    foreground.lose();
    run.audio.unlock();
    assert.equal(run.nodes.length, 0);
  });

  it('sans Web Audio, aucune erreur', () => {
    const audio = createAudio({
      getSettings: () => settings(),
      foreground: manualForeground(),
      createContext: () => {
        throw new Error('indisponible');
      },
    });
    audio.unlock();
    audio.play('candy');
    audio.refresh();
  });
});

describe('ct_48_sons_et_vibrations : vibrations (RG-63, RG-66, RG-67)', () => {
  it('EF-22 CA-2 : vibre 300 ms à une collision avec le réglage actif, jamais réglage coupé', () => {
    const calls: number[] = [];
    let current = settings();
    const haptics = createHaptics({
      getSettings: () => current,
      foreground: manualForeground(),
      vibrate: (pattern) => {
        calls.push(pattern);
        return true;
      },
    });
    haptics.vibrate(VIBRATION_MS.collision);
    current = settings({ vibrations: false });
    haptics.vibrate(VIBRATION_MS.collision);
    assert.deepEqual(calls, [300]);
  });

  it('aucune vibration hors du premier plan', () => {
    const calls: number[] = [];
    const foreground = manualForeground();
    const haptics = createHaptics({
      getSettings: () => settings(),
      foreground,
      vibrate: (pattern) => calls.push(pattern) > 0,
    });
    foreground.lose();
    haptics.vibrate(80);
    assert.deepEqual(calls, []);
  });

  it('EF-21 CA-3 : sans vibration sur le téléphone, indisponible et aucune erreur', () => {
    const haptics = createHaptics({
      getSettings: () => settings(),
      foreground: manualForeground(),
      vibrate: undefined,
    });
    assert.equal(haptics.isAvailable(), false);
    haptics.vibrate(300);
  });

  it('un refus du navigateur ne produit aucune erreur', () => {
    const haptics = createHaptics({
      getSettings: () => settings(),
      foreground: manualForeground(),
      vibrate: () => {
        throw new DOMException('refus', 'NotAllowedError');
      },
    });
    assert.equal(haptics.isAvailable(), true);
    haptics.vibrate(300);
  });
});
