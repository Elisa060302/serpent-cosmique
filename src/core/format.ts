/** Formats français : dates JJ/MM/AAAA, heure locale du téléphone, nombres avec espace pour les milliers (ENF-13). */

function pad(value: number, width = 2): string {
  return String(value).padStart(width, '0');
}

/** Heure locale du téléphone au format `AAAA-MM-JJTHH:MM:SS` (RG-86). */
export function formatLocalDateTime(date: Date): string {
  const day = `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  return `${day}T${time}`;
}

/** Date affichée JJ/MM/AAAA, à partir d'une heure locale `AAAA-MM-JJTHH:MM:SS` déjà validée. */
export function formatDate(dateTime: string): string {
  return `${dateTime.slice(8, 10)}/${dateTime.slice(5, 7)}/${dateTime.slice(0, 4)}`;
}

/** Nombre entier avec une espace insécable entre les milliers (« 1 000 »). */
export function formatNumber(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
}

/** Rang d'un record : 1er, 2e, 3e… */
export function rankLabel(rank: number): string {
  return rank === 1 ? '1er' : `${rank}e`;
}
