/**
 * Installation et hors ligne : enregistrement de l'agent de service, état « Prêt à jouer hors ligne » (RG-64),
 * mise à jour proposée puis installée sur consentement (EF-29), invite d'installation du navigateur (RG-92).
 * La page n'émet aucune requête et n'envoie aucun message à l'agent de service : le consentement est une entrée de
 * Cache Storage, la version proposée en est une autre, que l'agent écrit quand il refuse de s'installer seul.
 */
import { UPDATE_EVENT_WAIT_MS } from '../core/rules.ts';
import { VERSION, isNewerVersion, isVersion } from '../core/version.ts';

export interface InstallStatus {
  /** Mode hors ligne : en préparation, prêt, ou impossible (RG-64). */
  offline: 'preparing' | 'ready' | 'unavailable';
  /** Version plus récente proposée (RG-89), ou null. */
  offer: string | null;
  /** Mise à jour : au repos, en cours (RG-90) ou en échec (RG-91, E-06). */
  update: 'idle' | 'running' | 'failed';
  /** Le navigateur propose son invite d'installation (Android). */
  canPrompt: boolean;
  /** Le jeu vient d'être installé depuis le navigateur. */
  justInstalled: boolean;
}

export type Phone = 'android' | 'iphone';

export interface Installer {
  status(): InstallStatus;
  /** Appelle l'écouteur à chaque changement d'état. Renvoie la fonction qui arrête l'écoute. */
  subscribe(listener: (status: InstallStatus) => void): () => void;
  /** Toucher de « Installer » ou de « Réessayer » : le joueur accepte la version proposée. */
  update(): void;
  /** Ouvre l'invite d'installation du navigateur, s'il la propose. */
  promptInstall(): void;
  /** Vrai si le jeu s'exécute comme une application installée (et non dans un onglet du navigateur). */
  isInstalled(): boolean;
  phone(): Phone;
  /** Vrai une seule fois, après le rechargement qui suit une mise à jour réussie. */
  takeUpdated(): boolean;
}

const CONSENT_CACHE = 'serpent-cosmique-consent';
const OFFER_CACHE = 'serpent-cosmique-offer';
const UPDATED_KEY = 'serpent-cosmique-updated';

interface InstallPromptEvent extends Event {
  prompt(): Promise<unknown>;
}

function isInstallPrompt(event: Event): event is InstallPromptEvent {
  return 'prompt' in event && typeof event.prompt === 'function';
}

function entryUrl(): string {
  return new URL('./version', document.baseURI).href;
}

async function readEntry(cacheName: string): Promise<string | null> {
  try {
    const response = await caches.match(entryUrl(), { cacheName });
    return response === undefined ? null : await response.text();
  } catch {
    return null;
  }
}

async function writeEntry(cacheName: string, value: string): Promise<void> {
  await (await caches.open(cacheName)).put(entryUrl(), new Response(value));
}

/**
 * Attend le sort d'une mise à jour consentie : vrai si la nouvelle version est active, faux sinon. Le navigateur
 * termine sa vérification avant d'annoncer le nouvel agent : seule la vie de cet agent (installé, remplacé ou
 * abandonné), ou son absence après un délai, dit si la mise à jour a eu lieu.
 */
function runUpdate(registration: ServiceWorkerRegistration): Promise<boolean> {
  return new Promise((resolve) => {
    let found = false;
    registration.addEventListener(
      'updatefound',
      () => {
        found = true;
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'activated') resolve(true);
          if (worker.state === 'redundant') resolve(false);
        });
      },
      { once: true },
    );
    registration.update().then(
      () => {
        window.setTimeout(() => {
          if (!found) resolve(false);
        }, UPDATE_EVENT_WAIT_MS);
      },
      () => resolve(false),
    );
  });
}

