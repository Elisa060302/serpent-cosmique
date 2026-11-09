// Produit les icônes PNG à partir de public/icons/icon.svg (à lancer une fois ; les PNG sont versionnés).
// Utilise Chromium de Playwright ; PLAYWRIGHT_BROWSERS_PATH désigne les navigateurs installés.
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const ICONS = [
  { file: 'icon-192.png', size: 192, scale: 1 },
  { file: 'icon-512.png', size: 512, scale: 1 },
  // Icône « maskable » : le dessin occupe 80 % du carré pour rester dans la zone de sécurité.
  { file: 'icon-maskable-512.png', size: 512, scale: 0.8 },
  { file: 'apple-touch-icon-180.png', size: 180, scale: 1 },
];
const BACKGROUND = '#0B1026';

const svg = readFileSync(new URL('../public/icons/icon.svg', import.meta.url), 'utf8');
const browser = await chromium.launch();
try {
  for (const { file, size, scale } of ICONS) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    const drawing = Math.round(size * scale);
    const offset = Math.round((size - drawing) / 2);
    await page.setContent(
      `<body style="margin:0;background:${BACKGROUND}">` +
        `<div style="position:absolute;left:${offset}px;top:${offset}px;width:${drawing}px;height:${drawing}px">` +
        svg.replace('<svg ', '<svg style="width:100%;height:100%" ') +
        '</div></body>',
    );
    const png = await page.screenshot({ type: 'png' });
    writeFileSync(new URL(`../public/icons/${file}`, import.meta.url), png);
    await page.close();
  }
} finally {
  await browser.close();
}
