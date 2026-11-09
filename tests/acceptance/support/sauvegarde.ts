/**
 * Fabrique d'états de départ : construit des progressions fictives au format de la progression locale
 * (enveloppe, forme canonique, somme SHA-256) et les écrit dans IndexedDB, avant le lancement du jeu.
 * Elle utilise les modules du projet comme référence et n'ajoute aucun code au jeu.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, test, webkit } from '@playwright/test';
import type { BrowserContext, Page } from '@playwright/test';
import { defaultProgress } from '../../../src/core/progress.ts';
import { STORAGE } from '../../../src/core/rules.ts';
import { serializeEnvelope } from '../../../src/core/savefile.ts';
import type { PendingGame, ProgressData } from '../../../src/core/types.ts';

/** Date de création des enveloppes fictives : antérieure à toutes les horloges simulées des tests. */
export const SEED_CREATED_AT = '2026-10-30T09:00:00';
/** Date des records fictifs. */
export const SEED_DATE = '2026-10-31T18:00:00';

export function progressWith(change: (progress: ProgressData) => void): ProgressData {
  const progress = defaultProgress();
  change(progress);
  return progress;
}

export interface Stored {
  progress?: string;
  progressPrevious?: string;
  pendingGame?: string;
}

/** État de départ : une progression (ou son texte brut, éventuellement abîmé), sa version précédente, une partie en cours. */
export interface Seed {
  progress?: ProgressData | string;
  previous?: ProgressData | string;
  pending?: PendingGame | string;
}

async function asText(value: ProgressData | string): Promise<string> {
  return typeof value === 'string' ? value : serializeEnvelope(value, SEED_CREATED_AT);
}

/** Écrit (ou supprime, si la valeur est null) des clés dans la base du jeu, déjà ouverte par la page. */
async function writeKeys(page: Page, entries: Record<string, string | null>): Promise<void> {
  await page.evaluate(
    async ({ database, store, values }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(database, 1);
        request.onupgradeneeded = () => request.result.createObjectStore(store);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('IndexedDB'));
      });
      const transaction = db.transaction(store, 'readwrite');
      for (const [key, value] of Object.entries(values)) {
        if (value === null) transaction.objectStore(store).delete(key);
        else transaction.objectStore(store).put(value, key);
      }
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB'));
      });
      db.close();
    },
    { database: STORAGE.database, store: STORAGE.store, values: entries },
  );
}

/**
 * Place l'état de départ dans le stockage de l'origine. La page est d'abord ouverte sans horloge simulée ;
 * le test relance ensuite le jeu (`openGame`), qui lit cet état.
 */
export async function seedStorage(page: Page, seed: Seed): Promise<void> {
  await page.goto('/');
  const entries: Record<string, string | null> = {};
  if (seed.progress !== undefined) entries[STORAGE.progressKey] = await asText(seed.progress);
  if (seed.previous !== undefined) entries[STORAGE.previousKey] = await asText(seed.previous);
  if (seed.pending !== undefined) {
    entries[STORAGE.pendingKey] =
      typeof seed.pending === 'string' ? seed.pending : JSON.stringify(seed.pending);
  }
  await writeKeys(page, entries);
}

/** Valeurs brutes enregistrées dans IndexedDB. */
export async function readStorage(page: Page): Promise<Stored> {
  return page.evaluate(
    async ({ database, store, keys }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(database, 1);
        request.onupgradeneeded = () => request.result.createObjectStore(store);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('IndexedDB'));
      });
      const objectStore = db.transaction(store, 'readonly').objectStore(store);
      const result: Record<string, string> = {};
      for (const key of keys) {
        const value = await new Promise<unknown>((resolve, reject) => {
          const request = objectStore.get(key);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error ?? new Error('IndexedDB'));
        });
        if (typeof value === 'string') result[key] = value;
      }
      db.close();
      return result;
    },
    {
      database: STORAGE.database,
      store: STORAGE.store,
      keys: [STORAGE.progressKey, STORAGE.previousKey, STORAGE.pendingKey],
    },
  );
}

/** Données de la progression enregistrée (enveloppe lue sans contrôle), ou null si rien n'est enregistré. */
export async function readProgress(page: Page): Promise<ProgressData | null> {
  const { progress } = await readStorage(page);
  if (progress === undefined) return null;
  return (JSON.parse(progress) as { data: ProgressData }).data;
}

/**
 * Ouvre un profil de navigateur persistant : fermer son contexte sans passer par le jeu simule la fermeture
 * forcée du jeu par le téléphone (aucune page n'a le temps de réagir). Mêmes réglages d'appareil que le projet.
 */
export async function launchProfile(directory: string, baseURL?: string): Promise<BrowserContext> {
  const use = test.info().project.use;
  const type = use.browserName === 'webkit' ? webkit : chromium;
  return type.launchPersistentContext(directory, {
    baseURL: baseURL ?? use.baseURL,
    viewport: use.viewport,
    deviceScaleFactor: use.deviceScaleFactor,
    hasTouch: use.hasTouch,
    isMobile: use.isMobile,
    locale: use.locale,
    timezoneId: use.timezoneId,
  });
}

const profileDirectories: string[] = [];

/** Répertoire temporaire pour un profil de navigateur (chemin ASCII : IndexedDB refuse certains chemins). */
export function newProfileDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), 'serpent-profil-'));
  profileDirectories.push(directory);
  return directory;
}

/** À appeler après chaque test : supprime les profils créés par `newProfileDirectory`. */
export function removeProfileDirectories(): void {
  for (const directory of profileDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
}
