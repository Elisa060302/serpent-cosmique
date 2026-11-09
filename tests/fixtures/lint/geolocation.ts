export function localiser(rappel: PositionCallback): void {
  navigator.geolocation.getCurrentPosition(rappel);
}
