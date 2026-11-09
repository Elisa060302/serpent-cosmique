/**
 * Fusion de la progression du téléphone avec celle d'un fichier de sauvegarde (RG-70, EXS-05). Les deux
 * progressions sont déjà validées ; le résultat est une structure neuve construite champ par champ,
 * sans jamais recopier l'objet reçu. Les skins débloqués sont réunis, jamais retirés.
 */
import { LIMITS, MODE_IDS } from './rules.ts';
import type { ModeId } from './rules.ts';
import { evaluateUnlocks, inCatalogueOrder } from './skins.ts';
import type { ProgressData, RecordEntry } from './types.ts';

/** Score décroissant ; à score égal, le plus ancien d'abord (RG-47) ; puis le nom, pour un ordre unique. */
function compareRecords(first: RecordEntry, second: RecordEntry): number {
  if (first.score !== second.score) return second.score - first.score;
  if (first.dateTime !== second.dateTime) return first.dateTime < second.dateTime ? -1 : 1;
  if (first.name !== second.name) return first.name < second.name ? -1 : 1;
  return 0;
}

/** Réunion de deux tableaux : un record identique (nom, score, date et heure) compte une fois ; les 10 meilleurs restent. */
function mergeTables(
  local: readonly RecordEntry[],
  incoming: readonly RecordEntry[],
): RecordEntry[] {
  const seen = new Set<string>();
  const union: RecordEntry[] = [];
  for (const record of [...local, ...incoming]) {
    const key = JSON.stringify([record.name, record.score, record.dateTime]);
    if (seen.has(key)) continue;
    seen.add(key);
    union.push({ name: record.name, score: record.score, dateTime: record.dateTime });
  }
  union.sort(compareRecords);
  return union.slice(0, LIMITS.recordsPerMode);
}

/** Une valeur par mode, les sept clés écrites une à une. */
function joinPerMode<T, U>(
  local: Record<ModeId, T>,
  incoming: Record<ModeId, T>,
  join: (first: T, second: T) => U,
): Record<ModeId, U> {
  return {
    classic: join(local.classic, incoming.classic),
    'time-attack': join(local['time-attack'], incoming['time-attack']),
    asteroids: join(local.asteroids, incoming.asteroids),
    'black-hole': join(local['black-hole'], incoming['black-hole']),
    'bonus-traps': join(local['bonus-traps'], incoming['bonus-traps']),
    zen: join(local.zen, incoming.zen),
    constellation: join(local.constellation, incoming.constellation),
  };
}

const larger = (first: number, second: number): number => Math.max(first, second);

/**
 * Records réunis ; skins débloqués réunis ; skins choisis, réglages et dernier nom : ceux du fichier ;
 * compteurs : le plus grand des deux. Les conditions de déblocage sont ensuite revérifiées (RG-56) sur le
 * meilleur score de chaque mode et sur les compteurs fusionnés.
 */
export function mergeProgress(local: ProgressData, incoming: ProgressData): ProgressData {
  const records = joinPerMode(local.records, incoming.records, mergeTables);
  const counters = {
    totalCandies: larger(local.counters.totalCandies, incoming.counters.totalCandies),
    gamesByMode: joinPerMode(local.counters.gamesByMode, incoming.counters.gamesByMode, larger),
  };
  const unlocked = inCatalogueOrder([...local.skins.unlocked, ...incoming.skins.unlocked]);
  const earned = MODE_IDS.flatMap((mode) =>
    evaluateUnlocks(unlocked, counters, { mode, score: records[mode][0]?.score ?? 0 }),
  );
  return {
    records,
    lastName: incoming.lastName,
    skins: {
      unlocked: inCatalogueOrder([...unlocked, ...earned]),
      selected: {
        shape: incoming.skins.selected.shape,
        pattern: incoming.skins.selected.pattern,
        trail: incoming.skins.selected.trail,
        decor: incoming.skins.selected.decor,
      },
    },
    counters,
    settings: {
      control: incoming.settings.control,
      sounds: incoming.settings.sounds,
      music: incoming.settings.music,
      vibrations: incoming.settings.vibrations,
    },
  };
}

/** Nombre total de records des sept tableaux. */
export function countRecords(progress: ProgressData): number {
  return Object.values(progress.records).reduce((total, table) => total + table.length, 0);
}
