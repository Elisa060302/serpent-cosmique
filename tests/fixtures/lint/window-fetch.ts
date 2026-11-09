export async function lire(): Promise<string> {
  const reponse = await window.fetch('/donnees');
  return reponse.text();
}
