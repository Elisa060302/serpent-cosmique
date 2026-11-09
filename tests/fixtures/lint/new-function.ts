export function construire(code: string): unknown {
  return new Function(code);
}
