import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, 'screenshots');
const BASE_URL = 'http://localhost:5173';

const SECTIONS = [
  { name: '01-header-topbar',   scroll: 0,    clip: { x: 0, y: 0, width: 1440, height: 100 } },
  { name: '02-header-full',     scroll: 0,    clip: { x: 0, y: 0, width: 1440, height: 160 } },
  { name: '03-header-scrolled', scroll: 200,  clip: { x: 0, y: 0, width: 1440, height: 80  } },
  { name: '04-hero-full',       scroll: 0,    clip: { x: 0, y: 0, width: 1440, height: 900 } },
  { name: '05-hero-headline',   scroll: 160,  clip: { x: 0, y: 0, width: 1440, height: 500 } },
  { name: '06-hero-cards',      scroll: 600,  clip: { x: 0, y: 0, width: 1440, height: 400 } },
  { name: '07-espectro',        scroll: 1100, clip: { x: 0, y: 0, width: 1440, height: 800 } },
  { name: '08-spread',          scroll: 2000, clip: { x: 0, y: 0, width: 1440, height: 800 } },
  { name: '09-consultoria',     scroll: 3000, clip: { x: 0, y: 0, width: 1440, height: 800 } },
  { name: '10-simulador',       scroll: 4000, clip: { x: 0, y: 0, width: 1440, height: 800 } },
  { name: '11-governanca',      scroll: 5000, clip: { x: 0, y: 0, width: 1440, height: 800 } },
  { name: '12-footer',          scroll: 9999, clip: { x: 0, y: 0, width: 1440, height: 500 } },
  { name: '13-mobile-header',   scroll: 0,    clip: { x: 0, y: 0, width: 390,  height: 160 }, mobile: true },
  { name: '14-mobile-hero',     scroll: 0,    clip: { x: 0, y: 0, width: 390,  height: 700 }, mobile: true },
];

(async () => {
  const browser = await chromium.launch();

  for (const section of SECTIONS) {
    const ctx = await browser.newContext({
      viewport: section.mobile
        ? { width: 390, height: 844 }
        : { width: 1440, height: 900 },
    });

    const page = await ctx.newPage();
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    if (section.scroll === 9999) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    } else {
      await page.evaluate((y) => window.scrollTo(0, y), section.scroll);
    }

    await page.waitForTimeout(400);

    await page.screenshot({
      path: join(OUT, `${section.name}.png`),
      clip: section.clip,
    });

    console.log(`✓ ${section.name}.png`);
    await ctx.close();
  }

  await browser.close();
  console.log(`\nScreenshots salvas em /screenshots`);
})();
