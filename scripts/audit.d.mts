export const EXCEPTIONS: { id: string; until: string; reason: string }[];
export function blockingAdvisories(
  report: object,
  now?: Date,
  exceptions?: { id: string; until: string; reason: string }[],
): string[];
