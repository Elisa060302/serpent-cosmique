import { countRecords } from '../../core/merge.ts';
import type { ProgressData } from '../../core/types.ts';
import type { WriteOutcome } from '../../platform/save-io.ts';
import { createButton, createElement } from '../dom.ts';
import type { Screen } from '../router.ts';
import {
  TEXTS,
  backupCountsLabel,
  backupCreatedMessage,
  backupDateLabel,
  restoredMessage,
} from '../texts.ts';
import { showToast } from '../toast.ts';

/** Ce que le contrôle du fichier choisi a donné (RG-72). */
export type RestoreCheck =
  | { status: 'invalid' }
  | { status: 'newer' }
  | { status: 'ready'; createdAt: string; incoming: ProgressData };

/** Issue de la fusion enregistrée (RG-73) : les totaux sont ceux de la progression après fusion. */
export type RestoreResult =
  { status: 'saved'; records: number; skins: number } | { status: 'failed' };

export interface SaveScreenOptions {
  /** Sur iPhone, une ligne d'aide guide vers « Enregistrer dans Fichiers ». */
  iphone: boolean;
  onBack: () => void;
  /** Crée et écrit le fichier de sauvegarde ; ne modifie jamais la progression. */
  onCreate: () => Promise<WriteOutcome>;
  /** Contrôle le fichier choisi ; ne modifie rien. */
  onCheckFile: (file: File) => Promise<RestoreCheck>;
  /** Fusionne le contenu du fichier contrôlé et l'enregistre en une seule écriture. */
  onMerge: (incoming: ProgressData) => Promise<RestoreResult>;
}

/**
 * E11 Sauvegarde : créer un fichier, ou en restaurer un par fusion après un résumé et une confirmation.
 * Les erreurs restent affichées dans une boîte de dialogue jusqu'à l'action du joueur (05 § 4.11).
 */
