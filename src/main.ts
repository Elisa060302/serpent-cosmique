import { formatLocalDateTime } from './core/format.ts';
import { countRecords, mergeProgress } from './core/merge.ts';
import {
  applyFinishedGame,
  gamesLeftToDiscover,
  isModeDiscovered,
  setRecordName,
  toPendingGame,
  withChosenSkin,
  withSetting,
} from './core/progress.ts';
import type { GameOutcome } from './core/progress.ts';
import { resolveSeed } from './core/random.ts';
import { AUDIO, DEFAULT_NAME } from './core/rules.ts';
import { backupFileName, readBackup, serializeEnvelope } from './core/savefile.ts';
import { VERSION } from './core/version.ts';
import type { ModeId, SkinId } from './core/rules.ts';
import type { EndReason, ModeRules, PendingGame, ProgressData, Settings } from './core/types.ts';
import { createAudio } from './platform/audio.ts';
import { createHaptics } from './platform/haptics.ts';
import { createInstaller } from './platform/install.ts';
import { createBackButton, createForeground, createWakeLock } from './platform/lifecycle.ts';
import { isIphone, readBackupFile, writeBackup } from './platform/save-io.ts';
import type { WriteOutcome } from './platform/save-io.ts';
import { openStorage, requestPersistence } from './platform/storage.ts';
import type { ProgressStorage } from './platform/storage.ts';
import { installAnnouncer } from './ui/announcer.ts';
import { createElement } from './ui/dom.ts';
import { createRouter } from './ui/router.ts';
import type { Screen } from './ui/router.ts';
import { createAboutScreen } from './ui/screens/about.ts';
import { createEndScreen } from './ui/screens/end.ts';
import type { EndRecord } from './ui/screens/end.ts';
import { createGameScreen } from './ui/screens/game.ts';
import type { GameCheckpoint, GameResult } from './ui/screens/game.ts';
import { createInstallHelpScreen } from './ui/screens/install-help.ts';
import { createMenuScreen } from './ui/screens/menu.ts';
import type { MenuOptions } from './ui/screens/menu.ts';
import {
  availableModeIds,
  createModesScreen,
  findModeRules,
  modeName,
} from './ui/screens/modes.ts';
import { createNoticeScreen } from './ui/screens/notice.ts';
import type { NoticeOptions } from './ui/screens/notice.ts';
import { createRecordsScreen } from './ui/screens/records.ts';
import { createRotateNotice } from './ui/screens/rotate.ts';
import { createSaveScreen } from './ui/screens/save.ts';
import type { RestoreCheck, RestoreResult } from './ui/screens/save.ts';
import { createSettingsScreen } from './ui/screens/settings.ts';
import { createSkinsScreen } from './ui/screens/skins.ts';
import { closeToast, showToast } from './ui/toast.ts';
import {
  TEXTS,
  interruptedMessage,
  modeDiscoveredMessage,
  skinChosenMessage,
  skinUnlockedMessage,
  updatedMessage,
} from './ui/texts.ts';

