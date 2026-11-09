/**
 * Entrées et sorties du fichier de sauvegarde (EXS-03, EXS-13). Sortie : sélecteur d'enregistrement s'il existe,
 * sinon partage du système (hors Android), sinon téléchargement. Entrée : fichier choisi par le joueur, dont la
 * taille est contrôlée avant toute lecture. Le nom du fichier importé n'est jamais lu.
 */
import { LIMITS } from '../core/rules.ts';

/** Ce qu'est devenue la demande de sauvegarde. */
export type WriteOutcome =
  | { status: 'saved'; fileName: string }
  /** Le joueur a renoncé à choisir un emplacement : aucun message (RG-69). */
  | { status: 'cancelled' }
  /** Espace insuffisant (E-03). */
  | { status: 'no-space' }
  /** Écriture impossible (E-04). */
  | { status: 'failed' };

interface WritableFile {
  write(data: string): Promise<void>;
  close(): Promise<void>;
  abort(): Promise<void>;
}

interface SavePickerHandle {
  name: string;
  createWritable(): Promise<WritableFile>;
}

type SavePicker = (options: {
  suggestedName: string;
  types: { description: string; accept: Record<string, string[]> }[];
}) => Promise<SavePickerHandle>;

/** Ce que le navigateur offre, passé en paramètre pour que les tests en simulent une partie. */
export interface SaveEnvironment {
  picker?: SavePicker;
  share?: (data: { files: File[] }) => Promise<void>;
  canShare?: (data: { files: File[] }) => boolean;
  isAndroid: boolean;
  download: (file: File) => void;
}

const MIME = 'application/json';

function errorName(error: unknown): string {
  return error instanceof Error || error instanceof DOMException ? error.name : '';
}

/** Un refus du joueur (annulation) ou un manque de place se reconnaissent à leur nom ; le reste est une écriture impossible. */
function outcomeOfError(error: unknown): WriteOutcome {
  const name = errorName(error);
  if (name === 'AbortError') return { status: 'cancelled' };
  if (name === 'QuotaExceededError') return { status: 'no-space' };
  return { status: 'failed' };
}

/** Téléchargement par un lien temporaire : le navigateur range le fichier dans Téléchargements. */
function downloadFile(file: File): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function browserSaveEnvironment(): SaveEnvironment {
  const scope = window as unknown as { showSaveFilePicker?: SavePicker };
  const hasShare =
    typeof navigator.share === 'function' && typeof navigator.canShare === 'function';
  return {
    picker:
      typeof scope.showSaveFilePicker === 'function'
        ? scope.showSaveFilePicker.bind(window)
        : undefined,
    share: hasShare ? (data) => navigator.share(data) : undefined,
    canShare: hasShare ? (data) => navigator.canShare(data) : undefined,
    isAndroid: /Android/i.test(navigator.userAgent),
    download: downloadFile,
  };
}

/** Vrai sur iPhone et iPad : le joueur y est guidé vers « Enregistrer dans Fichiers » (05 § 4.11). */
export function isIphone(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

async function writeWithPicker(
  picker: SavePicker,
  content: string,
  fileName: string,
): Promise<WriteOutcome> {
  let writable: WritableFile | null = null;
  try {
    const handle = await picker({
      suggestedName: fileName,
      types: [{ description: 'Sauvegarde Serpent Cosmique', accept: { [MIME]: ['.json'] } }],
    });
    writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
    // L'emplacement choisi peut avoir un autre nom : c'est celui que le joueur retrouvera.
    return { status: 'saved', fileName: handle.name };
  } catch (error) {
    await writable?.abort().catch(() => undefined);
    return outcomeOfError(error);
  }
}

/**
 * Écrit la sauvegarde. Aucune donnée du jeu n'est touchée. Le jeu ne remplace aucun fichier de lui-même : un fichier
 * existant n'est remplacé que si le joueur l'a désigné et a confirmé dans la fenêtre du système (RG-69).
 * Par partage ou téléchargement, c'est le système qui rapporte un manque de place (03 § 5.3).
 */
export async function writeBackup(
  content: string,
  fileName: string,
  environment: SaveEnvironment = browserSaveEnvironment(),
): Promise<WriteOutcome> {
  if (environment.picker !== undefined) {
    return writeWithPicker(environment.picker, content, fileName);
  }
  const file = new File([content], fileName, { type: MIME });
  const shared = { files: [file] };
  if (
    !environment.isAndroid &&
    environment.share !== undefined &&
    environment.canShare?.(shared) === true
  ) {
    try {
      await environment.share(shared);
      return { status: 'saved', fileName };
    } catch (error) {
      return outcomeOfError(error);
    }
  }
  try {
    environment.download(file);
    return { status: 'saved', fileName };
  } catch (error) {
    return outcomeOfError(error);
  }
}

/**
 * Texte du fichier choisi, ou null s'il est vide, plus grand que 256 Kio (contrôlé sur `File.size`, sans
 * lire le contenu) ou illisible : le jeu répond alors E-01 (RG-72).
 */
export async function readBackupFile(file: File): Promise<string | null> {
  if (file.size === 0 || file.size > LIMITS.importFileMaxBytes) return null;
  try {
    return await file.text();
  } catch {
    return null;
  }
}
