const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const root = path.resolve(__dirname, '..');
const stories = require(path.join(root, 'content/sobriety-chip-stories.json'));
const outputDir = process.env.CHIP_PREVIEW_OUTPUT_DIR || path.join(root, '.turbo/sobriety-previews');
const baseUrl = process.env.CHIP_PREVIEW_BASE_URL || 'http://localhost:3000';

async function main() {
  const args = process.argv.slice(2);
  const onlyArg = args.find((arg) => arg.startsWith('--only='));
  const all = args.includes('--all');
  const force = args.includes('--force');
  if (!onlyArg && !all) throw new Error('Use --only=24-hours,30-days or --all. Add --force to replace existing previews.');
  const ids = onlyArg
    ? onlyArg.slice('--only='.length).split(',').map((id) => id.trim()).filter(Boolean)
    : Object.keys(stories);
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
  });
  const failures = [];
  try {
    for (const id of ids) {
      if (!stories[id]) throw new Error(`Unknown milestone: ${id}`);
      const output = path.join(outputDir, `${id}.jpg`);
      if (!force && fs.existsSync(output)) {
        console.log(`Skipping ${id}; preview exists.`);
        continue;
      }
      const page = await browser.newPage();
      try {
        console.log(`Rendering ${id}…`);
        await page.setViewport({ width: 1000, height: 1000 });
        await page.goto(`${baseUrl}/sobriety-chips/${id}`, {
          waitUntil: 'domcontentloaded',
          timeout: 60000,
        });
        await page.waitForFunction(() => {
          const button = document.querySelector('button[aria-label="Play with narration"]');
          return button && !button.disabled && !document.body.innerText.includes('Preparing this milestone');
        }, { timeout: 90000, polling: 500 });
        await page.evaluate(() => {
          document.querySelector('[aria-label="Seek story preview"]')?.scrollIntoView({ block: 'center' });
        });
        const slider = await page.$('[aria-label="Seek story preview"]');
        if (!slider) throw new Error('Seek slider not found.');
        const bounds = await slider.boundingBox();
        if (!bounds) throw new Error('Seek slider has no bounds.');
        await page.mouse.click(bounds.x + bounds.width * 0.3, bounds.y + bounds.height / 2);
        await new Promise((resolve) => setTimeout(resolve, 500));
        await page.addStyleTag({ content: '.absolute.inset-x-0.bottom-6 { display: none !important; }' });
        const canvas = await page.$('canvas');
        if (!canvas) throw new Error('Story canvas not found.');
        await canvas.screenshot({ path: output, type: 'jpeg', quality: 86 });
        console.log(`Saved ${output}.`);
      } catch (error) {
        failures.push({ id, error: error.message });
        console.error(`Failed ${id}: ${error.message}`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
  if (failures.length) {
    throw new Error(`Failed previews: ${failures.map((entry) => entry.id).join(', ')}`);
  }
  console.log(`Generated ${ids.length} real renderer preview(s).`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
