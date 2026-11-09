import { DEFAULT_NAME, LIMITS } from './rules.ts';
import type { RecordEntry } from './types.ts';
import { splitGraphemes, stripForbiddenCharacters } from './validation.ts';

/**
 * Nom tel qu'il se tape : caractères interdits retirés (le validateur les refuserait) et 12 caractères
 * au plus, un emoji ou une lettre accentuée comptant pour un. Les espaces sont gardés : on tape « Jean Paul »
 * lettre à lettre.
 */
export function sanitizeTyping(text: string): string {
  return splitGraphemes(stripForbiddenCharacters(text)).slice(0, LIMITS.nameMaxGraphemes).join('');
}

/** Nom enregistré (RG-51) : nettoyé, sans espaces de bord, « Joueur » s'il est vide. */
export function cleanName(text: string): string {
  const name = sanitizeTyping(text).trim();
  return name === '' ? DEFAULT_NAME : name;
}

/**
 * Insère un record dans le tableau du mode (RG-47, RG-48) : il entre s'il vaut au moins 1 et si le tableau
 * a moins de 10 records ou si son score dépasse strictement le 10e. À score égal, le plus ancien reste avant.
 * Renvoie un nouveau tableau et le rang (à partir de 1), ou null si le record n'entre pas.
 */
export function insertRecord(
  table: readonly RecordEntry[],
  entry: RecordEntry,
): { table: RecordEntry[]; rank: number | null } {
  const last = table[LIMITS.recordsPerMode - 1];
  const enters = entry.score >= LIMITS.scoreMin && (last === undefined || entry.score > last.score);
  if (!enters) return { table: table.map((record) => ({ ...record })), rank: null };
  const before = table.filter((record) => record.score >= entry.score).length;
  const next = table.map((record) => ({ ...record }));
  next.splice(before, 0, { ...entry });
  return { table: next.slice(0, LIMITS.recordsPerMode), rank: before + 1 };
}

/** Remplace le nom du record de ce rang (RG-53). */
export function renameRecord(
  table: readonly RecordEntry[],
  rank: number,
  name: string,
): RecordEntry[] {
  if (!Number.isInteger(rank) || rank < 1 || rank > table.length) {
    throw new RangeError(`Rang de record introuvable : ${rank}.`);
  }
  return table.map((record, index) =>
    index === rank - 1 ? { ...record, name: cleanName(name) } : { ...record },
  );
}
