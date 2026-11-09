export function copier(source: Record<string, unknown>): Record<string, unknown> {
  return { ...source };
}
