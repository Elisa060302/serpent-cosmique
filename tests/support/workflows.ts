/** Lecture des fichiers de workflow GitHub Actions par les tests. */

/** Blocs `run:` d’un workflow (texte du bloc, une chaîne par bloc). */
export function runBlocks(workflow: string): string[] {
  const lines = workflow.split('\n');
  const blocks: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = /^(\s*)(?:- )?run:\s*(.*)$/.exec(lines[index] ?? '');
    if (!match) continue;
    const keyIndent = (match[1] ?? '').length;
    const body = [match[2] ?? ''];
    while (index + 1 < lines.length) {
      const next = lines[index + 1] ?? '';
      if (next.trim() !== '' && next.length - next.trimStart().length <= keyIndent) break;
      body.push(next);
      index += 1;
    }
    blocks.push(body.join('\n'));
  }
  return blocks;
}
