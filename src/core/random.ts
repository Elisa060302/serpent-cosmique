/** Aléa à graine : tout tirage d'une partie passe par ici, dans un ordre fixe. */

export const SEED_MAX = 4_294_967_295;

export interface Random {
  /** Nombre dans [0, 1). */
  next(): number;
  /** Entier dans [0, maxExclusive). */
  nextInt(maxExclusive: number): number;
}

/** Générateur mulberry32 : 32 bits d'état, suite entièrement déterminée par la graine. */
export function createRandom(seed: number): Random {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
  return {
    next,
    nextInt(maxExclusive: number): number {
      if (!Number.isInteger(maxExclusive) || maxExclusive < 1) {
        throw new RangeError('La borne doit être un entier supérieur ou égal à 1.');
      }
      return Math.floor(next() * maxExclusive);
    },
  };
}

export function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
}

const SEED_FORMAT = /^[0-9]{1,10}$/;

/**
 * Lit la graine de recette dans la partie « recherche » de l'adresse (`?seed=42`).
 * Seule une valeur de 1 à 10 chiffres, au plus égale à SEED_MAX, est acceptée,
 * et une seule fois : toute autre forme est ignorée (null).
 */
export function parseSeed(search: string): number | null {
  const query = search.startsWith('?') ? search.slice(1) : search;
  const values = query
    .split('&')
    .filter((pair) => pair.startsWith('seed=') || pair === 'seed')
    .map((pair) => pair.slice('seed='.length));
  if (values.length !== 1) return null;
  const value = values[0] ?? '';
  if (!SEED_FORMAT.test(value)) return null;
  const seed = Number(value);
  return seed <= SEED_MAX ? seed : null;
}

export function resolveSeed(search: string): number {
  return parseSeed(search) ?? randomSeed();
}
