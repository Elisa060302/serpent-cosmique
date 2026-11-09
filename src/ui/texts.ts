/** Tous les textes affichés par le jeu, en français. */
import { formatDate, formatNumber } from '../core/format.ts';
import { LIMITS } from '../core/rules.ts';
import type { ModeId, SkinCategory, SkinCondition, SkinId, SpecialType } from '../core/rules.ts';
import type { CandyColorId } from '../core/types.ts';

export const TEXTS = {
  appName: 'Serpent Cosmique',
  menu: {
    play: 'Jouer',
    records: 'Records',
    skins: 'Skins',
    settings: 'Réglages',
    save: 'Sauvegarde',
    updateMarker: 'Mise à jour',
    installPrompt: 'Pour jouer hors ligne, installez le jeu.',
    installButton: 'Installer le jeu',
  },
  navigation: {
    back: '‹ Retour',
  },
  modeNames: {
    classic: 'Classique',
    'time-attack': 'Contre la montre',
    asteroids: "Champ d'astéroïdes",
    'black-hole': 'Trou noir',
    'bonus-traps': 'Bonus et pièges',
    zen: 'Zen',
    constellation: 'Constellation',
  } satisfies Record<ModeId, string>,
  skinNames: {
    'shape-rings': 'Anneaux',
    'shape-comet': 'Comète',
    'shape-rocket': 'Fusée',
    'shape-saucer': 'Soucoupe',
    'pattern-plain': 'Uni',
    'pattern-dots': 'Pois de sucre',
    'pattern-stars': 'Étoiles',
    'pattern-candy-cane': "Sucre d'orge",
    'trail-none': 'Aucune',
    'trail-stardust': "Poussière d'étoiles",
    'trail-sugar': 'Sillage de sucre',
    'trail-aurora': 'Aurore',
    'decor-starry-night': 'Nuit étoilée',
    'decor-nebula': 'Nébuleuse',
    'decor-candy-planet': 'Planète bonbon',
    'decor-milky-way': 'Voie lactée',
  } satisfies Record<SkinId, string>,
  skins: {
    title: 'Skins',
    categories: {
      shape: 'Forme',
      pattern: 'Motif',
      trail: 'Traînée',
      decor: 'Décor',
    } satisfies Record<SkinCategory, string>,
    chosen: 'Choisi',
    unlocked: 'Débloqué',
    locked: 'Verrouillé',
    remove: 'Retirer',
  },
  modes: {
    title: 'Choisissez un mode',
    mystery: 'Mode mystère',
    rules: {
      classic:
        'Mangez les bonbons pour grandir. Le serpent accélère peu à peu : ne touchez ni les bords ni votre queue.',
      'time-attack':
        'Mangez un maximum de bonbons en 60 secondes. Attention aux bords et à votre queue !',
      asteroids:
        'Un nouvel astéroïde apparaît tous les 5 bonbons. Évitez-les, ainsi que les bords et votre queue.',
      'black-hole':
        'Entrez dans un trou noir pour ressortir par son jumeau. Ne touchez ni les bords ni votre queue.',
      'bonus-traps':
        'Des bonbons spéciaux ralentissent, accélèrent, rétrécissent le serpent ou inversent les commandes pendant quelques secondes. Ne touchez ni les bords ni votre queue.',
      zen: 'Impossible de perdre : traversez les bords et votre propre corps. Quittez quand vous voulez avec le bouton pause.',
      constellation:
        "Mangez les bonbons dans l'ordre des couleurs indiqué pour tracer une constellation et gagner 5 points de bonus. Ne touchez ni les bords ni votre queue.",
    } satisfies Record<ModeId, string>,
  },
  colorNames: {
    pink: 'rose',
    purple: 'violet',
    'light-pink': 'rose clair',
    'light-blue': 'bleu clair',
  } satisfies Record<CandyColorId, string>,
  effectNames: {
    slow: 'Ralenti',
    turbo: 'Turbo',
    shrink: 'Rétrécissement',
    invert: 'Inversion',
  } satisfies Record<SpecialType, string>,
  game: {
    areaLabel: 'Aire de jeu',
    score: 'Score',
    constellationLabel: 'Constellation à tracer',
    pause: 'Pause',
    pauseSymbol: 'II',
    countdownSwipe: 'Glissez le doigt pour diriger le serpent',
    countdownArrows: 'Utilisez les flèches pour diriger le serpent',
    countdownResume: 'Reprise de la partie',
    arrows: {
      up: 'Haut',
      down: 'Bas',
      left: 'Gauche',
      right: 'Droite',
    },
  },
  pause: {
    title: 'Pause',
    automatic: 'Partie mise en pause',
    resume: 'Reprendre',
    abandon: 'Abandonner',
    confirmTitle: 'Abandonner la partie ?',
    no: 'Non',
    yes: 'Oui',
  },
  end: {
    collision: 'Collision',
    time: 'Temps écoulé',
    victory: "Victoire ! L'aire de jeu est pleine.",
    abandon: 'Partie abandonnée',
    score: 'Score',
    replay: 'Rejouer',
    menu: 'Menu',
    newRecord: 'Nouveau record !',
    nameLabel: 'Votre nom',
    nameReminder: 'Touchez « Valider » pour enregistrer ce nom.',
    nameLimit: `${LIMITS.nameMaxGraphemes} caractères au maximum`,
    validate: 'Valider',
  },
  settings: {
    title: 'Réglages',
    control: 'Commande',
    swipe: 'Glissement',
    swipeHelp: "Glissez le doigt sur l'écran.",
    arrows: 'Flèches',
    arrowsHelp: "Quatre flèches à l'écran. Avec les flèches, la grille est un peu plus petite.",
    nextGame: "Le changement s'applique à la prochaine partie.",
    sounds: 'Sons',
    effects: 'Bruitages',
    music: 'Musique',
    vibrations: 'Vibrations',
    effectsState: { on: 'Activés', off: 'Coupés' },
    musicState: { on: 'Activée', off: 'Coupée' },
    vibrationsState: { on: 'Activées', off: 'Coupées' },
    vibrationsUnavailable: 'Non disponible sur ce téléphone',
    about: 'À propos',
  },
  about: {
    title: 'À propos',
    copyright: '© CocoClaudo',
    offlineReady: 'Prêt à jouer hors ligne',
    offlinePreparing: 'Préparation du mode hors ligne… Restez connecté.',
    offlineUnavailable: 'Hors ligne non disponible : ouvrez le jeu une fois avec une connexion.',
    updateTitle: 'Mise à jour',
    upToDate: 'Vous avez la dernière version connue.',
    upToDateHelp:
      'Le jeu cherche une nouvelle version à son ouverture, quand le téléphone est connecté. Pour chercher maintenant : connectez le téléphone, fermez complètement le jeu, puis rouvrez-le.',
    install: 'Installer',
    progressKept: 'Votre progression est conservée.',
    installing: 'Installation en cours… Ne fermez pas le jeu.',
    failed:
      "La mise à jour n'a pas pu être installée. Votre version actuelle reste disponible. Réessayez avec une connexion. (E-06)",
    retry: 'Réessayer',
    backupAdvice: "Conseil : créez d'abord une sauvegarde.",
    backupLink: 'Créer une sauvegarde',
  },
  save: {
    title: 'Sauvegarde',
    create: 'Créer une sauvegarde',
    createHelp: 'Enregistre vos records, skins et réglages dans un fichier.',
    iphoneHelp: "Dans la fenêtre qui s'ouvre, choisissez « Enregistrer dans Fichiers ».",
    restore: 'Restaurer une sauvegarde',
    restoreHelp:
      'Choisissez un fichier créé par ce jeu. Il sera fusionné avec la progression actuelle.',
    trustWarning: 'Ne restaurez que des fichiers que vous avez créés vous-même.',
    confirmQuestion: 'Fusionner avec la progression de ce téléphone ?',
    confirmHelp:
      'Vos records et skins actuels sont conservés. Les réglages et skins choisis du fichier remplaceront les vôtres.',
    merge: 'Fusionner',
    cancel: 'Annuler',
    invalidFile:
      "Ce fichier n'est pas une sauvegarde valide de Serpent Cosmique. Rien n'a été modifié. (E-01)",
    newerFile:
      "Cette sauvegarde vient d'une version plus récente du jeu. Installez la dernière version puis réessayez. Rien n'a été modifié. (E-02)",
    noSpace:
      "Espace de stockage insuffisant : la sauvegarde n'a pas été créée. Libérez de la place et réessayez. Votre progression est intacte. (E-03)",
    notWritten:
      "La sauvegarde n'a pas pu être écrite à cet endroit. Votre progression est intacte. (E-04)",
    notRestored:
      "La restauration n'a pas pu être enregistrée. Votre progression n'a pas changé. (E-07)",
  },
  installHelp: {
    title: 'Installer le jeu',
    intro: 'Jouez sans connexion, comme avec une application.',
    promptButton: 'Installer le jeu',
    android: 'Sur Android',
    iphone: 'Sur iPhone',
    androidSteps: [
      'Touchez ⋮ en haut à droite du navigateur.',
      "Touchez « Installer l'application ».",
      "Ouvrez le jeu depuis son icône, avec une connexion, jusqu'à « Prêt à jouer hors ligne ».",
    ],
    iphoneSteps: [
      'Touchez Partager (carré avec une flèche vers le haut). Introuvable ? Tenez un instant le téléphone à la verticale.',
      "Touchez « Sur l'écran d'accueil ».",
      'Touchez « Ajouter », puis ouvrez le jeu depuis son icône avec une connexion.',
    ],
    iphoneReminder:
      "Ce premier lancement avec une connexion est indispensable : c'est lui qui prépare le jeu pour fonctionner sans réseau.",
    otherPhone: 'Autre téléphone',
    installed: "Jeu installé. Ouvrez-le depuis son icône sur l'écran d'accueil.",
  },
  records: {
    title: 'Records',
    previousMode: 'Mode précédent',
    nextMode: 'Mode suivant',
    empty: "Aucun record pour l'instant",
  },
  notices: {
    offlineReady: 'Prêt à jouer hors ligne',
    interruptedTitle: 'Partie interrompue',
    continue: 'Continuer',
    understood: 'Compris',
    progressUnreadable:
      "Votre progression n'a pas pu être lue. Vous pouvez restaurer une sauvegarde depuis le menu Sauvegarde. (E-05)",
    progressNotSaved:
      "La progression n'a pas pu être enregistrée sur ce téléphone. Libérez de l'espace puis rejouez : elle sera réenregistrée. (E-08)",
  },
  rotate: "Tournez votre téléphone à l'horizontale",
  frameRefused:
    'Serpent Cosmique ne peut pas s’afficher dans un cadre. Ouvrez-le directement dans votre navigateur.',
} as const;

