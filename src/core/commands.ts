import { COMMAND_QUEUE_MAX } from './rules.ts';
import type { Direction } from './types.ts';

const OPPOSITES: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

export function opposite(direction: Direction): Direction {
  return OPPOSITES[direction];
}

/**
 * Ajoute une commande à la file (RG-25, RG-26). La direction de référence est la dernière commande de la file,
 * ou à défaut la direction du serpent : une commande opposée ou identique à la référence est ignorée,
 * ainsi que toute commande reçue quand la file est pleine. Renvoie vrai si la commande a été gardée.
 */
export function enqueueCommand(
  queue: Direction[],
  current: Direction,
  command: Direction,
): boolean {
  if (queue.length >= COMMAND_QUEUE_MAX) return false;
  const reference = queue.at(-1) ?? current;
  if (command === reference || command === opposite(reference)) return false;
  queue.push(command);
  return true;
}
