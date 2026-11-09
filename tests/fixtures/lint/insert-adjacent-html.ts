export function ajouter(element: HTMLElement, texte: string): void {
  element.insertAdjacentHTML('beforeend', texte);
}
