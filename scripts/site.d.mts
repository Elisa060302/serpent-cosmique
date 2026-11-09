export const SW_MAX_BYTES: number;
export function finalizeSite(options: { root: string; dir: string; version?: string }): {
  version: string;
  files: number;
  swBytes: number;
};
