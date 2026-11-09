/**
 * Module unique de validation (EXS-04, EXS-17) : toute progression lue (stockage local, fichier importé,
 * partie en cours) passe par ici. Liste blanche stricte : ensemble exact des clés, types exacts, bornes
 * du dictionnaire. Le résultat est toujours une structure neuve construite champ par champ ; au premier
 * écart, la valeur est refusée en entier (null).
 */
import { LIMITS, MODE_IDS, SAVE_FORMAT, SKINS, SKIN_CATEGORIES } from './rules.ts';
import type { ModeId, SkinCategory, SkinId } from './rules.ts';
import { inCatalogueOrder } from './skins.ts';
import type { Envelope, PendingGame, ProgressData, RecordEntry, Settings } from './types.ts';

type Plain = Record<string, unknown>;

/**
 * Caractères interdits dans un nom : contrôles (dont retours à la ligne), substituts isolés et marques
 * bidirectionnelles. U+200D, liant des emojis composés, reste admis. Défini une seule fois : la saisie
 * du nom retire ces mêmes caractères, donc un nom enregistré passe toujours le validateur.
 */
const FORBIDDEN_NAME_CHARACTERS =
  '[\\p{Cc}\\p{Cs}\\u061C\\u200E\\u200F\\u202A-\\u202E\\u2066-\\u2069]';
const FORBIDDEN_TEST = new RegExp(FORBIDDEN_NAME_CHARACTERS, 'u');
const FORBIDDEN_ALL = new RegExp(FORBIDDEN_NAME_CHARACTERS, 'gu');
const SEGMENTER = new Intl.Segmenter('fr', { granularity: 'grapheme' });

export function stripForbiddenCharacters(text: string): string {
  return text.replace(FORBIDDEN_ALL, '');
}

/** Caractères perçus par le joueur : un emoji, même composé, ou une lettre accentuée comptent pour un. */
export function splitGraphemes(text: string): string[] {
  return Array.from(SEGMENTER.segment(text), (part) => part.segment);
}

export function isValidName(name: unknown): name is string {
  return (
    typeof name === 'string' &&
    name.length > 0 &&
    // RG-51 : le nom enregistré n'a ni espace de début ni espace de fin.
    name.trim() === name &&
    !FORBIDDEN_TEST.test(name) &&
    splitGraphemes(name).length <= LIMITS.nameMaxGraphemes
  );
}

function isPlainObject(value: unknown): value is Plain {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

/** Objet simple dont l'ensemble des clés est exactement `keys` (`__proto__`, `constructor`… sont des clés inconnues). */
function isExactObject(value: unknown, keys: readonly string[]): value is Plain {
  if (!isPlainObject(value)) return false;
  const own = Object.keys(value);
  return own.length === keys.length && keys.every((key) => own.includes(key));
}

function readInteger(value: unknown, min: number, max: number): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max
    ? value
    : null;
}

const DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/;
const HOUR_MS = 3_600_000;

/**
 * Heure locale `AAAA-MM-JJTHH:MM:SS` valide, postérieure au 01/01/2026 et au plus 24 heures après l'heure
 * du téléphone (tolérance pour un transfert entre fuseaux horaires). L'heure locale est comparée comme
 * une heure « murale » : le fuseau n'entre pas dans la comparaison. Pour la progression locale
 * (`allowFuture`), une date future ne fait jamais rejeter la progression : l'horloge du téléphone a pu être
 * décalée puis remise à l'heure (HYP-49) ; seul le fichier importé garde le contrôle strict.
 */
function readDateTime(value: unknown, now: Date, allowFuture: boolean): string | null {
  if (typeof value !== 'string') return null;
  const match = DATE_TIME.exec(value);
  if (match === null) return null;
  const wall = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6]),
  );
  // Un aller-retour détecte les dates impossibles (30 février, 24 h, mois 13) que Date.UTC « corrige ».
  if (new Date(wall).toISOString().slice(0, 19) !== value) return null;
  const nowWall = now.getTime() - now.getTimezoneOffset() * 60_000;
  const earliest = Date.parse(`${LIMITS.earliestDate}T00:00:00Z`);
  const latest = nowWall + LIMITS.futureToleranceHours * HOUR_MS;
  return wall >= earliest && (allowFuture || wall <= latest) ? value : null;
}

function isModeId(value: unknown): value is ModeId {
  return typeof value === 'string' && (MODE_IDS as readonly string[]).includes(value);
}

function readRecord(value: unknown, now: Date, allowFuture: boolean): RecordEntry | null {
  if (!isExactObject(value, ['name', 'score', 'dateTime'])) return null;
  const score = readInteger(value.score, LIMITS.scoreMin, LIMITS.scoreMax);
  const dateTime = readDateTime(value.dateTime, now, allowFuture);
  if (score === null || dateTime === null || !isValidName(value.name)) return null;
  return { name: value.name, score, dateTime };
}

function readTable(value: unknown, now: Date, allowFuture: boolean): RecordEntry[] | null {
  if (!Array.isArray(value) || value.length > LIMITS.recordsPerMode) return null;
  const table: RecordEntry[] = [];
  for (const item of value as unknown[]) {
    const record = readRecord(item, now, allowFuture);
    if (record === null) return null;
    // Les tableaux sont triés par score décroissant (RG-47) ; l'ordre des dates ne dépend que de l'horloge du téléphone.
    if (table.length > 0 && record.score > (table[table.length - 1] as RecordEntry).score) {
      return null;
    }
    table.push(record);
  }
  return table;
}

