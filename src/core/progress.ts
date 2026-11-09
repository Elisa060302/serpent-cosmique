import { cleanName, insertRecord, renameRecord } from './records.ts';
import { DEFAULT_NAME, DEFAULT_SETTINGS, LIMITS, MODE_IDS, MYSTERY } from './rules.ts';
import type { ModeId, SkinId } from './rules.ts';
import { defaultSkins, evaluateUnlocks, inCatalogueOrder, withSelectedSkin } from './skins.ts';
import type { PendingGame, ProgressData, Settings } from './types.ts';

function zeroPerMode(): Record<ModeId, number> {
  return Object.fromEntries(MODE_IDS.map((mode) => [mode, 0])) as Record<ModeId, number>;
}

function emptyTables(): ProgressData['records'] {
  return Object.fromEntries(
    MODE_IDS.map((mode) => [mode, []]),
  ) as unknown as ProgressData['records'];
}

/** Progression d'un premier lancement (RG-54, HYP-06). */
export function defaultProgress(): ProgressData {
  return {
    records: emptyTables(),
    lastName: '',
    skins: defaultSkins(),
    counters: { totalCandies: 0, gamesByMode: zeroPerMode() },
    settings: { ...DEFAULT_SETTINGS },
  };
}

/** Nombre de parties terminées sur le téléphone, tous modes et toutes fins confondus (RG-40). */
function gamesPlayed(counters: ProgressData['counters']): number {
  return MODE_IDS.reduce((total, mode) => total + counters.gamesByMode[mode], 0);
}

/** Parties qui restent à terminer avant la découverte du mode surprise (RG-40). */
export function gamesLeftToDiscover(progress: ProgressData): number {
  return Math.max(0, MYSTERY.gamesToDiscover - gamesPlayed(progress.counters));
}

export function isModeDiscovered(progress: ProgressData): boolean {
  return gamesLeftToDiscover(progress) === 0;
}

/**
 * État utile d'une partie en cours à enregistrer (RG-79). Score et bonbons mangés sont bornés à 9 999 par le
 * dictionnaire (HYP-51) ; au-delà, seule cette borne tronque : en dessous, le compte est exact.
 */
export function toPendingGame(
  state: { mode: ModeId; score: number; candiesEaten: number },
  dateTime: string,
): PendingGame {
  return {
    mode: state.mode,
    score: Math.min(LIMITS.scoreMax, state.score),
    candiesEaten: Math.min(LIMITS.candiesEatenMax, state.candiesEaten),
    dateTime,
  };
}

/** Partie terminée, quelle qu'en soit la raison, ou partie interrompue clôturée comme abandonnée. */
export interface FinishedGame {
  mode: ModeId;
  score: number;
  candiesEaten: number;
  dateTime: string;
}

export interface GameOutcome {
  progress: ProgressData;
  /** Rang du record créé (à partir de 1), ou null si le score n'entre pas au tableau. */
  rank: number | null;
  /** Skins débloqués par cette partie, dans l'ordre du catalogue (RG-58). */
  newSkins: SkinId[];
  /** Vrai si cette partie découvre le mode surprise (RG-40) : l'annonce n'a lieu qu'une fois. */
  newMode: boolean;
  /** Nom proposé dans le champ de saisie : le dernier nom enregistré, vide au tout premier record (RG-50). */
  prefill: string;
}

/**
 * Applique la fin d'une partie (RG-45, RG-48, RG-53, RG-56) : compteurs, record créé tout de suite avec le
 * dernier nom, déblocages. La progression reçue n'est pas modifiée.
 */
export function applyFinishedGame(before: ProgressData, game: FinishedGame): GameOutcome {
  const progress = structuredClone(before);
  const counters = progress.counters;
  // Le dictionnaire borne le score à 9 999 : une partie Zen très longue ne rend pas la progression illisible.
  const score = Math.min(LIMITS.scoreMax, game.score);
  counters.totalCandies = Math.min(LIMITS.counterMax, counters.totalCandies + game.candiesEaten);
  counters.gamesByMode[game.mode] = Math.min(
    LIMITS.counterMax,
    counters.gamesByMode[game.mode] + 1,
  );

  const prefill = before.lastName;
  const inserted = insertRecord(progress.records[game.mode], {
    name: cleanName(prefill),
    score,
    dateTime: game.dateTime,
  });
  progress.records[game.mode] = inserted.table;
  if (inserted.rank !== null) progress.lastName = cleanName(prefill);

  const newSkins = evaluateUnlocks(progress.skins.unlocked, counters, { mode: game.mode, score });
  progress.skins.unlocked = inCatalogueOrder([...progress.skins.unlocked, ...newSkins]);
  const newMode = !isModeDiscovered(before) && isModeDiscovered(progress);
  return { progress, rank: inserted.rank, newSkins, newMode, prefill };
}

/** Le nom validé remplace celui du record de ce rang et devient le dernier nom proposé (RG-53). */
export function setRecordName(
  before: ProgressData,
  mode: ModeId,
  rank: number,
  name: string,
): ProgressData {
  const progress = structuredClone(before);
  progress.records[mode] = renameRecord(progress.records[mode], rank, name);
  progress.lastName = progress.records[mode][rank - 1]?.name ?? DEFAULT_NAME;
  return progress;
}

/** Un réglage change de valeur ; il est enregistré aussitôt par l'appelant (RG-62, RG-83). */
export function withSetting<K extends keyof Settings>(
  before: ProgressData,
  key: K,
  value: Settings[K],
): ProgressData {
  const progress = structuredClone(before);
  progress.settings[key] = value;
  return progress;
}

/** Un skin débloqué est choisi pour sa catégorie ; enregistré aussitôt par l'appelant (RG-60, RG-83). */
export function withChosenSkin(before: ProgressData, id: string): ProgressData {
  const progress = structuredClone(before);
  progress.skins = withSelectedSkin(progress.skins, id);
  return progress;
}
