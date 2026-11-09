import { formatDate, formatNumber } from '../../core/format.ts';
import type { ModeId } from '../../core/rules.ts';
import type { ProgressData } from '../../core/types.ts';
import { announce } from '../announcer.ts';
import { createButton, createElement } from '../dom.ts';
import type { Screen } from '../router.ts';
import { TEXTS } from '../texts.ts';

export interface RecordsOptions {
  records: ProgressData['records'];
  /** Modes proposés, dans l'ordre de la liste : « ‹ » et « › » les parcourent en boucle. */
  modes: readonly ModeId[];
  onBack: () => void;
}

function arrowButton(glyph: string, name: string, onActivate: () => void): HTMLButtonElement {
  const button = createElement('button', {
    className: 'button button-icon',
    text: glyph,
    attributes: { type: 'button', 'aria-label': name },
  });
  button.addEventListener('click', onActivate);
  return button;
}

/** E7 Records : le tableau des 10 meilleurs scores du mode choisi (EF-17). */
export function createRecordsScreen(options: RecordsOptions): Screen {
  let index = 0;
  const modeTitle = createElement('h2', { className: 'records-mode' });
  const board = createElement('div', { className: 'records-board' });

  function render(announceMode: boolean): void {
    const mode = options.modes[index];
    if (mode === undefined) return;
    modeTitle.textContent = TEXTS.modeNames[mode];
    const table = options.records[mode];
    if (table.length === 0) {
      board.replaceChildren(
        createElement('p', { className: 'records-empty', text: TEXTS.records.empty }),
      );
    } else {
      // Les noms sont du texte brut (RG-52) : `textContent`, jamais du HTML.
      const rows = table.map((record, position) =>
        createElement('li', { className: 'records-row' }, [
          createElement('span', { className: 'record-rank', text: `${position + 1}.` }),
          createElement('span', { className: 'record-name', text: record.name }),
          createElement('span', { className: 'record-score', text: formatNumber(record.score) }),
          createElement('span', { className: 'record-date', text: formatDate(record.dateTime) }),
        ]),
      );
      board.replaceChildren(
        createElement('ol', { className: 'records-list', attributes: { role: 'list' } }, rows),
      );
    }
    if (announceMode) announce(TEXTS.modeNames[mode]);
  }

  const step = (delta: number): void => {
    index = (index + delta + options.modes.length) % options.modes.length;
    render(true);
  };
  const back = createButton(TEXTS.navigation.back, 'button button-back', options.onBack);
  const element = createElement('main', { className: 'screen' }, [
    createElement('h1', { className: 'sr-only', text: TEXTS.records.title }),
    createElement('header', { className: 'screen-header' }, [
      back,
      arrowButton('‹', TEXTS.records.previousMode, () => step(-1)),
      modeTitle,
      arrowButton('›', TEXTS.records.nextMode, () => step(1)),
    ]),
    board,
  ]);
  render(false);
  return {
    element,
    start() {
      back.focus();
    },
    onEscape: options.onBack,
  };
}
