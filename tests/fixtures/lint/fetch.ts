export async function lire(): Promise<string> {
  const reponse = await fetch('/donnees');
  return reponse.text();
}