/** Lit une valeur par mode : les sept clés, écrites une à une, sans clé calculée. */
function readPerMode<T>(
  value: unknown,
  read: (item: unknown) => T | null,
): Record<ModeId, T> | null {
  if (!isExactObject(value, MODE_IDS)) return null;
  const classic = read(value['classic']);
  const timeAttack = read(value['time-attack']);
  const asteroids = read(value['asteroids']);
  const blackHole = read(value['black-hole']);
  const bonusTraps = read(value['bonus-traps']);
  const zen = read(value['zen']);
  const constellation = read(value['constellation']);
  if (
    classic === null ||
    timeAttack === null ||
    asteroids === null ||
    blackHole === null ||
    bonusTraps === null ||
    zen === null ||
    constellation === null
  ) {
    return null;
  }
  return {
    classic,
    'time-attack': timeAttack,
    asteroids,
    'black-hole': blackHole,
    'bonus-traps': bonusTraps,
    zen,
    constellation,
  };
}

function skinOf(value: unknown): (typeof SKINS)[number] | null {
  return SKINS.find((skin) => skin.id === value) ?? null;
}

function readSkins(value: unknown): ProgressData['skins'] | null {
  if (!isExactObject(value, ['unlocked', 'selected'])) return null;
  const listed = value.unlocked;
  if (!Array.isArray(listed) || listed.length > SKINS.length) return null;
  const ids: string[] = [];
  for (const item of listed as unknown[]) {
    if (skinOf(item) === null || ids.includes(item as string)) return null;
    ids.push(item as string);
  }
  const unlocked = inCatalogueOrder(ids);
  // Les quatre skins par défaut sont débloqués d'office et ne se reverrouillent jamais (RG-54, RG-57).
  const defaults = SKINS.filter((skin) => skin.condition.kind === 'default');
  if (!defaults.every((skin) => unlocked.includes(skin.id))) return null;
  if (!isExactObject(value.selected, SKIN_CATEGORIES)) return null;
  const pick = (category: SkinCategory): SkinId | null => {
    const skin = skinOf((value.selected as Plain)[category]);
    return skin !== null && skin.category === category && unlocked.includes(skin.id)
      ? skin.id
      : null;
  };
  const shape = pick('shape');
  const pattern = pick('pattern');
  const trail = pick('trail');
  const decor = pick('decor');
  if (shape === null || pattern === null || trail === null || decor === null) return null;
  return { unlocked, selected: { shape, pattern, trail, decor } };
}

function readCounter(value: unknown): number | null {
  return readInteger(value, 0, LIMITS.counterMax);
}

function readCounters(value: unknown): ProgressData['counters'] | null {
  if (!isExactObject(value, ['totalCandies', 'gamesByMode'])) return null;
  const totalCandies = readCounter(value.totalCandies);
  const gamesByMode = readPerMode(value.gamesByMode, readCounter);
  return totalCandies === null || gamesByMode === null ? null : { totalCandies, gamesByMode };
}

function readSettings(value: unknown): Settings | null {
  if (!isExactObject(value, ['control', 'sounds', 'music', 'vibrations'])) return null;
  const control = value.control;
  if (control !== 'swipe' && control !== 'arrows') return null;
  if (
    typeof value.sounds !== 'boolean' ||
    typeof value.music !== 'boolean' ||
    typeof value.vibrations !== 'boolean'
  ) {
    return null;
  }
  return { control, sounds: value.sounds, music: value.music, vibrations: value.vibrations };
}

/** Progression complète : renvoie une structure neuve ou null (refus total). */
export function validateProgressData(
  value: unknown,
  now: Date,
  allowFuture = false,
): ProgressData | null {
  if (!isExactObject(value, ['records', 'lastName', 'skins', 'counters', 'settings'])) return null;
  const records = readPerMode(value.records, (table) => readTable(table, now, allowFuture));
  const lastName = value.lastName === '' || isValidName(value.lastName) ? value.lastName : null;
  const skins = readSkins(value.skins);
  const counters = readCounters(value.counters);
  const settings = readSettings(value.settings);
  if (
    records === null ||
    lastName === null ||
    skins === null ||
    counters === null ||
    settings === null
  ) {
    return null;
  }
  return { records, lastName, skins, counters, settings };
}

const CHECKSUM = /^[0-9a-f]{64}$/;

/** Enveloppe d'une progression (03 § 4.1), hors recalcul de la somme de contrôle (voir savefile.ts). */
export function validateEnvelope(value: unknown, now: Date, allowFuture = false): Envelope | null {
  if (!isExactObject(value, ['format', 'formatVersion', 'createdAt', 'data', 'checksum'])) {
    return null;
  }
  const formatVersion = readInteger(value.formatVersion, 1, SAVE_FORMAT.version);
  const createdAt = readDateTime(value.createdAt, now, allowFuture);
  const data = validateProgressData(value.data, now, allowFuture);
  const checksum = typeof value.checksum === 'string' && CHECKSUM.test(value.checksum);
  if (value.format !== SAVE_FORMAT.name || formatVersion === null || createdAt === null)
    return null;
  if (data === null || !checksum) return null;
  return {
    format: SAVE_FORMAT.name,
    formatVersion,
    createdAt,
    data,
    checksum: value.checksum as string,
  };
}

/** Partie en cours enregistrée à chaque bonbon et à chaque pause (RG-79). */
export function validatePendingGame(
  value: unknown,
  now: Date,
  allowFuture = false,
): PendingGame | null {
  if (!isExactObject(value, ['mode', 'score', 'candiesEaten', 'dateTime'])) return null;
  const score = readInteger(value.score, 0, LIMITS.scoreMax);
  const candiesEaten = readInteger(value.candiesEaten, 0, LIMITS.candiesEatenMax);
  const dateTime = readDateTime(value.dateTime, now, allowFuture);
  if (!isModeId(value.mode) || score === null || candiesEaten === null || dateTime === null) {
    return null;
  }
  return { mode: value.mode, score, candiesEaten, dateTime };
}
