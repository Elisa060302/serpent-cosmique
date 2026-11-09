/**
 * Enveloppe de la progression : le même format sert au stockage local et au fichier de sauvegarde.
 * Somme de contrôle SHA-256 de la forme canonique (clés dans un ordre fixe, skins dans l'ordre du catalogue).
 */
import { LIMITS, MODE_IDS, SAVE_FORMAT } from './rules.ts';
import { inCatalogueOrder } from './skins.ts';
import type { Envelope, ProgressData } from './types.ts';
import { validateEnvelope } from './validation.ts';

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function perMode<T>(read: (mode: (typeof MODE_IDS)[number]) => T): Record<string, T> {
  return Object.fromEntries(MODE_IDS.map((mode) => [mode, read(mode)]));
}

/** Données reconstruites champ par champ dans l'ordre du format : aucune clé en trop, aucun ordre hérité. */
function canonicalData(data: ProgressData): object {
  return {
    records: perMode((mode) =>
      data.records[mode].map((record) => ({
        name: record.name,
        score: record.score,
        dateTime: record.dateTime,
      })),
    ),
    lastName: data.lastName,
    skins: {
      unlocked: inCatalogueOrder(data.skins.unlocked),
      selected: {
        shape: data.skins.selected.shape,
        pattern: data.skins.selected.pattern,
        trail: data.skins.selected.trail,
        decor: data.skins.selected.decor,
      },
    },
    counters: {
      totalCandies: data.counters.totalCandies,
      gamesByMode: perMode((mode) => data.counters.gamesByMode[mode]),
    },
    settings: {
      control: data.settings.control,
      sounds: data.settings.sounds,
      music: data.settings.music,
      vibrations: data.settings.vibrations,
    },
  };
}

/** Texte de la forme canonique sur laquelle porte la somme de contrôle. */
function signedText(formatVersion: number, createdAt: string, data: ProgressData): string {
  return JSON.stringify({
    format: SAVE_FORMAT.name,
    formatVersion,
    createdAt,
    data: canonicalData(data),
  });
}

/** Enveloppe prête à être écrite : forme canonique suivie de sa somme de contrôle. */
export async function serializeEnvelope(data: ProgressData, createdAt: string): Promise<string> {
  const checksum = await sha256Hex(signedText(SAVE_FORMAT.version, createdAt, data));
  return JSON.stringify({
    format: SAVE_FORMAT.name,
    formatVersion: SAVE_FORMAT.version,
    createdAt,
    data: canonicalData(data),
    checksum,
  });
}

/** Résultat de la lecture d'un fichier de sauvegarde importé (RG-72). */
export type BackupReading =
  | { status: 'valid'; envelope: Envelope }
  /** Fichier de ce jeu, mais d'une version de format plus récente que celle que ce jeu connaît (E-02). */
  | { status: 'newer' }
  /** Tout autre refus (E-01). */
  | { status: 'invalid' };

function parseJson(text: string): unknown {
  if (text.length > LIMITS.importFileMaxBytes) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    // JSON tronqué, mal formé ou trop imbriqué (SyntaxError, RangeError) : même refus.
    return undefined;
  }
}

async function verify(parsed: unknown, now: Date, allowFuture: boolean): Promise<Envelope | null> {
  const envelope = validateEnvelope(parsed, now, allowFuture);
  if (envelope === null) return null;
  const expected = await sha256Hex(
    signedText(envelope.formatVersion, envelope.createdAt, envelope.data),
  );
  return expected === envelope.checksum ? envelope : null;
}

/**
 * Lit et contrôle une enveloppe : taille, JSON, liste blanche, bornes puis somme de contrôle recalculée
 * à partir des seules valeurs validées. `allowFuture` : progression locale, sans contrôle des dates futures
 * (HYP-49). Renvoie null au moindre écart, sans jamais lever d'exception.
 */
export async function readEnvelope(
  text: string,
  now: Date,
  allowFuture = false,
): Promise<Envelope | null> {
  const parsed = parseJson(text);
  return parsed === undefined ? null : verify(parsed, now, allowFuture);
}

/** Vrai pour un fichier qui se dit de ce jeu avec un numéro de format supérieur à celui que ce jeu connaît. */
function isNewerFormat(parsed: unknown): boolean {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return false;
  const candidate = parsed as Record<string, unknown>;
  const version = candidate['formatVersion'];
  return (
    candidate['format'] === SAVE_FORMAT.name &&
    typeof version === 'number' &&
    Number.isSafeInteger(version) &&
    version > SAVE_FORMAT.version
  );
}

/**
 * Lit un fichier de sauvegarde importé (EXS-04) : contrôle strict, dates futures refusées, et distinction
 * du fichier d'une version plus récente (E-02). Ne lève jamais d'exception.
 */
export async function readBackup(text: string, now: Date): Promise<BackupReading> {
  const parsed = parseJson(text);
  if (parsed === undefined) return { status: 'invalid' };
  if (isNewerFormat(parsed)) return { status: 'newer' };
  const envelope = await verify(parsed, now, false);
  return envelope === null ? { status: 'invalid' } : { status: 'valid', envelope };
}

const BACKUP_NAME_PREFIX = 'serpent-cosmique-sauvegarde-';

/**
 * Nom du fichier de sauvegarde (RG-68) à partir de l'heure locale `AAAA-MM-JJTHH:MM:SS` : minute comprise,
 * suivi de « -N » (N à partir de 2) si ce nom a déjà été produit depuis l'ouverture du jeu.
 */
export function backupFileName(localDateTime: string, used: ReadonlySet<string>): string {
  const date = localDateTime.slice(0, 10);
  const minute = `${localDateTime.slice(11, 13)}${localDateTime.slice(14, 16)}`;
  const base = `${BACKUP_NAME_PREFIX}${date}-${minute}`;
  let name = `${base}.json`;
  for (let suffix = 2; used.has(name); suffix += 1) name = `${base}-${suffix}.json`;
  return name;
}
