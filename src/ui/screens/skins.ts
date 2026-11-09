import { SKINS, SKIN_CATEGORIES } from '../../core/rules.ts';
import type { SkinCategory, SkinId } from '../../core/rules.ts';
import { conditionProgress, defaultSkinOf, skinsOfCategory } from '../../core/skins.ts';
import type { ProgressData } from '../../core/types.ts';
import { announce } from '../announcer.ts';
import { createButton, createElement } from '../dom.ts';
import { createSkinPreview } from '../render/preview.ts';
import type { Screen } from '../router.ts';
import { TEXTS, skinConditionLabel, skinProgressLabel } from '../texts.ts';

export interface SkinsOptions {
  /** Progression courante : relue à chaque changement d'état. */
  getProgress: () => ProgressData;
  /** Un skin débloqué est choisi (ou rendu par défaut par « Retirer ») ; l'appelant l'enregistre aussitôt (RG-60). */
  onChoose: (id: SkinId) => void;
  onBack: () => void;
}

/** Un skin de l'écran : ses éléments et la remise à jour de son état. */
interface SkinRow {
  refresh: () => void;
}

const tabId = (category: SkinCategory): string => `skins-tab-${category}`;
const panelId = (category: SkinCategory): string => `skins-panel-${category}`;

/**
 * E8 Skins : quatre onglets (forme, motif, traînée, décor), une ligne par skin avec son aperçu, son nom et son état
 * écrit (« Choisi », « Débloqué », « Verrouillé »). Un skin verrouillé affiche sa condition et sa progression chiffrée ;
 * le toucher les met en évidence et les annonce sans rien choisir (RG-59, RG-60).
 */
export function createSkinsScreen(options: SkinsOptions): Screen {
  let active: SkinCategory = 'shape';
  const rows: SkinRow[] = [];
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

  const buildRow = (category: SkinCategory, id: SkinId): HTMLElement => {
    const skin = SKINS.find((candidate) => candidate.id === id);
    const condition = skin?.condition ?? { kind: 'default' as const };
    const name = TEXTS.skinNames[id];
    const state = createElement('span', { className: 'skin-state' });
    const detail = createElement('span', { className: 'skin-detail' });
    const choice = createElement(
      'button',
      { className: 'button skin-choice', attributes: { type: 'button', role: 'radio' } },
      [
        createSkinPreview(id, pixelRatio),
        createElement('span', { className: 'skin-text' }, [
          createElement('span', { className: 'skin-name', text: name }),
          state,
          detail,
        ]),
      ],
    );
    const remove = createButton(TEXTS.skins.remove, 'button skin-remove', () => {
      choose(defaultSkinOf(category));
    });

    const highlight = (): void => {
      const progress = conditionProgress(condition, options.getProgress());
      const parts = [name, skinConditionLabel(condition)];
      if (progress !== null) {
        parts.push(skinProgressLabel(condition, progress.current, progress.target));
      }
      choice.classList.add('is-highlighted');
      announce(parts.join(' : '));
    };
    choice.addEventListener('click', () => {
      const progress = options.getProgress();
      if (!progress.skins.unlocked.includes(id)) highlight();
      else if (progress.skins.selected[category] !== id) choose(id);
    });

    const refresh = (): void => {
      const progress = options.getProgress();
      const unlocked = progress.skins.unlocked.includes(id);
      const chosen = progress.skins.selected[category] === id;
      choice.setAttribute('aria-checked', String(chosen));
      if (unlocked) choice.removeAttribute('aria-disabled');
      else choice.setAttribute('aria-disabled', 'true');
      choice.classList.toggle('is-chosen', chosen);
      choice.classList.toggle('is-locked', !unlocked);
      choice.classList.remove('is-highlighted');
      const marker = createElement('span', {
        className: 'skin-marker',
        text: chosen ? '✓' : unlocked ? '' : '🔒',
        attributes: { 'aria-hidden': 'true' },
      });
      const label = chosen
        ? TEXTS.skins.chosen
        : unlocked
          ? TEXTS.skins.unlocked
          : TEXTS.skins.locked;
      state.replaceChildren(marker, createElement('span', { text: label }));
      const advance = unlocked ? null : conditionProgress(condition, progress);
      if (advance === null) {
        detail.replaceChildren();
      } else {
        detail.replaceChildren(
          createElement('span', {
            className: 'skin-condition',
            text: skinConditionLabel(condition),
          }),
          document.createTextNode(' — '),
          createElement('span', {
            className: 'skin-progress',
            text: skinProgressLabel(condition, advance.current, advance.target),
          }),
        );
      }
      // « Retirer » n'est proposé que sur le skin choisi qui n'est pas celui par défaut.
      remove.hidden = !(chosen && id !== defaultSkinOf(category));
    };
    rows.push({ refresh });
    return createElement('div', { className: 'skin-row' }, [choice, remove]);
  };

  const panels = SKIN_CATEGORIES.map((category) =>
    createElement(
      'div',
      {
        className: 'skins-panel',
        attributes: { role: 'tabpanel', id: panelId(category), 'aria-labelledby': tabId(category) },
      },
      [
        createElement(
          'div',
          {
            className: 'skin-list',
            attributes: { role: 'radiogroup', 'aria-labelledby': tabId(category) },
          },
          skinsOfCategory(category).map((skin) => buildRow(category, skin.id)),
        ),
      ],
    ),
  );

  const tabs = SKIN_CATEGORIES.map((category) => {
    const tab = createElement('button', {
      className: 'button skins-tab',
      text: TEXTS.skins.categories[category],
      attributes: {
        type: 'button',
        role: 'tab',
        id: tabId(category),
        'aria-controls': panelId(category),
        'aria-selected': 'false',
      },
    });
    tab.addEventListener('click', () => select(category));
    return tab;
  });

  function select(category: SkinCategory, focus = false): void {
    active = category;
    SKIN_CATEGORIES.forEach((candidate, index) => {
      const selected = candidate === category;
      const tab = tabs[index];
      if (tab === undefined) return;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      tab.classList.toggle('is-selected', selected);
      const panel = panels[index];
      if (panel !== undefined) panel.hidden = !selected;
      if (selected && focus) tab.focus();
    });
  }

  const tablist = createElement(
    'div',
    { className: 'skins-tabs', attributes: { role: 'tablist' } },
    tabs,
  );
  // Flèches du clavier dans les onglets : le voisin est sélectionné et reçoit le focus, en boucle.
  tablist.addEventListener('keydown', (event) => {
    const offset = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (offset === 0) return;
    event.preventDefault();
    const index = SKIN_CATEGORIES.indexOf(active);
    const next =
      SKIN_CATEGORIES[(index + offset + SKIN_CATEGORIES.length) % SKIN_CATEGORIES.length];
    if (next !== undefined) select(next, true);
  });

  /** L'état de chaque ligne suit la progression ; le focus reste là où il est. */
  function refreshAll(): void {
    rows.forEach((row) => row.refresh());
  }
  function choose(id: SkinId): void {
    options.onChoose(id);
    refreshAll();
  }

  const back = createButton(TEXTS.navigation.back, 'button button-back', options.onBack);
  const element = createElement('main', { className: 'screen skins' }, [
    createElement('header', { className: 'screen-header' }, [
      back,
      createElement('h1', { className: 'screen-title', text: TEXTS.skins.title }),
      tablist,
    ]),
    ...panels,
  ]);
  select(active);
  refreshAll();
  return {
    element,
    start() {
      back.focus();
    },
    onEscape: options.onBack,
  };
}