export function createInstaller(): Installer {
  const supported = 'serviceWorker' in navigator && window.isSecureContext;
  let status: InstallStatus = {
    // Page servie par un agent actif : le mode hors ligne est prêt dès l'ouverture ; il ne se prépare qu'en l'absence
    // de tout agent actif (premier lancement).
    offline: !supported
      ? 'unavailable'
      : navigator.serviceWorker.controller === null
        ? 'preparing'
        : 'ready',
    offer: null,
    update: 'idle',
    canPrompt: false,
    justInstalled: false,
  };
  const listeners = new Set<(status: InstallStatus) => void>();
  let registration: ServiceWorkerRegistration | null = null;
  let prompt: InstallPromptEvent | null = null;
  // Version proposée, notée par un nouvel agent lors d'une ouverture connectée. Elle n'est présentée que téléphone
  // connecté et tant que la vérification de version de cette séance ne l'a pas contredite (RG-89, EF-29 CA-5).
  let known: string | null = null;
  let announced = false;

  const change = (patch: Partial<InstallStatus>): void => {
    // Faux positif : `known` est réaffectée après son initialisation à null.
    // nosemgrep: semgrep-rules.typescript.lang.correctness.useless-ternary
    status = { ...status, ...patch, offer: navigator.onLine ? known : null };
    for (const listener of listeners) listener(status);
  };

  const refreshOffline = (): void => {
    if (registration === null) return;
    const { active, installing, waiting } = registration;
    if (active?.state === 'activated') change({ offline: 'ready' });
    else if (active !== null || installing !== null || waiting !== null) {
      change({ offline: 'preparing' });
    } else change({ offline: 'unavailable' });
  };

  const readOffer = async (): Promise<void> => {
    const offer = await readEntry(OFFER_CACHE);
    if (offer !== null && isVersion(offer) && isNewerVersion(offer, VERSION)) {
      known = offer;
      change({});
    }
  };

  const watch = (current: ServiceWorkerRegistration): void => {
    current.addEventListener('updatefound', () => {
      announced = true;
      const worker = current.installing;
      worker?.addEventListener('statechange', () => {
        refreshOffline();
        // Un nouvel agent qui s'arrête sans s'installer a laissé la version proposée.
        if (worker.state === 'redundant') void readOffer();
      });
      refreshOffline();
    });
  };

  const start = async (): Promise<void> => {
    try {
      registration = await navigator.serviceWorker.register('sw.js', {
        scope: './',
        updateViaCache: 'none',
      });
    } catch {
      change({ offline: 'unavailable' });
      return;
    }
    watch(registration);
    refreshOffline();
    registration.installing?.addEventListener('statechange', refreshOffline);
    await readOffer();
    // Vérification de version à l'ouverture, téléphone connecté ; sans réseau, elle échoue en silence (CA-5).
    if (navigator.onLine && registration.active !== null && registration.installing === null) {
      const checked = await registration.update().then(
        () => true,
        () => false,
      );
      // Aucun nouvel agent annoncé : la version mémorisée n'est plus publiée, elle n'est plus proposée.
      await new Promise((resolve) => window.setTimeout(resolve, UPDATE_EVENT_WAIT_MS));
      if (checked && !announced && known !== null) {
        known = null;
        change({});
        await caches.delete(OFFER_CACHE).catch(() => false);
      }
    }
  };

  if (supported) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (status.update !== 'running') return;
      try {
        sessionStorage.setItem(UPDATED_KEY, '1');
      } catch {
        // Sans stockage de session, le message de fin de mise à jour n'est simplement pas affiché.
      }
      window.location.reload();
    });
    void start();
  }
  window.addEventListener('beforeinstallprompt', (event) => {
    if (!isInstallPrompt(event)) return;
    event.preventDefault();
    prompt = event;
    change({ canPrompt: true });
  });
  // Téléphone connecté ou non : la proposition apparaît ou disparaît aussitôt (CA-5).
  window.addEventListener('online', () => change({}));
  window.addEventListener('offline', () => change({}));
  window.addEventListener('appinstalled', () => {
    prompt = null;
    change({ canPrompt: false, justInstalled: true });
  });

  return {
    status: () => status,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update() {
      const target = status.offer;
      const current = registration;
      if (target === null || current === null || status.update === 'running') return;
      change({ update: 'running' });
      void (async () => {
        const installed = await writeEntry(CONSENT_CACHE, target).then(
          () => runUpdate(current),
          () => false,
        );
        if (installed) return;
        // Le consentement ne vaut que pour cette tentative : un échec n'autorise aucune installation ultérieure.
        await caches.delete(CONSENT_CACHE).catch(() => false);
        // Une version plus récente publiée entre-temps a refusé de s'installer : rien n'a échoué, elle est proposée.
        await readOffer();
        change({ update: known !== null && known !== target ? 'idle' : 'failed' });
      })();
    },
    promptInstall() {
      const event = prompt;
      if (event === null) return;
      prompt = null;
      change({ canPrompt: false });
      void event.prompt();
    },
    isInstalled() {
      const modes = ['standalone', 'fullscreen', 'minimal-ui'];
      if (modes.some((mode) => window.matchMedia(`(display-mode: ${mode})`).matches)) return true;
      return 'standalone' in navigator && navigator.standalone === true;
    },
    phone() {
      return /iPhone|iPad|iPod/.test(navigator.userAgent) ? 'iphone' : 'android';
    },
    takeUpdated() {
      try {
        const updated = sessionStorage.getItem(UPDATED_KEY) === '1';
        sessionStorage.removeItem(UPDATED_KEY);
        return updated;
      } catch {
        return false;
      }
    },
  };
}
