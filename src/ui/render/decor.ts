import { createRandom } from '../../core/random.ts';
import { DECORS, DEFAULT_DECOR, GRID, SKY, TWINKLE } from '../../core/rules.ts';

type Decor = (typeof DECORS)[keyof typeof DECORS];

/** Le décor d'un identifiant de skin ; tout identifiant inconnu donne « Nuit étoilée ». */
export function decorOf(id: string): Decor {
  return Object.hasOwn(DECORS, id) ? DECORS[id as keyof typeof DECORS] : DEFAULT_DECOR;
}

/** Couleur `#RRGGBB` avec une opacité, pour les dégradés qui s'éteignent vers le décor. */
function withAlpha(hex: string, alpha: number): string {
  const channel = (offset: number): number => parseInt(hex.slice(offset, offset + 2), 16);
  return `rgb(${channel(1)} ${channel(3)} ${channel(5)} / ${alpha})`;
}

/** Nuages de la nébuleuse : de grandes taches douces, dans des violets sombres. */
function drawClouds(
  context: CanvasRenderingContext2D,
  colors: readonly string[],
  width: number,
  height: number,
  cell: number,
): void {
  const random = createRandom(5);
  for (let cloud = 0; cloud < 4; cloud += 1) {
    const color = colors[cloud % colors.length] ?? DEFAULT_DECOR.base;
    const cx = random.next() * width;
    const cy = random.next() * height;
    const radius = cell * (4 + 3 * random.next());
    const gradient = context.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, withAlpha(color, 0.9));
    gradient.addColorStop(1, withAlpha(color, 0));
    context.fillStyle = gradient;
    context.fillRect(cx - radius, cy - radius, 2 * radius, 2 * radius);
  }
}

