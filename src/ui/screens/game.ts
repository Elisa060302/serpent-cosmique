import {
  abandon,
  createGame,
  playFrame,
  secondsLeft,
  sendCommand,
  takeEvents,
} from '../../core/engine.ts';
import { createScheduler } from '../../core/scheduler.ts';
import {
  BONUS,
  COUNTDOWN_SECONDS,
  END_DELAY_MS,
  LAYOUT,
  PX_PER_MM,
  SIZES_MM,
  VIBRATION_MS,
} from '../../core/rules.ts';
import type { Direction, EndReason, Game, ModeRules, ProgressData } from '../../core/types.ts';
import type { Audio } from '../../platform/audio.ts';
import type { Haptics } from '../../platform/haptics.ts';
import type { BackButton, Foreground, WakeLock } from '../../platform/lifecycle.ts';
import { watchPortrait } from '../../platform/lifecycle.ts';
import { announce } from '../announcer.ts';
import { createElement } from '../dom.ts';
import { createSwipeDetector } from '../input.ts';
import type { ControlMode } from '../layout.ts';
import { computeLayout } from '../layout.ts';
import { drawBoard } from '../render/board.ts';
import type { BoardStyle } from '../render/board.ts';
import { addConstellation, renderDecor } from '../render/decor.ts';
import { createHud } from '../render/hud.ts';
import type { HudInfo } from '../render/hud.ts';
import { createTrail } from '../render/trail.ts';
import type { Screen } from '../router.ts';
import { TEXTS, effectLabel } from '../texts.ts';
import { createPauseDialogs } from './pause.ts';

export interface GameResult {
  mode: ModeRules['id'];
  reason: EndReason;
  score: number;
  candiesEaten: number;
}

/** État utile d'une partie en cours, enregistré à chaque bonbon mangé et à chaque mise en pause (RG-79). */
export interface GameCheckpoint {
  mode: ModeRules['id'];
  score: number;
  candiesEaten: number;
}

export interface GameOptions {
  rules: ModeRules;
  seed: number;
  control: ControlMode;
  /** Skins choisis, appliqués à toute la partie (RG-60). */
  skins: ProgressData['skins']['selected'];
  backButton: BackButton;
  audio: Audio;
  haptics: Haptics;
  foreground: Foreground;
  wakeLock: WakeLock;
  onCheckpoint: (checkpoint: GameCheckpoint) => void;
  onEnd: (result: GameResult) => void;
}

type Phase = 'countdown' | 'running' | 'paused' | 'ending';

/** Information propre au mode pour le bandeau (RG-04) : temps restant, effet en cours ou constellation à tracer. */
function hudInfoOf(game: Game, shrinkNoticeUntilMs: number): HudInfo {
  const limit = game.rules.timeLimitMs;
  if (limit !== undefined) return { kind: 'time', seconds: secondsLeft(limit - game.elapsedMs) };
  if (game.effect !== null) {
    return {
      kind: 'effect',
      type: game.effect.type,
      seconds: secondsLeft(game.effect.remainingMs),
    };
  }
  if (game.elapsedMs < shrinkNoticeUntilMs) {
    return { kind: 'effect', type: 'shrink', seconds: null };
  }
  if (game.constellation !== null) {
    return {
      kind: 'constellation',
      sequence: game.constellation.sequence,
      progress: game.constellation.progress,
    };
  }
  return null;
}

const ARROW_GLYPHS: Record<Direction, string> = { up: '▲', down: '▼', left: '◀', right: '▶' };
const PRESS_FEEDBACK_MS = 150;

