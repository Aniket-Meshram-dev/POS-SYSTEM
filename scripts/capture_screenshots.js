import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.resolve(__dirname, '../docs/screenshots');
const VIDEO_DIR = path.resolve(__dirname, '../docs/videos');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}
if (!fs.existsSync(VIDEO_DIR)) {
  fs.mkdirSync(VIDEO_DIR, { recursive: true });
}

const BASE_URL = 'https://pos-system-97v.pages.dev';

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 350;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);
}

async function waitForPageData(page, timeout = 5000) {
  try {
    await page.waitForLoadState('networkidle', { timeout: 15000 });
  } catch (e) {
    console.log('  (networkidle timed out, proceeding with fixed delay)');
  }
  await page.waitForTimeout(timeout);
}

async function captureScreen(browser, { name, url, credentials, postLoginWait, isFullPage = true, video = false }) {
  console.log(`\n📸 Capturing: ${name}...`);
  const contextOptions = {
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    recordVideo: video ? { dir: VIDEO_DIR, size: { width: 1440, height: 900 } } : undefined
  };

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  try {
    if (credentials) {
      console.log(`  -> Logging in as: ${credentials.email}`);
      await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForSelector('input[type="email"]', { timeout: 10000 });

      // Fill credentials
      await page.fill('input[type="email"]', credentials.email);
      await page.fill('input[type="password"]', credentials.password);
      await page.waitForTimeout(500);

      // Submit
      await page.click('button[type="submit"]');

      // Wait for navigation away from login
      await page.waitForFunction(() => !window.location.pathname.includes('/auth/login'), { timeout: 25000 });
      console.log(`  -> Landed on: ${page.url()}`);

      await waitForPageData(page, postLoginWait || 4000);
    } else {
      console.log(`  -> Navigating directly to: ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await waitForPageData(page, 3000);
    }

    // Scroll down to trigger lazy loading and chart animations
    await autoScroll(page);

    const outputPath = path.join(OUTPUT_DIR, `${name}.png`);
    await page.screenshot({ path: outputPath, fullPage: isFullPage });
    console.log(`  ✅ Saved: docs/screenshots/${name}.png`);
  } catch (err) {
    console.error(`  ❌ Error capturing ${name}:`, err.message);
  } finally {
    await context.close();
  }
}

async function run() {
  console.log('====================================================');
  console.log('  NexPOS Automated Screen Capture Suite');
  console.log('====================================================');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const screens = [
    {
      name: '01-landing-page',
      url: `${BASE_URL}/`,
      isFullPage: true,
      video: true
    },
    {
      name: '02-login-page',
      url: `${BASE_URL}/auth/login`,
      isFullPage: true
    },
    {
      name: '03-super-admin-dashboard',
      credentials: {
        email: 'aniketmeshram445@gmail.com',
        password: 'Aniket123@'
      },
      postLoginWait: 5000,
      isFullPage: true
    },
    {
      name: '04-store-admin-dashboard',
      credentials: {
        email: 'sm2021jadhav@gmail.com',
        password: 'Swapnil123@'
      },
      postLoginWait: 5000,
      isFullPage: true
    },
    {
      name: '05-store-manager-dashboard',
      credentials: {
        email: 'pranaykawade839@gmail.com',
        password: 'Pranay123@'
      },
      postLoginWait: 5000,
      isFullPage: true
    },
    {
      name: '06-branch-admin-dashboard',
      credentials: {
        email: 'marigaming9@gmail.com',
        password: 'Mari123@'
      },
      postLoginWait: 5000,
      isFullPage: true
    },
    {
      name: '07-branch-manager-dashboard',
      credentials: {
        email: 'pravinmeshram0205@gmail.com',
        password: 'Pravin123@'
      },
      postLoginWait: 5000,
      isFullPage: true
    },
    {
      name: '08-cashier-terminal',
      credentials: {
        email: 'rakeshkamble1345@gmail.com',
        password: 'Rakesh123@'
      },
      postLoginWait: 5000,
      isFullPage: true
    },
    {
      name: '09-store-onboarding',
      url: `${BASE_URL}/auth/onboarding`,
      isFullPage: true
    }
  ];

  for (const screen of screens) {
    await captureScreen(browser, screen);
  }

  await browser.close();
  console.log('\n====================================================');
  console.log('🎉 All screenshots captured successfully!');
  console.log('====================================================\n');
}

run().catch(console.error);