/** Planète bonbon : un disque sombre entouré d'un anneau incliné dont la moitié avant passe devant. */
function drawPlanet(
  context: CanvasRenderingContext2D,
  colors: readonly string[],
  width: number,
  height: number,
  cell: number,
): void {
  const cx = width * 0.82;
  const cy = height * 0.3;
  const [body, ring] = [colors[0] ?? DEFAULT_DECOR.base, colors[1] ?? DEFAULT_DECOR.base];
  context.lineWidth = cell * 0.35;
  context.strokeStyle = ring;
  context.beginPath();
  context.ellipse(cx, cy, cell * 3.6, cell * 1, -0.35, 0, Math.PI * 2);
  context.stroke();
  context.fillStyle = body;
  context.beginPath();
  context.arc(cx, cy, cell * 2.2, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.ellipse(cx, cy, cell * 3.6, cell * 1, -0.35, 0, Math.PI);
  context.stroke();
}

/** Voie lactée : une bande claire en diagonale, semée de fines poussières d'étoiles. */
function drawBand(
  context: CanvasRenderingContext2D,
  colors: readonly string[],
  width: number,
  height: number,
  cell: number,
): void {
  const color = colors[0] ?? DEFAULT_DECOR.base;
  context.lineCap = 'round';
  context.lineWidth = cell * 3;
  context.strokeStyle = withAlpha(color, 0.35);
  context.beginPath();
  context.moveTo(-cell, height * 0.9);
  context.lineTo(width + cell, height * 0.1);
  context.stroke();
  context.fillStyle = color;
  const random = createRandom(9);
  for (let dust = 0; dust < 160; dust += 1) {
    const along = random.next();
    const spread = (random.next() - 0.5) * cell * 3;
    context.fillRect(along * width, height * (0.9 - 0.8 * along) + spread, 1, 1);
  }
}

/** Dessine le fond d'un décor : base, dessin propre au décor, étoiles, quadrillage très discret. */
function paintDecor(
  context: CanvasRenderingContext2D,
  decor: Decor,
  width: number,
  height: number,
  cell: number,
): void {
  context.fillStyle = decor.base;
  context.fillRect(0, 0, width, height);

  const feature = decor.feature;
  if (feature !== null) {
    if (feature.kind === 'clouds') drawClouds(context, feature.colors, width, height, cell);
    else if (feature.kind === 'planet') drawPlanet(context, feature.colors, width, height, cell);
    else drawBand(context, feature.colors, width, height, cell);
  }

  context.fillStyle = decor.star;
  const random = createRandom(decor.starSeed);
  for (let index = 0; index < decor.starCount; index += 1) {
    const size = 1 + random.nextInt(2);
    context.fillRect(random.next() * width, random.next() * height, size, size);
  }

  // Quadrillage très discret : il ne porte aucune information.
  context.strokeStyle = decor.grid;
  context.lineWidth = 1;
  context.beginPath();
  for (let column = 1; column < GRID.columns; column += 1) {
    context.moveTo(column * cell + 0.5, 0);
    context.lineTo(column * cell + 0.5, height);
  }
  for (let row = 1; row < GRID.rows; row += 1) {
    context.moveTo(0, row * cell + 0.5);
    context.lineTo(width, row * cell + 0.5);
  }
  context.stroke();
}

/**
 * Ajoute au ciel la n-ième constellation (RG-42) : quelques étoiles reliées par un trait fin, à une place qui ne
 * dépend que de n. Purement visuel, dans la couleur des détails de décor.
 */
export function drawConstellation(
  context: CanvasRenderingContext2D,
  index: number,
  cell: number,
): void {
  const random = createRandom(SKY.seed + index * 101);
  const spanX = SKY.spanCells.columns * cell;
  const spanY = SKY.spanCells.rows * cell;
  const originX = random.next() * (GRID.columns * cell - spanX);
  const originY = random.next() * (GRID.rows * cell - spanY);
  const stars: [number, number][] = [];
  for (let star = 0; star < SKY.stars; star += 1) {
    stars.push([originX + random.next() * spanX, originY + random.next() * spanY]);
  }
  context.strokeStyle = SKY.color;
  context.fillStyle = SKY.color;
  context.lineWidth = 1;
  context.beginPath();
  stars.forEach(([x, y], order) => {
    if (order === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();
  for (const [x, y] of stars) {
    context.beginPath();
    context.arc(x, y, Math.max(1.5, cell * SKY.starRadius), 0, Math.PI * 2);
    context.fill();
  }
}

/**
 * Décor choisi, dessiné une fois pour toute la partie, avec les constellations déjà complétées (RG-42).
 * `completed` constellations au plus `SKY.max` sont dessinées.
 */
export function renderDecor(
  cell: number,
  pixelRatio: number,
  decorId: string,
  completed = 0,
): HTMLCanvasElement {
  const width = cell * GRID.columns;
  const height = cell * GRID.rows;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  const context = canvas.getContext('2d');
  if (context === null) return canvas;
  context.scale(pixelRatio, pixelRatio);
  paintDecor(context, decorOf(decorId), width, height, cell);
  for (let index = 0; index < Math.min(completed, SKY.max); index += 1) {
    drawConstellation(context, index, cell);
  }
  return canvas;
}

/** Ajoute une constellation à un décor déjà dessiné (au plus `SKY.max` en tout). */
export function addConstellation(
  canvas: HTMLCanvasElement,
  index: number,
  cell: number,
  pixelRatio: number,
): void {
  const context = canvas.getContext('2d');
  if (context === null || index >= SKY.max) return;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  drawConstellation(context, index, cell);
}

/** Position d'une étoile qui scintille, en fraction de l'aire de jeu. */
function twinklePositions(decor: Decor): [number, number][] {
  const random = createRandom(TWINKLE.seed + decor.starSeed);
  return Array.from({ length: TWINKLE.count }, () => [random.next(), random.next()]);
}

const twinkleCache = new Map<Decor, [number, number][]>();

/**
 * Étoiles qui scintillent (ENF-12) : chacune alterne entre deux états toutes les `TWINKLE.stateMs` millisecondes
 * de temps de jeu (moins de 3 changements par seconde). Le temps ne passe ni en pause ni avec le mouvement réduit.
 */
export function drawTwinkle(
  context: CanvasRenderingContext2D,
  decorId: string,
  cell: number,
  animationMs: number,
): void {
  const decor = decorOf(decorId);
  let positions = twinkleCache.get(decor);
  if (positions === undefined) {
    positions = twinklePositions(decor);
    twinkleCache.set(decor, positions);
  }
  positions.forEach(([u, v], order) => {
    const bright = (Math.floor(animationMs / TWINKLE.stateMs) + order) % 2 === 1;
    context.fillStyle = bright ? decor.twinkle : decor.star;
    // La petite étoile (2 pixels) reste entière dans l'aire de jeu, même tirée tout au bord.
    const x = Math.min(Math.floor(u * GRID.columns * cell), GRID.columns * cell - 2);
    const y = Math.min(Math.floor(v * GRID.rows * cell), GRID.rows * cell - 2);
    context.fillRect(x, y, 2, 2);
  });
}