/** « 0 point », « 1 point », « 2 points » : le pluriel français commence à 2. */
export function pointsLabel(points: number): string {
  return `${points} ${points >= 2 ? 'points' : 'point'}`;
}

/** Message de confirmation d'abandon (RG-74). */
export function abandonMessage(score: number): string {
  return `Votre score de ${pointsLabel(score)} sera conservé.`;
}

/** « Nouveau skin débloqué : Comète » (RG-58). */
export function skinUnlockedMessage(id: SkinId): string {
  return `Nouveau skin débloqué : ${TEXTS.skinNames[id]}`;
}

/** Ligne d'aide du champ du nom : le nom réellement enregistré (RG-53). */
export function nameHintMessage(name: string): string {
  return `Nom enregistré : ${name}. Touchez le champ pour en saisir un autre.`;
}

/** « Nom enregistré : Léa » après « Valider » (RG-53). */
export function nameSavedMessage(name: string): string {
  return `Nom enregistré : ${name}`;
}

/** Compteur du champ du nom : « 4/12 ». */
export function nameCounter(count: number): string {
  return `${count}/${LIMITS.nameMaxGraphemes}`;
}

/** Message affiché sur le menu après une mise à jour réussie (RG-90). */
export function updatedMessage(version: string): string {
  return `Serpent Cosmique a été mis à jour en version ${version}. Votre progression est conservée.`;
}

