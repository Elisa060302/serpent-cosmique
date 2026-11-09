export function lireMicro(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({ audio: true });
}