export function createSaveScreen(options: SaveScreenOptions): Screen {
  const back = createButton(TEXTS.navigation.back, 'button button-back', options.onBack);
  const create = createButton(TEXTS.save.create, 'button', () => void createBackup());
  const restore = createButton(TEXTS.save.restore, 'button', () => picker.click());
  // Le sélecteur du système s'ouvre depuis ce champ, qui reste caché : « Restaurer » en est le seul accès.
  const picker = createElement('input', {
    attributes: { type: 'file', accept: '.json,application/json' },
  });
  picker.hidden = true;

  const rows: Node[] = [
    createElement('div', { className: 'save-row' }, [
      create,
      createElement('p', { text: TEXTS.save.createHelp }),
    ]),
  ];
  if (options.iphone) {
    rows.push(createElement('p', { className: 'save-note', text: TEXTS.save.iphoneHelp }));
  }
  rows.push(
    createElement('div', { className: 'save-row' }, [
      restore,
      createElement('p', { text: TEXTS.save.restoreHelp }),
    ]),
    createElement('p', { className: 'save-note', text: TEXTS.save.trustWarning }),
  );
  const content = createElement('div', { className: 'screen save-content' }, [
    createElement('header', { className: 'screen-header' }, [
      back,
      createElement('h1', { className: 'screen-title', text: TEXTS.save.title }),
    ]),
    createElement('section', { className: 'save-actions' }, rows),
    picker,
  ]);
  const overlay = createElement('div', { className: 'overlay save-overlay' });
  overlay.hidden = true;

  let disposed = false;
  let creating = false;
  let merging = false;
  let dismiss: (() => void) | null = null;
  let opener: HTMLElement | null = null;

  const close = (): void => {
    overlay.hidden = true;
    overlay.replaceChildren();
    content.inert = false;
    dismiss = null;
    if (!disposed) (opener ?? create).focus();
  };

  /** Boîte de dialogue modale : le reste de l'écran est inerte et le focus reste dans la boîte. */
  const open = (
    dialog: HTMLElement,
    focused: HTMLElement,
    onDismiss: () => void,
    from: HTMLElement,
  ): void => {
    opener = from;
    dismiss = onDismiss;
    overlay.replaceChildren(dialog);
    overlay.hidden = false;
    content.inert = true;
    focused.focus();
  };

  const dialogOf = (labelId: string, describedId: string, children: Node[]): HTMLElement =>
    createElement(
      'div',
      {
        className: 'dialog',
        attributes: {
          role: 'dialog',
          'aria-modal': 'true',
          'aria-labelledby': labelId,
          'aria-describedby': describedId,
        },
      },
      children,
    );

  /** Erreur durable : le message dit ce qui est intact et ce qu'il faut faire, avec son code. */
  const showError = (
    message: string,
    label: string,
    from: HTMLElement,
    onAction: () => void = () => undefined,
  ): void => {
    const action = createButton(label, 'button button-primary', () => {
      close();
      onAction();
    });
    open(
      dialogOf('save-message', 'save-message', [
        // Icône « ! », texte et code : la couleur ne porte jamais l'erreur seule (05 § 6).
        createElement(
          'p',
          { className: 'about-error', attributes: { id: 'save-message', role: 'alert' } },
          [
            createElement('span', {
              className: 'toast-icon',
              text: '!',
              attributes: { 'aria-hidden': 'true' },
            }),
            createElement('span', { text: message }),
          ],
        ),
        action,
      ]),
      action,
      close,
      from,
    );
  };

  async function createBackup(): Promise<void> {
    if (creating) return;
    creating = true;
    let outcome: WriteOutcome;
    try {
      outcome = await options.onCreate();
    } finally {
      creating = false;
    }
    if (disposed) return;
    if (outcome.status === 'saved') showToast(backupCreatedMessage(outcome.fileName));
    else if (outcome.status === 'no-space') {
      showError(TEXTS.save.noSpace, TEXTS.about.retry, create, () => void createBackup());
    } else if (outcome.status === 'failed') {
      showError(TEXTS.save.notWritten, TEXTS.about.retry, create, () => void createBackup());
    }
  }

  const showSummary = (createdAt: string, incoming: ProgressData): void => {
    const cancel = createButton(TEXTS.save.cancel, 'button', close);
    const merge = createButton(TEXTS.save.merge, 'button button-primary', () => {
      if (merging) return;
      merging = true;
      cancel.disabled = true;
      merge.disabled = true;
      void options
        .onMerge(incoming)
        .then((result) => {
          if (disposed) return;
          if (result.status === 'saved') {
            close();
            showToast(restoredMessage(result.records, result.skins));
          } else {
            showError(TEXTS.save.notRestored, TEXTS.notices.understood, restore);
          }
        })
        .finally(() => {
          merging = false;
        });
    });
    open(
      dialogOf('save-summary-title', 'save-question', [
        createElement('h2', {
          text: backupDateLabel(createdAt),
          attributes: { id: 'save-summary-title' },
        }),
        createElement('p', {
          text: `${backupCountsLabel(countRecords(incoming), incoming.skins.unlocked.length)}.`,
        }),
        createElement('p', {
          text: TEXTS.save.confirmQuestion,
          attributes: { id: 'save-question' },
        }),
        createElement('p', { className: 'save-help', text: TEXTS.save.confirmHelp }),
        createElement('div', { className: 'dialog-actions' }, [cancel, merge]),
      ]),
      cancel,
      () => {
        if (!merging) close();
      },
      restore,
    );
  };

  picker.addEventListener('change', () => {
    const file = picker.files?.[0];
    picker.value = '';
    if (file === undefined) return;
    void options.onCheckFile(file).then((check) => {
      if (disposed) return;
      if (check.status === 'ready') showSummary(check.createdAt, check.incoming);
      else {
        showError(
          check.status === 'newer' ? TEXTS.save.newerFile : TEXTS.save.invalidFile,
          TEXTS.notices.understood,
          restore,
        );
      }
    });
  });

  // Le focus reste dans la boîte ouverte (Tab et Maj+Tab font le tour de ses boutons).
  overlay.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const buttons = [...overlay.querySelectorAll('button:not(:disabled)')] as HTMLElement[];
    const first = buttons[0];
    const last = buttons.at(-1);
    if (first === undefined || last === undefined) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  return {
    element: createElement('main', { className: 'save' }, [content, overlay]),
    start() {
      back.focus();
    },
    dispose() {
      disposed = true;
    },
    onEscape() {
      if (dismiss !== null) dismiss();
      else options.onBack();
    },
  };
}
