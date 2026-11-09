/**
 * Numéro de version du jeu. La construction (scripts/site.mjs) remplace la valeur de la ligne
 * ci-dessous par la version de package.json, la même que celle de l'agent de service.
 */
export const VERSION = '0.0.0';

const VERSION_FORMAT = /^(0|[1-9]\d{0,3})\.(0|[1-9]\d{0,3})\.(0|[1-9]\d{0,3})$/;

/** Vrai si le texte est un numéro MAJEUR.MINEUR.CORRECTIF (entiers sans zéro initial, 4 chiffres au plus). */
export function isVersion(text: string): boolean {
  return VERSION_FORMAT.test(text);
}

function parts(version: string): number[] {
  return version.split('.').map(Number);
}

/** Vrai si `candidate` est strictement plus récente que `current` (deux numéros déjà validés). */
export function isNewerVersion(candidate: string, current: string): boolean {
  const left = parts(candidate);
  const right = parts(current);
  for (let index = 0; index < 3; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference > 0;
  }
  return false;
}
