/** Seul endroit où sont définies les valeurs des règles du jeu. */

export const GRID = { columns: 24, rows: 12 } as const;

/** Tête en colonne 6, ligne 6, suivie de 3 anneaux sur la même ligne. */
export const START = { headColumn: 6, headRow: 6, length: 4 } as const;

export const MODE_IDS = [
  'classic',
  'time-attack',
  'asteroids',
  'black-hole',
  'bonus-traps',
  'zen',
  'constellation',
] as const;

export type ModeId = (typeof MODE_IDS)[number];

export const CANDY_COLORS = [
  { id: 'pink', hex: '#FF4FA3', silhouette: 'wrapped-round' },
  { id: 'purple', hex: '#A66BFF', silhouette: 'berlingot' },
  { id: 'light-pink', hex: '#FFC2E2', silhouette: 'marshmallow' },
  { id: 'light-blue', hex: '#7FD8FF', silhouette: 'sugar-star' },
] as const;

export const RAINBOW_COLORS = [
  '#FF6B6B',
  '#FFB347',
  '#FFE066',
  '#5EE6A0',
  '#7FD8FF',
  '#A66BFF',
] as const;

export const SKIN_CATEGORIES = ['shape', 'pattern', 'trail', 'decor'] as const;

export type SkinCategory = (typeof SKIN_CATEGORIES)[number];

/** Condition de déblocage d'un skin (RG-54). */
export type SkinCondition =
  | { readonly kind: 'default' }
  | { readonly kind: 'score'; readonly mode: ModeId; readonly points: number }
  | { readonly kind: 'total-candies'; readonly count: number }
  | { readonly kind: 'all-modes' };

interface SkinDefinition {
  id: string;
  category: SkinCategory;
  condition: SkinCondition;
}

/** Catalogue des 16 skins, 4 par catégorie, le premier de chaque catégorie étant celui par défaut (RG-54). */
export const SKINS = [
  { id: 'shape-rings', category: 'shape', condition: { kind: 'default' } },
  {
    id: 'shape-comet',
    category: 'shape',
    condition: { kind: 'score', mode: 'classic', points: 15 },
  },
  { id: 'shape-rocket', category: 'shape', condition: { kind: 'total-candies', count: 250 } },
  { id: 'shape-saucer', category: 'shape', condition: { kind: 'total-candies', count: 1000 } },
  { id: 'pattern-plain', category: 'pattern', condition: { kind: 'default' } },
  { id: 'pattern-dots', category: 'pattern', condition: { kind: 'total-candies', count: 25 } },
  {
    id: 'pattern-stars',
    category: 'pattern',
    condition: { kind: 'score', mode: 'time-attack', points: 20 },
  },
  {
    id: 'pattern-candy-cane',
    category: 'pattern',
    condition: { kind: 'score', mode: 'bonus-traps', points: 20 },
  },
  { id: 'trail-none', category: 'trail', condition: { kind: 'default' } },
  { id: 'trail-stardust', category: 'trail', condition: { kind: 'total-candies', count: 100 } },
  {
    id: 'trail-sugar',
    category: 'trail',
    condition: { kind: 'score', mode: 'asteroids', points: 15 },
  },
  { id: 'trail-aurora', category: 'trail', condition: { kind: 'score', mode: 'zen', points: 50 } },
  { id: 'decor-starry-night', category: 'decor', condition: { kind: 'default' } },
  {
    id: 'decor-nebula',
    category: 'decor',
    condition: { kind: 'score', mode: 'black-hole', points: 15 },
  },
  {
    id: 'decor-candy-planet',
    category: 'decor',
    condition: { kind: 'score', mode: 'constellation', points: 25 },
  },
  { id: 'decor-milky-way', category: 'decor', condition: { kind: 'all-modes' } },
] as const satisfies readonly SkinDefinition[];

export type SkinId = (typeof SKINS)[number]['id'];

/** Nom donné à un record dont le nom est vide (RG-51). */
export const DEFAULT_NAME = 'Joueur';

/** Réglages au premier lancement (HYP-06). */
export const DEFAULT_SETTINGS = {
  control: 'swipe',
  sounds: true,
  music: true,
  vibrations: true,
} as const;

/** Vibrations, en millisecondes : fin de partie par collision, bonbon spécial mangé (RG-66). */
export const VIBRATION_MS = { collision: 300, special: 80 } as const;

export const SOUND_EVENTS = [
  'candy',
  'special',
  'constellation',
  'end',
  'record',
  'unlock',
] as const;