/** Proposition de mise à jour de « À propos » (RG-89). */
export function newVersionMessage(version: string): string {
  return `Nouvelle version ${version} disponible.`;
}

/** « 1 record », « 12 records » : le pluriel français commence à 2. */
function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count >= 2 ? plural : singular}`;
}

/** « 12 records, 7 skins débloqués » (résumé et message de fin de restauration, RG-71). */
export function backupCountsLabel(records: number, skins: number): string {
  return `${countLabel(records, 'record', 'records')}, ${countLabel(skins, 'skin débloqué', 'skins débloqués')}`;
}

/** « Sauvegarde créée : <nom du fichier> » (RG-68). */
export function backupCreatedMessage(fileName: string): string {
  return `Sauvegarde créée : ${fileName}`;
}

/** « Sauvegarde du 01/11/2026 à 14:30 », à partir de l'heure locale `AAAA-MM-JJTHH:MM:SS` du fichier. */
export function backupDateLabel(dateTime: string): string {
  return `Sauvegarde du ${formatDate(dateTime)} à ${dateTime.slice(11, 16)}`;
}

/** « Restauration terminée : N records, M skins débloqués. » (totaux après fusion, RG-71). */
export function restoredMessage(records: number, skins: number): string {
  return `Restauration terminée : ${backupCountsLabel(records, skins)}.`;
}

/** Message de la partie interrompue par la fermeture du jeu (RG-79). */
export function interruptedMessage(modeId: ModeId, score: number): string {
  return `Votre dernière partie (${TEXTS.modeNames[modeId]}, ${pointsLabel(score)}) a été interrompue ; elle a été enregistrée.`;
}

/** « Temps 35 s » (bandeau de Contre la montre, RG-29). */
export function timeLabel(seconds: number): string {
  return `Temps ${seconds} s`;
}

/** « Effet : Inversion 5 s » (RG-37) ; sans durée, l'annonce brève d'un effet immédiat : « Rétrécissement ». */
export function effectLabel(type: SpecialType, seconds: number | null): string {
  const name = TEXTS.effectNames[type];
  return seconds === null ? name : `Effet : ${name} ${seconds} s`;
}

/** « Prochain : violet » (RG-41). */
export function nextColorLabel(color: CandyColorId): string {
  return `Prochain : ${TEXTS.colorNames[color]}`;
}

/** « Constellation à tracer : rose, violet, bleu clair » : la suite, pour les lecteurs d'écran. */
export function sequenceLabel(sequence: readonly CandyColorId[]): string {
  return `${TEXTS.game.constellationLabel} : ${sequence.map((color) => TEXTS.colorNames[color]).join(', ')}`;
}

/** « Jouez encore 2 parties pour le découvrir » ; au singulier : « Jouez encore 1 partie… » (RG-40). */
export function lockedModeMessage(gamesLeft: number): string {
  return `Jouez encore ${gamesLeft} ${gamesLeft >= 2 ? 'parties' : 'partie'} pour le découvrir`;
}

/** « Nouveau mode découvert : Constellation » (RG-40, RG-79). */
export function modeDiscoveredMessage(): string {
  return `Nouveau mode découvert : ${TEXTS.modeNames.constellation}`;
}

/** « Skin choisi : Comète. Il sera utilisé à la prochaine partie. » (RG-60). */
export function skinChosenMessage(id: SkinId): string {
  return `Skin choisi : ${TEXTS.skinNames[id]}. Il sera utilisé à la prochaine partie.`;
}

/** Condition de déblocage d'un skin verrouillé (RG-54, RG-59) : « 250 bonbons mangés au total ». */
export function skinConditionLabel(condition: SkinCondition): string {
  switch (condition.kind) {
    case 'default':
      return '';
    case 'total-candies':
      return `${formatNumber(condition.count)} bonbons mangés au total`;
    case 'score':
      return `Atteindre ${pointsLabel(condition.points)} dans une partie ${TEXTS.modeNames[condition.mode]}`;
    case 'all-modes':
      return 'Avoir terminé au moins une partie dans chacun des 7 modes';
  }
}

/** Progression chiffrée d'un skin verrouillé (RG-59) : « 63 / 250 bonbons », « meilleur score : 9 / 15 ». */
export function skinProgressLabel(
  condition: SkinCondition,
  current: number,
  target: number,
): string {
  const numbers = `${formatNumber(current)} / ${formatNumber(target)}`;
  switch (condition.kind) {
    case 'default':
      return '';
    case 'total-candies':
      return `${numbers} bonbons`;
    case 'score':
      return `meilleur score : ${numbers}`;
    case 'all-modes':
      return `${numbers} modes`;
  }
}
