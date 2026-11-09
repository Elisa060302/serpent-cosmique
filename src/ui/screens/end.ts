import { formatNumber, rankLabel } from '../../core/format.ts';
import { cleanName, sanitizeTyping } from '../../core/records.ts';
import { LIMITS } from '../../core/rules.ts';
import type { SkinId } from '../../core/rules.ts';
import type { EndReason } from '../../core/types.ts';
import { splitGraphemes, stripForbiddenCharacters } from '../../core/validation.ts';
import { announce } from '../announcer.ts';
import { createButton, createElement } from '../dom.ts';
import type { Screen } from '../router.ts';
import {
  TEXTS,
  nameCounter,
  nameHintMessage,
  modeDiscoveredMessage,
  nameSavedMessage,
  skinUnlockedMessage,
} from '../texts.ts';
import { showToast } from '../toast.ts';

/** Record créé par la partie : déjà enregistré (RG-53), le joueur peut seulement changer le nom. */
export interface EndRecord {
  rank: number;
  /** Nom proposé dans le champ : le dernier nom enregistré. */
  prefill: string;
  /** Nom sous lequel le record est enregistré (« Joueur » au tout premier record). */
  savedName: string;
  /** Enregistre le nom validé et renvoie le nom retenu. */
  onSubmitName: (name: string) => Promise<string>;
}

export interface EndOptions {
  modeName: string;
  reason: EndReason;
  score: number;
  record: EndRecord | null;
  newSkins: readonly SkinId[];
  /** Vrai si cette partie découvre le mode surprise (RG-40). */
  newMode: boolean;
  onReplay: () => void;
  onMenu: () => void;
}

/** E6 Fin de partie : raison, score, record et saisie du nom, déblocages, puis « Rejouer » et « Menu ». */
export function createEndScreen(options: EndOptions): Screen {
  const reason = TEXTS.end[options.reason];
  const replay = createButton(TEXTS.end.replay, 'button button-primary', options.onReplay);
  const menu = createButton(TEXTS.end.menu, 'button', options.onMenu);

  const result: Node[] = [
    createElement('h1', { className: 'screen-title', text: options.modeName }),
    createElement('p', { className: 'end-reason', text: reason }),
    createElement('p', {
      className: 'end-score',
      text: `${TEXTS.end.score} ${formatNumber(options.score)}`,
    }),
  ];
  if (options.record !== null) {
    // L'étoile accompagne le texte et le rang : la couleur ne porte aucune information.
    result.push(
      createElement('p', { className: 'end-record' }, [
        createElement('span', { text: '★ ', attributes: { 'aria-hidden': 'true' } }),
        createElement('span', {
          text: `${TEXTS.end.newRecord} (${rankLabel(options.record.rank)})`,
        }),
      ]),
    );
  }
  // Les déblocages : un skin par ligne, puis le mode surprise (RG-58, RG-40).
  const unlocks = [
    ...options.newSkins.map(skinUnlockedMessage),
    ...(options.newMode ? [modeDiscoveredMessage()] : []),
  ];
  if (unlocks.length > 0) {
    result.push(
      createElement(
        'ul',
        { className: 'end-unlocks', attributes: { role: 'list' } },
        unlocks.map((text) => createElement('li', { text })),
      ),
    );
  }

  const side: Node[] = [];
  if (options.record !== null) side.push(createNameBlock(options.record, replay));
  side.push(createElement('div', { className: 'end-actions' }, [replay, menu]));

  const element = createElement('main', { className: 'end' }, [
    createElement('section', { className: 'end-result' }, result),
    createElement('section', { className: 'end-side' }, side),
  ]);
  return {
    element,
    start() {
      announce(`${reason} ${TEXTS.end.score} ${options.score}. ${unlocks.join('. ')}`.trim());
      // Pas de focus sur le champ du nom : le clavier du téléphone ne doit pas s'ouvrir tout seul (HYP-36).
      replay.focus();
    },
  };
}

/** Champ « Votre nom » prérempli, compteur, « Valider » ; devient « Nom enregistré : <nom> » une fois validé. */
function createNameBlock(record: EndRecord, replay: HTMLButtonElement): HTMLElement {
  const input = createElement('input', {
    className: 'name-input',
    attributes: { type: 'text', 'aria-describedby': 'name-hint name-reminder name-counter' },
  });
  input.enterKeyHint = 'done';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.value = sanitizeTyping(record.prefill);
  const counter = createElement('span', {
    className: 'name-counter',
    attributes: { id: 'name-counter' },
  });
  // Le rappel apparaît dès que le champ diffère du nom enregistré : seul « Valider » le remplace (RG-53).
  const reminder = createElement('p', {
    className: 'name-reminder',
    text: TEXTS.end.nameReminder,
    attributes: { id: 'name-reminder' },
  });
  const updateCounter = (): void => {
    counter.textContent = nameCounter(splitGraphemes(input.value).length);
    reminder.hidden = cleanName(input.value) === record.savedName;
  };
  updateCounter();

  // La saisie retire les caractères interdits et refuse le 13e caractère (RG-51). Pendant une composition
  // (clavier à prédiction), le texte n'est contrôlé qu'à la fin pour ne pas casser la saisie en cours.
  const control = (): void => {
    const typed = input.value;
    const tooLong =
      splitGraphemes(stripForbiddenCharacters(typed)).length > LIMITS.nameMaxGraphemes;
    const clean = sanitizeTyping(typed);
    if (clean !== typed) input.value = clean;
    if (tooLong) showToast(TEXTS.end.nameLimit);
    updateCounter();
  };
  input.addEventListener('input', (event) => {
    if (!(event instanceof InputEvent) || !event.isComposing) control();
  });
  input.addEventListener('compositionend', control);

  const validate = createButton(TEXTS.end.validate, 'button', () => {
    validate.disabled = true;
    void record.onSubmitName(input.value).then((name) => {
      block.replaceChildren(
        createElement('p', { className: 'name-saved', text: nameSavedMessage(name) }),
      );
      announce(nameSavedMessage(name));
      replay.focus();
    });
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      validate.click();
    }
  });

  const block: HTMLElement = createElement('div', { className: 'name-block' }, [
    createElement('label', { className: 'name-field' }, [
      createElement('span', { className: 'name-label', text: TEXTS.end.nameLabel }),
      input,
    ]),
    createElement('div', { className: 'name-hint' }, [
      createElement('div', {}, [
        createElement('p', {
          text: nameHintMessage(record.savedName),
          attributes: { id: 'name-hint' },
        }),
        reminder,
      ]),
      counter,
    ]),
    validate,
  ]);
  return block;
}
