import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const URL = 'http://localhost:5173';
const OUT = './scripts/screenshots';
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet',  width: 768,  height: 1024 },
  { name: 'mobile',  width: 390,  height: 844 },
];

const SECTIONS = [
  { name: '01-hero',        id: 'hero' },
  { name: '02-espectro',    id: 'espectro' },
  { name: '03-spread',      id: 'spread' },
  { name: '04-consultoria', id: 'consultoria' },
  { name: '05-simulador',   id: 'simulador' },
  { name: '06-governanca',  id: 'governanca' },
];

const browser = await chromium.launch();

for (const vp of VIEWPORTS) {
  const page = await browser.newPage();
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.goto(URL, { waitUntil: 'networkidle' });

  // Full page
  await page.screenshot({ path: `${OUT}/${vp.name}-full.png`, fullPage: true, scale: 'css' });
  console.log(`✓ ${vp.name} full page`);

  // Por seção
  for (const section of SECTIONS) {
    const el = page.locator(`#${section.id}`);
    const count = await el.count();
    if (count > 0) {
      await el.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${OUT}/${vp.name}-${section.name}.png` });
      console.log(`✓ ${vp.name} ${section.name}`);
    }
  }

  // Modal aberto
  await page.goto(URL, { waitUntil: 'networkidle' });
  if (vp.width < 1024) {
    await page.locator('.hamburger-btn').click();
    await page.waitForTimeout(600);
    await page.locator('.btn-primary-gold').last().click({ force: true });
  } else {
    await page.locator('.btn-primary-gold').first().click();
  }
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${vp.name}-modal.png` });
  console.log(`✓ ${vp.name} modal`);

  await page.close();
}

await browser.close();
console.log(`\n✅ Screenshots salvas em ${OUT}`);
