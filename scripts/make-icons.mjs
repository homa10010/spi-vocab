// public/icon.svg から PNG アイコンを書き出す（Playwright の Chromium を使う）
import { createRequire } from 'node:module';

// Playwright はプロジェクトの依存に入れず、環境に入っているものを使う（NODE_PATH で解決）
const { chromium } = createRequire(import.meta.url)('playwright');
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(import.meta.dirname, '..', 'public');
const svg = readFileSync(join(dir, 'icon.svg'), 'utf8');
const browser = await chromium.launch();
for (const [name, size] of [['pwa-192.png', 192], ['pwa-512.png', 512], ['apple-touch-icon.png', 180]]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  // iOS は透過部分を黒く塗るので、apple-touch-icon は角を丸めない
  const src = name === 'apple-touch-icon.png' ? svg.replace('rx="96"', 'rx="0"') : svg;
  await page.setContent(`<style>html,body{margin:0}svg{width:${size}px;height:${size}px;display:block}</style>${src}`);
  await page.screenshot({ path: join(dir, name), omitBackground: true });
  await page.close();
}
await browser.close();
console.log('icons written');
