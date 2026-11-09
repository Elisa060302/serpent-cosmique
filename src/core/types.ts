import type { Random } from './random.ts';
import type {
  CANDY_COLORS,
  DIRECTIONS,
  ModeId,
  SkinCategory,
  SkinId,
  SpecialType,
  TimedEffect,
} from './rules.ts';

export type Direction = (typeof DIRECTIONS)[number];

/** Case de la grille : colonne 1 à gauche, ligne 1 en haut. */
export interface Cell {
  col: number;
  row: number;
}

export type CandyColorId = (typeof CANDY_COLORS)[number]['id'];

/** Couleur de tout le serpent : celle du dernier bonbon, ou l'arc-en-ciel. */
export type SnakeColor = CandyColorId | 'rainbow';

export interface Candy {
  cell: Cell;
  color: CandyColorId;
}

export type EndReason = 'collision' | 'victory' | 'abandon' | 'time';

/** Bonbon spécial du mode Bonus et pièges : il disparaît de lui-même au bout de sa durée de vie (RG-35). */
export interface SpecialCandy {
  cell: Cell;
  color: CandyColorId;
  type: SpecialType;
  /** Temps de jeu restant avant qu'il disparaisse, en millisecondes. */
  remainingMs: number;
}

/** Effet à durée en cours (RG-36, RG-37). */
export interface Effect {
  type: TimedEffect;
  /** Temps de jeu restant, en millisecondes. */
  remainingMs: number;
}

/** Trou noir : `pair` est le numéro de la paire (son halo), `twin` la case du trou jumeau. */
export interface BlackHole {
  cell: Cell;
  pair: number;
  twin: Cell;
}

/** Constellation à tracer (RG-41, RG-42). */
export interface ConstellationState {
  /** Suite de couleurs différentes à manger dans l'ordre. */
  sequence: CandyColorId[];
  /** Nombre de couleurs de la suite déjà mangées dans l'ordre. */
  progress: number;
  /** Constellations complétées pendant la partie : elles s'ajoutent au ciel du décor. */
  completed: number;
}

/** Ce que le moteur signale à l'interface, qui en fait des sons, des vibrations et des annonces. */
export type GameEvent =
  | { kind: 'eat' }
  | { kind: 'special'; type: SpecialType }
  | { kind: 'constellation' }
  | { kind: 'effect-end' };

/** Ce qui change d'un mode à l'autre. */
export interface ModeRules {
  id: ModeId;
  /** Vitesse en cases par seconde selon le nombre de bonbons mangés. */
  speed(candiesEaten: number): number;
  /** Nombre de bonbons présents en même temps. */
  candyCount: number;
  /** Si présent, un bonbon de chacune de ces couleurs est présent en permanence, remplacé par le même (RG-41). */
  candyColors?: readonly CandyColorId[];
  /** Bords et corps traversables : plus aucune collision (RG-39). */
  wraps?: boolean;
  /** Durée de la partie en temps de jeu, comptée depuis le premier pas (RG-29). */
  timeLimitMs?: number;
  /** Prépare les éléments propres au mode (astéroïdes, trous noirs, constellation) avant les bonbons. */
  setup?(game: Game): void;
  /** Points d'un bonbon mangé (1 par défaut) ; peut mettre à jour l'état propre au mode. */
  points?(game: Game, candy: Candy): number;
  /** Après un bonbon mangé, le score et la couleur du serpent étant à jour : nouveaux obstacles ou bonbons spéciaux. */
  afterEat?(game: Game): void;
}

export interface Game {
  rules: ModeRules;
  random: Random;
  /** Cases du serpent, la tête en premier. */
  snake: Cell[];
  /** Direction du dernier pas. */
  direction: Direction;
  /** Commandes en attente, la plus ancienne en premier. */
  queue: Direction[];
  candies: Candy[];
  score: number;
  candiesEaten: number;
  /** Nombre de pas faits. */
  steps: number;
  color: SnakeColor;
  end: EndReason | null;
  /** Temps de jeu écoulé depuis le premier pas, en millisecondes : jamais la pause ni les comptes à rebours. */
  elapsedMs: number;
  /** Astéroïdes (RG-31). */
  obstacles: Cell[];
  /** Trous noirs (RG-33). */
  holes: BlackHole[];
  special: SpecialCandy | null;
  effect: Effect | null;
  constellation: ConstellationState | null;
  /** Événements depuis la dernière lecture par l'interface. */
  events: GameEvent[];
}

/** Record d'un tableau (02 § 5.1) : `dateTime` est l'heure locale du téléphone, `AAAA-MM-JJTHH:MM:SS`. */
export interface RecordEntry {
  name: string;
  score: number;
  dateTime: string;
}

export interface Settings {
  control: 'swipe' | 'arrows';
  sounds: boolean;
  music: boolean;
  vibrations: boolean;
}

/** Progression du téléphone, commune à tous les joueurs (RG-82). */
export interface ProgressData {
  records: Record<ModeId, RecordEntry[]>;
  lastName: string;
  skins: { unlocked: SkinId[]; selected: Record<SkinCategory, SkinId> };
  counters: { totalCandies: number; gamesByMode: Record<ModeId, number> };
  settings: Settings;
}

/** État utile d'une partie en cours, relu au lancement suivant si le jeu a été fermé (RG-79). */
export interface PendingGame {
  mode: ModeId;
  score: number;
  candiesEaten: number;
  dateTime: string;
}

/** Progression enveloppée : la même structure sert au stockage local et au fichier de sauvegarde. */
export interface Envelope {
  format: string;
  formatVersion: number;
  createdAt: string;
  data: ProgressData;
  checksum: string;
}
