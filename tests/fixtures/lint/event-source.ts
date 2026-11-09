export function ouvrir(): EventSource {
  return new EventSource('/flux');
}
