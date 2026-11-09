import { SCHEDULER } from './rules.ts';

/**
 * Transforme le temps écoulé entre deux images en pas à intervalle fixe. Il ne compte que le temps
 * de jeu : l'appelant ne l'interroge pas en pause et appelle `reset` à chaque départ et à chaque reprise.
 */
export interface Scheduler {
  /** Repart de l'instant donné : rien n'est rattrapé. */
  reset(nowMs: number): void;
  /** Nombre de pas à faire à cet instant. */
  advance(nowMs: number, intervalMs: number): number;
}

export function createScheduler(): Scheduler {
  let last = 0;
  let accumulated = 0;
  return {
    reset(nowMs: number): void {
      last = nowMs;
      accumulated = 0;
    },
    advance(nowMs: number, intervalMs: number): number {
      accumulated += Math.max(0, nowMs - last);
      last = Math.max(last, nowMs);
      const due = Math.floor((accumulated + SCHEDULER.toleranceMs) / intervalMs);
      const steps = Math.min(due, SCHEDULER.maxStepsPerFrame);
      accumulated -= steps * intervalMs;
      // Un retard plus grand que ce que l'on rattrape est abandonné, jamais rejoué.
      if (due > steps) accumulated = 0;
      return steps;
    },
  };
}