export type SoundEvent = (typeof SOUND_EVENTS)[number];

/** Note synthétisée : fréquence en hertz, début relatif et durée en secondes. */
export interface Note {
  readonly hz: number;
  readonly at: number;
  readonly seconds: number;
}

/**
 * Sons synthétisés (RG-66, 03 § 7) : une forme d'onde distincte pour les bruitages et pour la musique,
 * le bruitage de chaque événement, et la musique de fond, une mélodie jouée en boucle.
 */
export const AUDIO = {
  sfxWave: 'square',
  sfxVolume: 0.12,
  musicWave: 'triangle',
  musicVolume: 0.05,
  /** Temps de montée et de descente du volume d'une note, pour éviter les claquements. */
  fadeSeconds: 0.01,
  /** Le bruitage de déblocage suit celui du record sans le recouvrir. */
  unlockAfterRecordSeconds: 0.8,
  sfx: {
    candy: [
      { hz: 660, at: 0, seconds: 0.06 },
      { hz: 880, at: 0.06, seconds: 0.08 },
    ],
    special: [
      { hz: 523, at: 0, seconds: 0.08 },
      { hz: 784, at: 0.08, seconds: 0.08 },
      { hz: 1047, at: 0.16, seconds: 0.12 },
    ],
    constellation: [
      { hz: 523, at: 0, seconds: 0.1 },
      { hz: 659, at: 0.1, seconds: 0.1 },
      { hz: 784, at: 0.2, seconds: 0.1 },
      { hz: 1047, at: 0.3, seconds: 0.2 },
    ],
    end: [
      { hz: 392, at: 0, seconds: 0.15 },
      { hz: 311, at: 0.15, seconds: 0.15 },
      { hz: 233, at: 0.3, seconds: 0.3 },
    ],
    record: [
      { hz: 523, at: 0, seconds: 0.12 },
      { hz: 659, at: 0.12, seconds: 0.12 },
      { hz: 784, at: 0.24, seconds: 0.12 },
      { hz: 1047, at: 0.36, seconds: 0.3 },
    ],
    unlock: [
      { hz: 784, at: 0, seconds: 0.1 },
      { hz: 988, at: 0.1, seconds: 0.1 },
      { hz: 1319, at: 0.2, seconds: 0.25 },
    ],
  } satisfies Record<SoundEvent, readonly Note[]>,
  music: {
    /** Durée d'un tour de la mélodie, et avance avec laquelle le suivant est programmé. */
    cycleSeconds: 8,
    leadSeconds: 1,
    notes: [262, 330, 392, 330, 294, 349, 440, 349, 262, 330, 392, 523, 440, 392, 330, 294].map(
      (hz, index) => ({ hz, at: index * 0.5, seconds: 0.45 }),
    ) satisfies readonly Note[],
  },
} as const;

/** Enveloppe de la progression et du fichier de sauvegarde (03 § 4.1). */
export const SAVE_FORMAT = { name: 'serpent-cosmique-sauvegarde', version: 1 } as const;

/** Base IndexedDB de la progression (03 § 4.3). */
export const STORAGE = {
  database: 'serpent-cosmique',
  version: 1,
  store: 'kv',
  progressKey: 'progress',
  previousKey: 'progressPrevious',
  pendingKey: 'pendingGame',
} as const;

/** Durée d'affichage d'un message passager, en millisecondes (05 § 6 : au moins 6 s). */
export const TOAST_MS = 6000;

/** Durée d'affichage d'un message passager d'erreur, en millisecondes (E-08 : 8 s, 05 § 4.6). */
export const ERROR_TOAST_MS = 8000;

/** Attente maximale, après la fin de la vérification de version, de l'annonce d'un nouvel agent de service (EF-29). */
export const UPDATE_EVENT_WAIT_MS = 3000;

/** Limites du dictionnaire de données. */
export const LIMITS = {
  recordsPerMode: 10,
  scoreMin: 1,
  scoreMax: 9999,
  nameMaxGraphemes: 12,
  counterMax: 1_000_000_000,
  /** Comme le score : Zen et Bonus et pièges permettent de manger plus de bonbons que la grille n'a de cases (HYP-51). */
  candiesEatenMax: 9999,
  importFileMaxBytes: 262_144,
  earliestDate: '2026-01-01',
  futureToleranceHours: 24,
} as const;

