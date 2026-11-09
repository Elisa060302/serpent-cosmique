/**
 * Progression du téléphone dans IndexedDB (03 § 4.3). Chaque modification s'écrit en une seule transaction
 * durable ; une transaction interrompue est annulée par le navigateur, donc la progression reste dans son état
 * d'avant ou d'après, jamais incomplète. Rien d'autre n'est stocké, rien n'est supprimé hors la partie en cours.
 */
import { formatLocalDateTime } from '../core/format.ts';
import { defaultProgress } from '../core/progress.ts';
import { STORAGE } from '../core/rules.ts';
import { readEnvelope, serializeEnvelope } from '../core/savefile.ts';
import type { PendingGame, ProgressData } from '../core/types.ts';
import { validatePendingGame } from '../core/validation.ts';

/** Ce que la lecture au démarrage a trouvé. */
export interface LoadedState {
  progress: ProgressData;
  /** Partie interrompue par la fermeture du jeu, à clôturer (RG-79). */
  pending: PendingGame | null;
  /** Vrai quand ni la progression ni sa dernière version lisible n'ont pu être lues (RG-84, E-05). */
  unreadable: boolean;
}

export interface ProgressStorage {
  /** Progression validée, ou sa dernière version lisible, ou les valeurs par défaut. */
  load(now: Date): Promise<LoadedState>;
  /**
   * Enregistre la progression, et supprime la partie en cours si `clearPending`. Renvoie faux si
   * l'écriture a échoué : la progression en mémoire reste valable et sera réécrite à la prochaine fois.
   */
  commit(progress: ProgressData, options?: { clearPending?: boolean }): Promise<boolean>;
  /** Enregistre l'état utile de la partie en cours. Renvoie faux si l'écriture a échoué. */
  savePending(pending: PendingGame): Promise<boolean>;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result));
    request.addEventListener('error', () => reject(request.error ?? new Error('IndexedDB')));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener('complete', () => resolve());
    transaction.addEventListener('abort', () =>
      reject(transaction.error ?? new Error('Transaction annulée')),
    );
    transaction.addEventListener('error', () =>
      reject(transaction.error ?? new Error('Transaction en erreur')),
    );
  });
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(STORAGE.database, STORAGE.version);
    request.addEventListener('upgradeneeded', () =>
      request.result.createObjectStore(STORAGE.store),
    );
    request.addEventListener('success', () => resolve(request.result));
    request.addEventListener('error', () => reject(request.error ?? new Error('IndexedDB')));
    request.addEventListener('blocked', () => reject(new Error('IndexedDB bloquée')));
  });
}

async function readKeys(database: IDBDatabase): Promise<Map<string, unknown>> {
  const store = database.transaction(STORAGE.store, 'readonly').objectStore(STORAGE.store);
  const keys = [STORAGE.progressKey, STORAGE.previousKey, STORAGE.pendingKey];
  const values = await Promise.all(keys.map((key) => requestResult(store.get(key))));
  return new Map(keys.map((key, index) => [key, values[index] as unknown]));
}

