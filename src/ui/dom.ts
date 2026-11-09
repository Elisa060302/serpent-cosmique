/**
 * Seul point de construction du DOM : les textes passent par `textContent`,
 * jamais par du HTML, et les attributs sont limités à une liste fermée.
 */

const ALLOWED_ATTRIBUTES = /^(role|type|id|tabindex|accept|aria-[a-z]+)$/;

export interface ElementOptions {
  className?: string;
  text?: string;
  attributes?: Record<string, string>;
}

export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: ElementOptions = {},
  children: Node[] = [],
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (options.className !== undefined) element.className = options.className;
  if (options.text !== undefined) element.textContent = options.text;
  for (const [name, value] of Object.entries(options.attributes ?? {})) {
    if (!ALLOWED_ATTRIBUTES.test(name)) {
      throw new Error(`Attribut non autorisé : ${name}`);
    }
    element.setAttribute(name, value);
  }
  element.append(...children);
  return element;
}

/** Bouton natif : texte, classes et action au toucher ou à la touche Entrée. */
export function createButton(
  label: string,
  className: string,
  onActivate: () => void,
): HTMLButtonElement {
  const button = createElement('button', {
    className,
    text: label,
    attributes: { type: 'button' },
  });
  button.addEventListener('click', onActivate);
  return button;
}