/**
 * Aucune API ne donne la taille physique de l'écran : constante prudente
 * (1 pixel CSS mesure de 0,156 mm sur iPhone à 0,18 mm sur Galaxy S22).
 */
export const PX_PER_MM = 6.3;

/** Tailles tactiles, en millimètres. */
export const SIZES_MM = { swipe: 5, arrow: 12, pauseButton: 9 } as const;

export const DIRECTIONS = ['up', 'down', 'left', 'right'] as const;

/** Nombre de commandes gardées entre deux pas (RG-25). */
export const COMMAND_QUEUE_MAX = 2;

/** Compte à rebours de départ et de reprise (RG-05, RG-76), en secondes. */
export const COUNTDOWN_SECONDS = 3;

/** Délai entre une collision et l'écran de fin (RG-08), en millisecondes. */
export const END_DELAY_MS = 1000;

/** Vitesse du mode Classique en cases par seconde (RG-28). */
export const CLASSIC_SPEED = { start: 6, perCandy: 0.2, max: 12 } as const;

/** Contre la montre : durée du chrono, vitesse fixe et bonbons présents en permanence (RG-29). */
export const TIME_ATTACK = { durationMs: 60_000, speed: 8, candyCount: 3 } as const;

/**
 * Champ d'astéroïdes (RG-31, RG-32) : nombre au départ, un de plus tous les `every` bonbons jusqu'à `max`,
 * distance minimale (en cases, colonnes plus lignes) à la tête, ligne interdite au départ.
 */
export const ASTEROIDS = {
  speed: 7,
  initial: 3,
  every: 5,
  max: 30,
  minHeadDistance: 4,
  startExcludedRow: 6,
} as const;

/**
 * Trou noir (RG-33) : deux paires de trous dans la zone donnée, hors de la ligne de départ du serpent, à
 * `minDistance` cases au moins l'un de l'autre. Les halos se distinguent par la teinte (aucune couleur de
 * bonbon) et par le trait, pour ne pas dépendre de la couleur seule (05 § 7.1).
 */
export const BLACK_HOLES = {
  pairs: 2,
  columns: { min: 3, max: 22 },
  rows: { min: 3, max: 10 },
  excludedRow: 6,
  minDistance: 4,
  halos: [
    { hex: '#FFB347', style: 'solid' },
    { hex: '#4DE3C1', style: 'dotted' },
  ],
} as const;

export const SPECIAL_TYPES = ['slow', 'turbo', 'shrink', 'invert'] as const;

export type SpecialType = (typeof SPECIAL_TYPES)[number];

/** Effets à durée d'un bonbon spécial (RG-36) : ils remplacent l'effet en cours (RG-37). */
export type TimedEffect = 'slow' | 'turbo' | 'invert';

/**
 * Bonus et pièges (RG-35, RG-36) : vitesse hors effet, un bonbon spécial tous les `every` bonbons, sa durée de vie,
 * la durée des effets, leurs vitesses, et le Rétrécissement (anneaux retirés, longueur minimale en cases).
 */
export const BONUS = {
  speed: 7,
  every: 3,
  lifeMs: 8000,
  effectMs: 6000,
  slowSpeed: 4,
  turboSpeed: 11,
  shrinkBy: 3,
  minLength: 4,
  /** Durée d'affichage de l'annonce « Rétrécissement » dans le bandeau, en temps de jeu. */
  shrinkNoticeMs: 2000,
} as const;

/** Zen : vitesse fixe (RG-39). */
export const ZEN = { speed: 6 } as const;

/** Constellation : vitesse fixe, longueur d'une suite de couleurs et points de bonus (RG-41, RG-42, RG-43). */
export const CONSTELLATION = { speed: 7, sequenceLength: 3, completionBonus: 5 } as const;

/** Le mode surprise se découvre quand ce nombre de parties est terminé, tous modes confondus (RG-40). */
export const MYSTERY = { mode: 'constellation', gamesToDiscover: 3 } as const satisfies {
  mode: ModeId;
  gamesToDiscover: number;
};

/** Le serpent devient arc-en-ciel quand le nombre de bonbons mangés est un multiple de ce nombre (RG-19). */
export const RAINBOW_EVERY = 10;

/** Couleur de tout le serpent au début d'une partie (RG-16). */
export const START_SNAKE_COLOR = 'pink';

/**
 * Ordonnanceur : au plus ce nombre de pas par image (le retard au-delà est abandonné, jamais rattrapé)
 * et tolérance, en millisecondes, sur l'instant d'un pas.
 */