/** E3 Partie, E4 Compte à rebours et E5 Pause : l'aire de jeu, son bandeau, les commandes et la boucle d'affichage. */
export function createGameScreen(options: GameOptions): Screen {
  const game = createGame(options.rules, options.seed);
  const scheduler = createScheduler();
  const style: BoardStyle = {
    shape: options.skins.shape,
    pattern: options.skins.pattern,
    trail: options.skins.trail,
    decor: options.skins.decor,
  };
  const trail = createTrail();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hud = createHud(() => pause(false));
  const dialogs = createPauseDialogs({
    getScore: () => game.score,
    onResume: () => resume(),
    onAbandon: () => {
      // Un second toucher sur « Oui » pendant l'enregistrement ne doit pas clore la partie deux fois.
      if (phase === 'ending') return;
      phase = 'ending';
      abandon(game);
      options.audio.play('end');
      finish();
    },
  });

  let phase: Phase = 'countdown';
  let resumeCountdown = false;
  let countdownStart: number | null = null;
  let shownDigit = 0;
  let endAt = 0;
  let lastFrameAt = 0;
  /** Temps de jeu jusqu'auquel l'annonce « Rétrécissement » reste dans le bandeau. */
  let shrinkNoticeUntil = 0;
  let frameId = 0;
  let cell = 0;
  let pixelRatio = 1;
  let decor: HTMLCanvasElement | null = null;
  /** Constellations déjà dessinées dans le ciel du décor (RG-42). */
  let skyCount = 0;
  /** Temps de jeu passé à animer le décor : il n'avance qu'en partie, et pas avec le mouvement réduit. */
  let animationMs = 0;
  const stops: (() => void)[] = [];

  const canvas = createElement('canvas', {
    attributes: { role: 'img', 'aria-label': TEXTS.game.areaLabel },
  });
  const countdownNumber = createElement('p', { className: 'countdown-number' });
  const countdownHint = createElement('p', { className: 'countdown-hint' });
  const countdown = createElement('div', { className: 'countdown' }, [
    countdownNumber,
    countdownHint,
  ]);
  const field = createElement('div', { className: 'field' }, [canvas, countdown]);
  const board = createElement('div', { className: 'board' });

  function arrow(direction: Direction): HTMLButtonElement {
    const button = createElement('button', {
      className: 'arrow',
      attributes: { type: 'button' },
    });
    button.append(
      createElement('span', {
        className: 'arrow-glyph',
        text: ARROW_GLYPHS[direction],
        attributes: { 'aria-hidden': 'true' },
      }),
      createElement('span', { className: 'arrow-label', text: TEXTS.game.arrows[direction] }),
    );
    // La commande est prise dès que le doigt touche la flèche ; la touche Entrée ou Espace passe par `click`.
    button.addEventListener('pointerdown', () => {
      button.classList.add('is-pressed');
      send(direction);
    });
    const release = (): void => {
      window.setTimeout(() => button.classList.remove('is-pressed'), PRESS_FEEDBACK_MS);
    };
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('pointerleave', release);
    button.addEventListener('click', (event) => {
      if (event.detail === 0) send(direction);
    });
    return button;
  }

  if (options.control === 'arrows') {
    board.append(
      createElement('div', { className: 'arrow-column' }, [arrow('up'), arrow('down')]),
      field,
      createElement('div', { className: 'arrow-column' }, [arrow('left'), arrow('right')]),
    );
  } else {
    board.append(field);
  }

  const element = createElement('main', { className: 'game' }, [
    hud.element,
    board,
    dialogs.element,
  ]);

  function send(direction: Direction): void {
    if (phase === 'countdown' || phase === 'running') sendCommand(game, direction);
  }

  function showCountdown(): void {
    countdownHint.textContent = resumeCountdown
      ? TEXTS.game.countdownResume
      : options.control === 'arrows'
        ? TEXTS.game.countdownArrows
        : TEXTS.game.countdownSwipe;
    countdownNumber.textContent = String(COUNTDOWN_SECONDS);
    countdown.hidden = false;
    shownDigit = 0;
    countdownStart = null;
  }

  function pause(automatic: boolean): void {
    if (phase !== 'countdown' && phase !== 'running') return;
    phase = 'paused';
    options.wakeLock.release();
    options.audio.setMusicPaused(true);
    game.queue.length = 0;
    countdown.hidden = true;
    dialogs.showPause(automatic);
    announce(TEXTS.pause.title);
    checkpoint();
  }

  function resume(): void {
    if (phase !== 'paused') return;
    dialogs.hide();
    hud.focusPause();
    phase = 'countdown';
    options.wakeLock.hold();
    options.audio.setMusicPaused(false);
    resumeCountdown = true;
    showCountdown();
  }

  function finish(): void {
    if (game.end === null) return;
    cancelAnimationFrame(frameId);
    options.onEnd({
      mode: options.rules.id,
      reason: game.end,
      score: game.score,
      candiesEaten: game.candiesEaten,
    });
  }

  function checkpoint(): void {
    options.onCheckpoint({
      mode: options.rules.id,
      score: game.score,
      candiesEaten: game.candiesEaten,
    });
  }

  function update(now: number): void {
    if (phase === 'countdown') {
      countdownStart ??= now;
      const remaining = COUNTDOWN_SECONDS - Math.floor((now - countdownStart) / 1000);
      if (remaining <= 0) {
        phase = 'running';
        scheduler.reset(now);
        lastFrameAt = now;
        countdown.hidden = true;
      } else if (remaining !== shownDigit) {
        shownDigit = remaining;
        countdownNumber.textContent = String(remaining);
        announce(String(remaining));
      }
    } else if (phase === 'running') {
      const eatenBefore = game.candiesEaten;
      playFrame(game, scheduler, now, lastFrameAt);
      if (!reducedMotion.matches) animationMs += now - lastFrameAt;
      lastFrameAt = now;
      trail.update(game);
      addToSky();
      hud.setScore(game.score);
      hud.setInfo(hudInfoOf(game, shrinkNoticeUntil));
      if (game.candiesEaten !== eatenBefore) checkpoint();
      handleEvents();
      if (game.end !== null) {
        phase = 'ending';
        endAt = now + END_DELAY_MS;
        options.audio.play('end');
        if (game.end === 'collision') options.haptics.vibrate(VIBRATION_MS.collision);
      }
    } else if (phase === 'ending' && now >= endAt) {
      finish();
    }
  }

  /** Sons, vibration et annonces des événements du moteur (RG-66, RG-37). */
  function handleEvents(): void {
    for (const event of takeEvents(game)) {
      if (event.kind === 'eat') options.audio.play('candy');
      else if (event.kind === 'constellation') options.audio.play('constellation');
      else if (event.kind === 'special') {
        options.audio.play('special');
        options.haptics.vibrate(VIBRATION_MS.special);
        if (event.type === 'shrink') {
          shrinkNoticeUntil = game.elapsedMs + BONUS.shrinkNoticeMs;
          hud.setInfo(hudInfoOf(game, shrinkNoticeUntil));
        }
        announce(effectLabel(event.type, null));
      }
    }
  }

  /** Chaque suite de couleurs complétée ajoute une constellation au ciel du décor (RG-42). */
  function addToSky(): void {
    const completed = game.constellation?.completed ?? 0;
    for (; skyCount < completed; skyCount += 1) {
      if (decor !== null) addConstellation(decor, skyCount, cell, pixelRatio);
    }
  }

  function draw(): void {
    const context = canvas.getContext('2d');
    if (context === null || decor === null) return;
    drawBoard(context, { decor, style, trail: trail.points, animationMs }, game, cell, pixelRatio);
  }

  function frame(now: number): void {
    frameId = requestAnimationFrame(frame);
    update(now);
    draw();
  }

  function layout(): void {
    const width = element.clientWidth;
    const height = element.clientHeight;
    if (width === 0 || height === 0) return;
    const measured = computeLayout(width, height, options.control);
    cell = measured.cell;
    pixelRatio = Math.min(window.devicePixelRatio || 1, LAYOUT.maxPixelRatio);
    // Toutes les tailles de la feuille de style viennent de rules.ts (ENF-19).
    element.style.setProperty('--hud', `${measured.hudHeight}px`);
    element.style.setProperty('--margin', `${LAYOUT.marginPx}px`);
    element.style.setProperty('--pause-button', `${LAYOUT.pauseButtonPx}px`);
    element.style.setProperty('--arrow-column', `${measured.arrowColumn}px`);
    element.style.setProperty('--arrow-pad', `${measured.arrowPad}px`);
    element.style.setProperty('--arrow-min', `${LAYOUT.arrowPx}px`);
    element.style.setProperty('--arrow-max', `${LAYOUT.arrowMaxHeightMm * PX_PER_MM}px`);
    canvas.style.width = `${measured.gridWidth}px`;
    canvas.style.height = `${measured.gridHeight}px`;
    canvas.width = Math.round(measured.gridWidth * pixelRatio);
    canvas.height = Math.round(measured.gridHeight * pixelRatio);
    decor = renderDecor(cell, pixelRatio, style.decor, skyCount);
    draw();
  }

  function listenToSwipes(): void {
    const swipe = createSwipeDetector(SIZES_MM.swipe * PX_PER_MM);
    const onDown = (event: PointerEvent): void => {
      if (event.target instanceof Element && event.target.closest('button') !== null) return;
      swipe.start(event.pointerId, event.clientX, event.clientY);
    };
    const onMove = (event: PointerEvent): void => {
      const direction = swipe.move(event.pointerId, event.clientX, event.clientY);
      if (direction !== null) send(direction);
    };
    const onEnd = (event: PointerEvent): void => swipe.end(event.pointerId);
    element.addEventListener('pointerdown', onDown);
    element.addEventListener('pointermove', onMove);
    element.addEventListener('pointerup', onEnd);
    element.addEventListener('pointercancel', onEnd);
    stops.push(() => {
      element.removeEventListener('pointerdown', onDown);
      element.removeEventListener('pointermove', onMove);
      element.removeEventListener('pointerup', onEnd);
      element.removeEventListener('pointercancel', onEnd);
    });
  }

  return {
    element,
    start() {
      layout();
      hud.setInfo(hudInfoOf(game, shrinkNoticeUntil));
      showCountdown();
      if (options.control === 'swipe') listenToSwipes();
      window.addEventListener('resize', layout);
      // Toute perte du premier plan met la partie en pause aussitôt, avant le moindre pas de plus (RG-77).
      stops.push(
        () => window.removeEventListener('resize', layout),
        watchPortrait(() => pause(true)),
        options.foreground.watch(
          () => pause(true),
          () => undefined,
        ),
      );
      options.wakeLock.hold();
      // Le retour du téléphone met en pause sans quitter : le niveau consommé est aussitôt rouvert.
      const onBack = (): void => {
        pause(false);
        options.backButton.set(onBack);
      };
      options.backButton.set(onBack);
      frameId = requestAnimationFrame(frame);
    },
    dispose() {
      cancelAnimationFrame(frameId);
      for (const stop of stops) stop();
      options.wakeLock.release();
      options.audio.setMusicPaused(false);
    },
    onEscape() {
      dialogs.escape();
    },
  };
}