async function start(root: HTMLElement): Promise<void> {
  // Le jeu ne démarre pas affiché dans un cadre (la balise CSP ne peut pas porter `frame-ancestors`).
  if (window.top !== window.self) {
    root.append(createElement('p', { className: 'refusal', text: TEXTS.frameRefused }));
    return;
  }
  installAnnouncer();
  document.body.append(createRotateNotice());
  const router = createRouter(root);
  let readyToastShown = false;
  const show = (screen: Screen, mainMenu = false): void => {
    onMainMenu = mainMenu;
    // Le message d'état du hors ligne ne suit pas le joueur dans les autres écrans.
    if (!mainMenu && readyToastShown) closeToast();
    readyToastShown = false;
    router.show(screen);
  };
  const backButton = createBackButton();
  const installer = createInstaller();
  // Le message « Prêt à jouer hors ligne » n'apparaît que sur le menu principal : jamais pendant une partie
  // ni par-dessus un autre écran (EF-29 CA-4).
  let onMainMenu = false;
  let offline = installer.status().offline;
  installer.subscribe((status) => {
    if (offline === 'preparing' && status.offline === 'ready' && onMainMenu) {
      showToast(TEXTS.notices.offlineReady);
      readyToastShown = true;
    }
    offline = status.offline;
  });

  void requestPersistence();
  const storage: ProgressStorage = await openStorage();
  const loaded = await storage.load(new Date());
  // Progression en mémoire : elle reste valable si une écriture échoue et sera réécrite à la suivante.
  let progress: ProgressData = loaded.progress;

  // Sons, vibrations et verrou d'écran lisent les réglages courants et ne s'activent qu'au premier plan.
  const foreground = createForeground();
  const audio = createAudio({
    getSettings: () => progress.settings,
    foreground,
    createContext: () => new AudioContext(),
  });
  const haptics = createHaptics({
    getSettings: () => progress.settings,
    foreground,
    vibrate:
      typeof navigator.vibrate === 'function' ? (pattern) => navigator.vibrate(pattern) : undefined,
  });
  const wakeLock = createWakeLock(
    foreground,
    'wakeLock' in navigator ? navigator.wakeLock : undefined,
  );
  // Le navigateur n'autorise le son qu'après un geste abouti du joueur (levée du doigt ou touche).
  for (const gesture of ['pointerup', 'keydown']) {
    document.addEventListener(gesture, () => audio.unlock(), true);
  }

  /** Écrit la progression ; en cas d'échec, E-08 s'affiche sans bloquer et l'écriture suivante réessaie (HYP-48). */
  const save = async (clearPending: boolean): Promise<void> => {
    if (!(await storage.commit(progress, { clearPending }))) {
      showToast(TEXTS.notices.progressNotSaved, { error: true });
    }
  };

  const showMenu = (focus: MenuOptions['focus']): void => {
    show(
      createMenuScreen({
        onPlay: showModes,
        onRecords: showRecords,
        onSkins: showSkins,
        onSettings: showSettings,
        onSave: () => showSave('menu'),
        onInstallHelp: showInstallHelp,
        installer,
        focus,
      }),
      true,
    );
  };

  const showInstallHelp = (): void => {
    backButton.set(() => showMenu('install'));
    show(createInstallHelpScreen({ installer, onBack: () => backButton.press() }));
  };

  const showAbout = (): void => {
    backButton.set(() => showSettings());
    show(
      createAboutScreen({
        installer,
        onSave: () => showSave('about'),
        onBack: () => backButton.press(),
      }),
    );
  };

  // Noms de fichier produits depuis l'ouverture du jeu : une seconde sauvegarde de la même minute prend « -2 » (RG-68).
  const backupNames = new Set<string>();

  /** Écrit un fichier de sauvegarde de la progression courante ; la progression n'est jamais modifiée (RG-69). */
  const createBackup = async (): Promise<WriteOutcome> => {
    try {
      const now = formatLocalDateTime(new Date());
      const content = await serializeEnvelope(progress, now);
      const fileName = backupFileName(now, backupNames);
      const outcome = await writeBackup(content, fileName);
      if (outcome.status === 'saved') backupNames.add(fileName);
      return outcome;
    } catch {
      return { status: 'failed' };
    }
  };

  /** Contrôle le fichier choisi (RG-72) : rien n'est modifié, quel qu'en soit le résultat. */
  const checkBackup = async (file: File): Promise<RestoreCheck> => {
    const text = await readBackupFile(file);
    if (text === null) return { status: 'invalid' };
    const reading = await readBackup(text, new Date());
    if (reading.status === 'valid') {
      return {
        status: 'ready',
        createdAt: reading.envelope.createdAt,
        incoming: reading.envelope.data,
      };
    }
    return { status: reading.status };
  };

  /**
   * Fusion entière ou nulle (RG-73) : une seule écriture remplace la progression ; la progression en mémoire
   * ne change qu'une fois l'écriture confirmée.
   */
  const restoreBackup = async (incoming: ProgressData): Promise<RestoreResult> => {
    const merged = mergeProgress(progress, incoming);
    if (!(await storage.commit(merged))) return { status: 'failed' };
    progress = merged;
    audio.refresh();
    return {
      status: 'saved',
      records: countRecords(merged),
      skins: merged.skins.unlocked.length,
    };
  };

  /** E11 : ouvert depuis le menu ou, avant une mise à jour, depuis « À propos » ; « Retour » revient à l'écran d'origine. */
  const showSave = (from: 'menu' | 'about'): void => {
    backButton.set(() => (from === 'about' ? showAbout() : showMenu('save')));
    show(
      createSaveScreen({
        iphone: isIphone(),
        onBack: () => backButton.press(),
        onCreate: createBackup,
        onCheckFile: checkBackup,
        onMerge: restoreBackup,
      }),
    );
  };

  // Le retour du téléphone et « ‹ Retour » suivent le même chemin : l'historique appelle ce gestionnaire.
  const showModes = (): void => {
    backButton.set(() => showMenu('play'));
    show(
      createModesScreen({
        gamesLeft: gamesLeftToDiscover(progress),
        onSelect: play,
        onBack: () => backButton.press(),
      }),
    );
  };

  const showRecords = (): void => {
    backButton.set(() => showMenu('records'));
    show(
      createRecordsScreen({
        records: progress.records,
        modes: availableModeIds(isModeDiscovered(progress)),
        onBack: () => backButton.press(),
      }),
    );
  };

  /** Un skin débloqué est choisi aussitôt ; il sert à partir de la partie suivante (RG-60, RG-83). */
  const chooseSkin = (id: SkinId): void => {
    progress = withChosenSkin(progress, id);
    showToast(skinChosenMessage(id));
    void save(false);
  };

  const showSkins = (): void => {
    backButton.set(() => showMenu('skins'));
    show(
      createSkinsScreen({
        getProgress: () => progress,
        onChoose: chooseSkin,
        onBack: () => backButton.press(),
      }),
    );
  };

  /** Un réglage s'applique et s'enregistre aussitôt (RG-62, RG-83). */
  const changeSetting = <K extends keyof Settings>(key: K, value: Settings[K]): void => {
    progress = withSetting(progress, key, value);
    audio.refresh();
    void save(false);
  };

  const showSettings = (): void => {
    backButton.set(() => showMenu('settings'));
    show(
      createSettingsScreen({
        settings: progress.settings,
        vibrationsAvailable: haptics.isAvailable(),
        onChange: changeSetting,
        onAbout: showAbout,
        installer,
        onBack: () => backButton.press(),
      }),
    );
  };

  const play = (rules: ModeRules): void => {
    // La graine de recette (?seed=) est lue à chaque lancement de partie ; sinon elle est tirée au hasard.
    const seed = resolveSeed(window.location.search);
    // Un message passager ne doit pas rester par-dessus l'aire de jeu.
    closeToast();
    show(
      createGameScreen({
        rules,
        seed,
        control: progress.settings.control,
        skins: progress.skins.selected,
        backButton,
        audio,
        haptics,
        foreground,
        wakeLock,
        onCheckpoint: (checkpoint) => void storage.savePending(pendingOf(checkpoint)),
        onEnd: (result) => void finishGame(result),
      }),
    );
  };

  const replay = (mode: ModeId): void => {
    const rules = findModeRules(mode);
    if (rules === undefined) showModes();
    else play(rules);
  };

  /** E6 : le record est déjà enregistré ; « Valider » ne fait que changer son nom (RG-53). */
  const showEnd = (mode: ModeId, reason: EndReason, score: number, outcome: GameOutcome): void => {
    const record: EndRecord | null =
      outcome.rank === null
        ? null
        : {
            rank: outcome.rank,
            prefill: outcome.prefill,
            savedName: outcome.progress.records[mode][outcome.rank - 1]?.name ?? DEFAULT_NAME,
            onSubmitName: async (name) => {
              progress = setRecordName(progress, mode, outcome.rank ?? 1, name);
              await save(false);
              return progress.lastName;
            },
          };
    backButton.set(() => showMenu(null));
    if (outcome.rank !== null) audio.play('record');
    if (outcome.newSkins.length > 0 || outcome.newMode)
      audio.play('unlock', outcome.rank === null ? 0 : AUDIO.unlockAfterRecordSeconds);
    show(
      createEndScreen({
        modeName: modeName(mode),
        reason,
        score,
        record,
        newSkins: outcome.newSkins,
        newMode: outcome.newMode,
        onReplay: () => replay(mode),
        onMenu: () => backButton.press(),
      }),
    );
  };

  /** Fin d'une partie : l'écran de fin ne s'affiche qu'une fois la progression écrite durablement (ENF-14). */
  const finishGame = async (result: GameResult): Promise<void> => {
    const outcome = applyFinishedGame(progress, {
      mode: result.mode,
      score: result.score,
      candiesEaten: result.candiesEaten,
      dateTime: formatLocalDateTime(new Date()),
    });
    progress = outcome.progress;
    await save(true);
    showEnd(result.mode, result.reason, result.score, outcome);
  };

  const pendingOf = (checkpoint: GameCheckpoint): PendingGame =>
    toPendingGame(checkpoint, formatLocalDateTime(new Date()));

  const notice = (options: Omit<NoticeOptions, 'onContinue'>): Promise<void> =>
    new Promise((resolve) => {
      show(createNoticeScreen({ ...options, onContinue: resolve }));
    });

  /** Partie interrompue par la fermeture du jeu : clôturée comme abandonnée, comptée une seule fois (RG-79). */
  const closeInterruptedGame = async (pending: PendingGame): Promise<void> => {
    const outcome = applyFinishedGame(progress, pending);
    progress = outcome.progress;
    await save(true);
    await notice({
      title: TEXTS.notices.interruptedTitle,
      lines: [
        interruptedMessage(pending.mode, pending.score),
        ...outcome.newSkins.map(skinUnlockedMessage),
        ...(outcome.newMode ? [modeDiscoveredMessage()] : []),
      ],
      buttonLabel: TEXTS.notices.continue,
    });
    if (outcome.rank === null) showMenu(null);
    else showEnd(pending.mode, 'abandon', pending.score, outcome);
  };

  if (loaded.unreadable) {
    await notice({
      lines: [TEXTS.notices.progressUnreadable],
      buttonLabel: TEXTS.notices.understood,
      isError: true,
    });
  }
  if (loaded.pending !== null) await closeInterruptedGame(loaded.pending);
  else showMenu(null);
  if (installer.takeUpdated()) showToast(updatedMessage(VERSION));
}

const root = document.getElementById('app');
if (root === null) {
  throw new Error('Conteneur #app introuvable.');
}
void start(root);
