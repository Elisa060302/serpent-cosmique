/** Un écran : son élément, et ce qu'il fait quand il est affiché, quitté ou que la touche Échap est pressée. */
export interface Screen {
  element: HTMLElement;
  /** Appelé une fois l'élément dans la page : mesures, écoutes, focus. */
  start?(): void;
  /** Appelé quand l'écran est remplacé : arrête écoutes et animations. */
  dispose?(): void;
  /** Échap : « Retour », « Reprendre » ou « Non » selon l'écran. */
  onEscape?(): void;
}

export interface Router {
  show(screen: Screen): void;
}

export function createRouter(root: HTMLElement): Router {
  let current: Screen | null = null;
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || current?.onEscape === undefined) return;
    event.preventDefault();
    current.onEscape();
  });
  return {
    show(screen) {
      current?.dispose?.();
      current = screen;
      root.replaceChildren(screen.element);
      screen.start?.();
    },
  };
}
