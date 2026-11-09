/**
 * Contexte de canevas qui enregistre ce qu'on y dessine, pour tester les fonctions de dessin sans navigateur :
 * chaque opération garde la couleur de remplissage, la couleur de trait et l'opacité en vigueur.
 */
export interface Operation {
  name: string;
  fillStyle: string;
  strokeStyle: string;
  globalAlpha: number;
}

export interface RecordingContext {
  context: CanvasRenderingContext2D;
  operations: Operation[];
}

export function recordingContext(): RecordingContext {
  const state: Record<string, unknown> = {
    fillStyle: '#000000',
    strokeStyle: '#000000',
    globalAlpha: 1,
  };
  const operations: Operation[] = [];
  const context = new Proxy(state, {
    get(target, property: string) {
      if (property in target) return target[property];
      return (): unknown => {
        operations.push({
          name: property,
          fillStyle: String(state['fillStyle']),
          strokeStyle: String(state['strokeStyle']),
          globalAlpha: Number(state['globalAlpha']),
        });
        return property === 'createRadialGradient' ? { addColorStop: () => undefined } : undefined;
      };
    },
    set(target, property: string, value: unknown) {
      target[property] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { context, operations };
}