export const SCHEDULER = { maxStepsPerFrame: 2, toleranceMs: 0.5 } as const;

const MARGIN_PX = 8;
const PAUSE_BUTTON_PX = 60;

/**
 * Disposition de l'écran de partie, en pixels CSS (05 § 4.3). Les tailles tactiles minimales viennent de
 * `SIZES_MM` : le bouton pause (hauteur) et la flèche (côté) ne peuvent pas être plus petits.
 */
export const LAYOUT = {
  /** Marge d'écran, en plus des zones sûres (05 § 7.3). */
  marginPx: MARGIN_PX,
  /** Hauteur du bouton pause, au moins égale à `SIZES_MM.pauseButton` (vérifié par un test). */
  pauseButtonPx: PAUSE_BUTTON_PX,
  /** Bandeau : marge haute, puis bouton pause. */
  hudHeightPx: MARGIN_PX + PAUSE_BUTTON_PX,
  /** Côté minimal d'une flèche. */
  arrowPx: Math.ceil(SIZES_MM.arrow * PX_PER_MM),
  minCellPx: 19,
  arrowMaxHeightMm: 20,
  maxPixelRatio: 2,
} as const;

/**
 * Les 4 décors (RG-54, ENF-11) : couleur de base de 05 § 7.1, quadrillage, étoiles et étoiles qui scintillent.
 * Tous les détails restent à une luminance de 0,08 au plus et à un canal de 0x8F au plus : ils ne concurrencent
 * jamais un élément de jeu. `feature` est le dessin propre au décor, tracé sous les étoiles.
 */
export const DECORS = {
  'decor-starry-night': {
    base: '#0B1026',
    grid: '#151C42',
    star: '#3A4678',
    twinkle: '#404C80',
    starCount: 60,
    starSeed: 7,
    feature: null,
  },
  'decor-nebula': {
    base: '#1F1147',
    grid: '#291858',
    star: '#46397E',
    twinkle: '#50428A',
    starCount: 50,
    starSeed: 11,
    feature: { kind: 'clouds', colors: ['#3B1F6E', '#5A2A6E'] },
  },
  'decor-candy-planet': {
    base: '#2B0F3A',
    grid: '#3A1850',
    star: '#5A3478',
    twinkle: '#643C7A',
    starCount: 40,
    starSeed: 13,
    feature: { kind: 'planet', colors: ['#4A2060', '#5A3478'] },
  },
  'decor-milky-way': {
    base: '#12203F',
    grid: '#1B2D55',
    star: '#34487A',
    twinkle: '#3A4F7C',
    starCount: 60,
    starSeed: 17,
    feature: { kind: 'band', colors: ['#2C4372'] },
  },
} as const;

/** Décor par défaut « Nuit étoilée ». */
export const DEFAULT_DECOR = DECORS['decor-starry-night'];

/**
 * Étoiles qui scintillent (ENF-12) : leur nombre, la durée d'un état en millisecondes (un changement toutes les
 * 700 ms, soit moins de 3 par seconde) et la graine de leurs positions.
 */
export const TWINKLE = { count: 6, stateMs: 700, seed: 3 } as const;

/**
 * Ciel de la Constellation (RG-42) : chaque suite complétée ajoute une constellation de `stars` étoiles reliées,
 * dans la couleur des détails de décor, au plus `max` par partie. Le dessin de la n-ième ne dépend que de n.
 */
export const SKY = {
  color: '#3E4A7E',
  stars: 4,
  max: 12,
  seed: 29,
  spanCells: { columns: 4, rows: 3 },
  starRadius: 0.1,
} as const;

/** Traînées : nombre de pas pendant lesquels une case quittée par la queue garde sa trace. */
export const TRAIL = { steps: 6 } as const;

/** Part de blanc mélangée à la couleur du serpent pour les motifs et les traînées (jamais une autre couleur). */
export const NUANCE = { soft: 0.6, white: 1 } as const;

/** Couleurs du dessin des éléments de jeu. */
export const DRAW_COLORS = {
  outline: '#FFFFFF',
  eyeWhite: '#FFFFFF',
  pupil: '#0B1026',
  asteroid: '#9AA0B5',
  crater: '#4B5168',
  holeCore: '#02030A',
  /** Pictogramme blanc des bonbons spéciaux, cerné de sombre pour rester lisible sur les bonbons clairs. */
  pictogram: '#FFFFFF',
  pictogramOutline: '#0B1026',
} as const;
