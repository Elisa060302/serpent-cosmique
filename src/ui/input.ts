import type { Direction } from '../core/types.ts';

/** Reconnaît un glissement par contact : une seule commande, dès que le seuil est atteint (RG-21). */
export interface SwipeDetector {
  start(id: number, x: number, y: number): void;
  /** Renvoie la direction dès que le glissement atteint le seuil, une seule fois par contact. */
  move(id: number, x: number, y: number): Direction | null;
  end(id: number): void;
}

interface Track {
  x: number;
  y: number;
  done: boolean;
}

export function createSwipeDetector(thresholdPx: number): SwipeDetector {
  const tracks = new Map<number, Track>();
  return {
    start(id, x, y) {
      tracks.set(id, { x, y, done: false });
    },
    move(id, x, y) {
      const track = tracks.get(id);
      if (track === undefined || track.done) return null;
      const dx = x - track.x;
      const dy = y - track.y;
      const horizontal = Math.abs(dx) >= Math.abs(dy);
      if (Math.max(Math.abs(dx), Math.abs(dy)) < thresholdPx) return null;
      track.done = true;
      if (horizontal) return dx > 0 ? 'right' : 'left';
      return dy > 0 ? 'down' : 'up';
    },
    end(id) {
      tracks.delete(id);
    },
  };
}
