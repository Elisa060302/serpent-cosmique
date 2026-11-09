import { MODE_IDS, SKINS, SKIN_CATEGORIES } from './rules.ts';
import type { ModeId, SkinCategory, SkinCondition, SkinId } from './rules.ts';
import type { ProgressData } from './types.ts';

export type SkinsProgress = ProgressData['skins'];

/** Les identifiants donnés, dans l'ordre du catalogue et sans doublon : l'ordre canonique des listes de skins. */
export function inCatalogueOrder(ids: readonly string[]): SkinId[] {
  return SKINS.filter((skin) => ids.includes(skin.id)).map((skin) => skin.id);
}

/** Skins du premier lancement : les quatre par défaut, débloqués et choisis (RG-54). */
export function defaultSkins(): SkinsProgress {
  const defaults = SKINS.filter((skin) => skin.condition.kind === 'default');
  const pick = (category: (typeof SKIN_CATEGORIES)[number]): SkinId => {
    const skin = defaults.find((candidate) => candidate.category === category);
    if (skin === undefined) throw new Error(`Aucun skin par défaut pour la catégorie ${category}.`);
    return skin.id;
  };
  return {
    unlocked: defaults.map((skin) => skin.id),
    selected: {
      shape: pick('shape'),
      pattern: pick('pattern'),
      trail: pick('trail'),
      decor: pick('decor'),
    },
  };
}

interface Counters {
  totalCandies: number;
  gamesByMode: Record<ModeId, number>;
}

function isMet(
  condition: SkinCondition,
  counters: Counters,
  game: { mode: ModeId; score: number },
) {
  switch (condition.kind) {
    case 'default':
      return true;
    case 'score':
      return game.mode === condition.mode && game.score >= condition.points;
    case 'total-candies':
      return counters.totalCandies >= condition.count;
    case 'all-modes':
      return MODE_IDS.every((mode) => counters.gamesByMode[mode] > 0);
  }
}

/**
 * Skins que la partie qui vient de se terminer débloque (RG-56), dans l'ordre du catalogue.
 * Les compteurs sont ceux d'après la partie ; un skin déjà débloqué n'est jamais rendu une seconde fois (RG-57).
 */
export function evaluateUnlocks(
  unlocked: readonly string[],
  counters: Counters,
  game: { mode: ModeId; score: number },
): SkinId[] {
  return SKINS.filter(
    (skin) => !unlocked.includes(skin.id) && isMet(skin.condition, counters, game),
  ).map((skin) => skin.id);
}

/** Les skins d'une catégorie, dans l'ordre du catalogue (le premier est celui par défaut). */
export function skinsOfCategory(category: SkinCategory): (typeof SKINS)[number][] {
  return SKINS.filter((skin) => skin.category === category);
}

/** Skin par défaut d'une catégorie : celui que « Retirer » rend (RG-60). */
export function defaultSkinOf(category: SkinCategory): SkinId {
  const skin = SKINS.find(
    (candidate) => candidate.category === category && candidate.condition.kind === 'default',
  );
  if (skin === undefined) throw new Error(`Aucun skin par défaut pour la catégorie ${category}.`);
  return skin.id;
}

/**
 * Choix d'un skin (RG-60) : seul un skin débloqué peut être choisi, un par catégorie. Un skin verrouillé ou inconnu
 * laisse le choix inchangé. Les skins débloqués ne changent jamais (RG-57).
 */
export function withSelectedSkin(skins: SkinsProgress, id: string): SkinsProgress {
  const skin = SKINS.find((candidate) => candidate.id === id);
  if (skin === undefined || !skins.unlocked.includes(skin.id)) return skins;
  return {
    unlocked: [...skins.unlocked],
    selected: { ...skins.selected, [skin.category]: skin.id },
  };
}

/** Avancement vers une condition de déblocage : `current` sur `target`, dans l'unité de la condition. */
export interface ConditionProgress {
  current: number;
  target: number;
}

/**
 * Avancement chiffré d'une condition (RG-59), jamais au-delà de la cible : bonbons mangés au total, meilleur score
 * du mode (le premier du tableau des records) ou nombre de modes dont une partie est terminée. `null` pour un skin
 * débloqué d'office.
 */
export function conditionProgress(
  condition: SkinCondition,
  progress: Pick<ProgressData, 'records' | 'counters'>,
): ConditionProgress | null {
  switch (condition.kind) {
    case 'default':
      return null;
    case 'score': {
      const best = progress.records[condition.mode].reduce(
        (top, record) => Math.max(top, record.score),
        0,
      );
      return { current: Math.min(best, condition.points), target: condition.points };
    }
    case 'total-candies':
      return {
        current: Math.min(progress.counters.totalCandies, condition.count),
        target: condition.count,
      };
    case 'all-modes':
      return {
        current: MODE_IDS.filter((mode) => progress.counters.gamesByMode[mode] > 0).length,
        target: MODE_IDS.length,
      };
  }
}