function createStorage(first: IDBDatabase): ProgressStorage {
  // Le navigateur peut fermer la connexion en cours de session (iPhone après un passage en arrière-plan,
  // effacement des données du site) : elle est alors rouverte au besoin, sans attendre un redémarrage.
  let database: IDBDatabase | null = null;
  const adopt = (opened: IDBDatabase): IDBDatabase => {
    database = opened;
    opened.addEventListener('close', () => {
      if (database === opened) database = null;
    });
    return opened;
  };
  adopt(first);
  /**
   * Exécute une tâche sur la connexion. Si elle est fermée, avant la tâche (`InvalidStateError`) ou pendant
   * (événement `close`, transaction annulée), la base est rouverte et la tâche réessayée une fois.
   */
  const withDatabase = async <T>(task: (connected: IDBDatabase) => Promise<T>): Promise<T> => {
    const connected = database ?? adopt(await openDatabase());
    try {
      return await task(connected);
    } catch (error) {
      const refused = error instanceof DOMException && error.name === 'InvalidStateError';
      if (!refused && database === connected) throw error;
      database = null;
      return task(adopt(await openDatabase()));
    }
  };
  // Texte de la dernière version lisible : il devient la version précédente à l'écriture suivante (RG-84).
  let lastReadable: string | null = null;
  // Les écritures se suivent une à une : `lastReadable` ne doit jamais être lu pendant qu'une autre s'achève.
  let queue: Promise<unknown> = Promise.resolve();
  const enqueue = <T>(task: () => Promise<T>): Promise<T> => {
    const result = queue.then(task);
    queue = result.catch(() => undefined);
    return result;
  };

  const write = (put: (store: IDBObjectStore) => void): Promise<void> =>
    withDatabase(async (connected) => {
      // Durabilité stricte quand le navigateur la propose : l'écriture est sur disque à `complete`.
      const transaction = connected.transaction(STORAGE.store, 'readwrite', {
        durability: 'strict',
      });
      put(transaction.objectStore(STORAGE.store));
      await transactionDone(transaction);
    });

  const storage: ProgressStorage = {
    async load(now) {
      let stored: Map<string, unknown>;
      try {
        stored = await withDatabase(readKeys);
      } catch {
        try {
          // Une erreur de lecture passagère ne doit pas faire passer une progression intacte pour illisible.
          stored = await withDatabase(readKeys);
        } catch {
          // Lecture impossible : comme une progression illisible, le jeu démarre avec les valeurs par défaut (RG-84).
          return { progress: defaultProgress(), pending: null, unreadable: true };
        }
      }
      const candidates = [stored.get(STORAGE.progressKey), stored.get(STORAGE.previousKey)];
      let progress: ProgressData | null = null;
      for (const candidate of candidates) {
        if (typeof candidate !== 'string') continue;
        const envelope = await readEnvelope(candidate, now, true);
        if (envelope !== null) {
          progress = envelope.data;
          lastReadable = candidate;
          break;
        }
      }
      const nothingStored = candidates.every((candidate) => candidate === undefined);
      const pendingText = stored.get(STORAGE.pendingKey);
      let pending: PendingGame | null = null;
      if (typeof pendingText === 'string') {
        try {
          pending = validatePendingGame(JSON.parse(pendingText), now, true);
        } catch {
          // Texte illisible : comme une valeur invalide, la partie en cours est ignorée.
          pending = null;
        }
      }
      return {
        progress: progress ?? defaultProgress(),
        pending,
        unreadable: progress === null && !nothingStored,
      };
    },

    commit(progress, options = {}) {
      return enqueue(async () => {
        try {
          const text = await serializeEnvelope(progress, formatLocalDateTime(new Date()));
          await write((store) => {
            store.put(text, STORAGE.progressKey);
            if (lastReadable !== null) store.put(lastReadable, STORAGE.previousKey);
            if (options.clearPending === true) store.delete(STORAGE.pendingKey);
          });
          lastReadable = text;
          return true;
        } catch {
          // Quota, base fermée, transaction annulée : l'état enregistré reste celui d'avant.
          return false;
        }
      });
    },

    savePending(pending) {
      return enqueue(async () => {
        try {
          await write((store) => {
            store.put(JSON.stringify(pending), STORAGE.pendingKey);
          });
          return true;
        } catch {
          return false;
        }
      });
    },
  };
  return storage;
}

/**
 * Ouvre la base. Si elle ne peut pas être ouverte (navigation privée, stockage refusé), le jeu reste
 * jouable avec une progression en mémoire seulement : chaque lecture signale alors E-05 et chaque écriture échoue.
 */
export async function openStorage(): Promise<ProgressStorage> {
  try {
    return createStorage(await openDatabase());
  } catch {
    return {
      load: () => Promise.resolve({ progress: defaultProgress(), pending: null, unreadable: true }),
      commit: () => Promise.resolve(false),
      savePending: () => Promise.resolve(false),
    };
  }
}

/** Demande le stockage persistant à chaque lancement tant qu'il n'est pas accordé (EXS-14). */
export async function requestPersistence(): Promise<void> {
  const manager = navigator.storage as StorageManager | undefined;
  if (manager === undefined) return;
  try {
    if (!(await manager.persisted())) await manager.persist();
  } catch {
    // La persistance est un confort : son refus n'empêche ni de jouer ni d'enregistrer.
  }
}
