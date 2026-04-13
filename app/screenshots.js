const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  // 1. Chat page (will trigger user creation + opening message attempt)
  console.log('Screenshotting /chat ...');
  await page.goto('http://localhost:3456/chat', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000); // let UI settle
  await page.screenshot({ path: '/tmp/screenshot_chat.png', fullPage: false });

  // 2. Roadmap page
  console.log('Screenshotting /roadmap ...');
  await page.goto('http://localhost:3456/roadmap', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/screenshot_roadmap.png', fullPage: true });

  // 3. Beliefs page
  console.log('Screenshotting /beliefs ...');
  await page.goto('http://localhost:3456/beliefs', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/screenshot_beliefs.png', fullPage: false });

  // 4. Learnings page
  console.log('Screenshotting /learnings ...');
  await page.goto('http://localhost:3456/learnings', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/screenshot_learnings.png', fullPage: false });

  // 5. Ritual page
  console.log('Screenshotting /ritual ...');
  await page.goto('http://localhost:3456/ritual', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/screenshot_ritual.png', fullPage: false });

  await browser.close();
  console.log('All screenshots saved to /tmp/');
})();
