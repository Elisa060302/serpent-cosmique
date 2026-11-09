export function envoyer(): boolean {
  return navigator.sendBeacon('/mesure');
}
