import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VIDEO_DIR = path.resolve(__dirname, '../docs/videos');
if (!fs.existsSync(VIDEO_DIR)) {
  fs.mkdirSync(VIDEO_DIR, { recursive: true });
}

const BASE_URL = 'https://pos-system-97v.pages.dev';

// Smooth human-like scroll helper
async function smoothScroll(page, targetY, step = 150, delay = 80) {
  await page.evaluate(
    async ({ targetY, step, delay }) => {
      await new Promise((resolve) => {
        let currentY = window.scrollY;
        const direction = targetY > currentY ? 1 : -1;
        const timer = setInterval(() => {
          currentY += direction * step;
          if ((direction === 1 && currentY >= targetY) || (direction === -1 && currentY <= targetY)) {
            window.scrollTo(0, targetY);
            clearInterval(timer);
            resolve();
          } else {
            window.scrollTo(0, currentY);
          }
        }, delay);
      });
    },
    { targetY, step, delay }
  );
}

// Full page scroll down and back up
async function showcasePageScroll(page, pauseAtBottom = 1200) {
  const maxScroll = await page.evaluate(() => document.body.scrollHeight - window.innerHeight);
  if (maxScroll > 100) {
    await smoothScroll(page, maxScroll, 220, 60);
    await page.waitForTimeout(pauseAtBottom);
    await smoothScroll(page, 0, 300, 40);
    await page.waitForTimeout(600);
  } else {
    await page.waitForTimeout(1500);
  }
}

async function safeClick(page, selector, timeout = 6000) {
  try {
    const el = page.locator(selector).first();
    await el.waitFor({ state: 'visible', timeout });
    await el.click();
    await page.waitForTimeout(1000);
    return true;
  } catch (e) {
    console.log(`    (Click skipped for ${selector})`);
    return false;
  }
}

async function loginUser(page, email, password) {
  console.log(`  🔑 Authenticating as: ${email}`);
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await page.waitForTimeout(800);

  await page.fill('input[type="email"]', email);
  await page.waitForTimeout(400);
  await page.fill('input[type="password"]', password);
  await page.waitForTimeout(500);

  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !window.location.pathname.includes('/auth/login'), { timeout: 25000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2500);
}

async function logoutUser(page) {
  console.log(`  🚪 Logging out...`);
  // Try finding Sign Out / Log Out button on sidebar or header
  const clicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, a'));
    const logoutBtn = buttons.find((b) => /sign out|log out/i.test(b.innerText || ''));
    if (logoutBtn) {
      logoutBtn.click();
      return true;
    }
    // Fallback: clear JWT from storage and navigate
    localStorage.removeItem('jwt');
    return false;
  });

  if (!clicked) {
    await page.evaluate(() => localStorage.removeItem('jwt'));
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded' });
  }
  await page.waitForTimeout(1500);
}

async function runWalkthrough() {
  console.log('====================================================');
  console.log('🎬 Starting NexPOS Master Walkthrough Video Recording');
  console.log('====================================================');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // Create single continuous recording context at crisp 1080p
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: VIDEO_DIR,
      size: { width: 1920, height: 1080 }
    }
  });

  const page = await context.newPage();

  try {
    // -------------------------------------------------------------
    // SCENE 1: MARKETING LANDING PAGE
    // -------------------------------------------------------------
    console.log('\n[1/8] 🌐 Recording Landing Page Showcase...');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Smooth scroll down entire landing page to reveal all sections
    const landingHeight = await page.evaluate(() => document.body.scrollHeight);
    await smoothScroll(page, landingHeight - 900, 250, 70);
    await page.waitForTimeout(1500);
    await smoothScroll(page, 0, 350, 40);
    await page.waitForTimeout(1000);

    // -------------------------------------------------------------
    // SCENE 2: ONBOARDING & LOGIN SCREENS
    // -------------------------------------------------------------
    console.log('\n[2/8] 📝 Recording Merchant Onboarding & Login Portals...');
    await page.goto(`${BASE_URL}/auth/onboarding`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await showcasePageScroll(page, 1000);

    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // -------------------------------------------------------------
    // SCENE 3: 👑 SUPER ADMIN PLATFORM MASTER TOUR
    // -------------------------------------------------------------
    console.log('\n[3/8] 👑 Recording Super Admin Master Console & All Tabs...');
    await loginUser(page, 'aniketmeshram445@gmail.com', 'Aniket123@');
    await showcasePageScroll(page, 1500);

    // Visit Super Admin Sidebar Pages
    const superAdminTabs = [
      { name: 'Registered Stores', path: '/super-admin/stores' },
      { name: 'Store Requests', path: '/super-admin/requests' },
      { name: 'Subscription Plans', path: '/super-admin/subscriptions' },
      { name: 'Inquiries', path: '/super-admin/inquiries' },
      { name: 'Commissions', path: '/super-admin/commissions' },
      { name: 'Audit Trail', path: '/super-admin/audit-logs' },
      { name: 'Data Exports', path: '/super-admin/exports' },
      { name: 'Platform Settings', path: '/super-admin/settings' }
    ];

    for (const tab of superAdminTabs) {
      console.log(`    -> Tab: ${tab.name}`);
      await page.goto(`${BASE_URL}${tab.path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      await showcasePageScroll(page, 1000);
    }

    await logoutUser(page);

    // -------------------------------------------------------------
    // SCENE 4: 🏢 STORE ADMIN (BUSINESS OWNER) TOUR
    // -------------------------------------------------------------
    console.log('\n[4/8] 🏢 Recording Store Admin Command Center & Tabs...');
    await loginUser(page, 'sm2021jadhav@gmail.com', 'Swapnil123@');
    await showcasePageScroll(page, 1500);

    const storeTabs = [
      { name: 'Store Profile', path: '/store/stores' },
      { name: 'Branches Fleet', path: '/store/branches' },
      { name: 'Master Catalog (3500 SKUs)', path: '/store/products' },
      { name: 'Categories & GST', path: '/store/categories' },
      { name: 'Staff Management', path: '/store/employees' },
      { name: 'Anomaly & Stock Alerts', path: '/store/alerts' },
      { name: 'Consolidated Sales', path: '/store/sales' },
      { name: 'Financial Reports', path: '/store/reports' },
      { name: 'Subscription Upgrade', path: '/store/upgrade' },
      { name: 'Store Settings', path: '/store/settings' }
    ];

    for (const tab of storeTabs) {
      console.log(`    -> Tab: ${tab.name}`);
      await page.goto(`${BASE_URL}${tab.path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2200);
      await showcasePageScroll(page, 1000);
    }

    await logoutUser(page);

    // -------------------------------------------------------------
    // SCENE 5: 👨‍💼 STORE MANAGER WORKSPACE
    // -------------------------------------------------------------
    console.log('\n[5/8] 👨‍💼 Recording Store Manager Operations...');
    await loginUser(page, 'pranaykawade839@gmail.com', 'Pranay123@');
    await showcasePageScroll(page, 1500);
    await logoutUser(page);

    // -------------------------------------------------------------
    // SCENE 6: 🏪 BRANCH ADMIN CONSOLE
    // -------------------------------------------------------------
    console.log('\n[6/8] 🏪 Recording Branch Admin Console & All Tabs...');
    await loginUser(page, 'marigaming9@gmail.com', 'Mari123@');
    await showcasePageScroll(page, 1500);

    const branchTabs = [
      { name: 'Branch Orders', path: '/branch/orders' },
      { name: 'Returns & Refunds', path: '/branch/refunds' },
      { name: 'Transactions Ledger', path: '/branch/transactions' },
      { name: 'Branch Stock Levels', path: '/branch/inventory' },
      { name: 'Branch Staff Roster', path: '/branch/employees' },
      { name: 'Customer CRM', path: '/branch/customers' },
      { name: 'End of Day Reports', path: '/branch/reports' },
      { name: 'Branch Settings', path: '/branch/settings' }
    ];

    for (const tab of branchTabs) {
      console.log(`    -> Tab: ${tab.name}`);
      await page.goto(`${BASE_URL}${tab.path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      await showcasePageScroll(page, 1000);
    }

    await logoutUser(page);

    // -------------------------------------------------------------
    // SCENE 7: 📊 BRANCH MANAGER OPERATIONS
    // -------------------------------------------------------------
    console.log('\n[7/8] 📊 Recording Branch Manager Operations...');
    await loginUser(page, 'pravinmeshram0205@gmail.com', 'Pravin123@');
    await showcasePageScroll(page, 1500);
    await logoutUser(page);

    // -------------------------------------------------------------
    // SCENE 8: 💰 HIGH-SPEED CASHIER TERMINAL (LIVE BILLING DEMO)
    // -------------------------------------------------------------
    console.log('\n[8/8] 💰 Recording Live POS Terminal & Checkout Flow...');
    await loginUser(page, 'rakeshkamble1345@gmail.com', 'Rakesh123@');
    await page.goto(`${BASE_URL}/cashier`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);

    // Demonstrate category filtering
    console.log('    -> Clicking Category filters...');
    await safeClick(page, 'button:has-text("Beverages"), button:has-text("Grocery")');
    await page.waitForTimeout(1000);

    // Search for a product
    console.log('    -> Searching for "Rice" in POS search...');
    const searchInput = page.locator('input[placeholder*="Scan barcode"], input[placeholder*="Search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('Rice');
      await page.waitForTimeout(1200);
      await searchInput.fill('');
      await page.waitForTimeout(800);
    }

    // Add items to cart
    console.log('    -> Adding items to active cart...');
    const addButtons = page.locator('button:has-text("+"), button:has(.lucide-plus)');
    const btnCount = await addButtons.count();
    if (btnCount > 0) {
      for (let i = 0; i < Math.min(3, btnCount); i++) {
        await addButtons.nth(i).click().catch(() => {});
        await page.waitForTimeout(600);
      }
    }

    // Show discount and payment modal
    console.log('    -> Interacting with discounts & checkout drawer...');
    await safeClick(page, 'button:has-text("10%"), button:has-text("5%")');
    await page.waitForTimeout(1000);

    // Click Process Tender Settlement button to show payment modal
    console.log('    -> Opening Tender Settlement Modal...');
    await safeClick(page, 'button:has-text("Process Tender Settlement"), button:has-text("Pay")');
    await page.waitForTimeout(2500);

    // Close modal if opened (press Escape)
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    // Visit Cashier Sub-routes
    const cashierTabs = [
      { name: 'Order History', path: '/cashier/orders' },
      { name: 'Returns Desk', path: '/cashier/returns' },
      { name: 'Customer Lookup', path: '/cashier/customers' },
      { name: 'Shift Summary & Till Balancing', path: '/cashier/shift-summary' }
    ];

    for (const tab of cashierTabs) {
      console.log(`    -> Cashier Tab: ${tab.name}`);
      await page.goto(`${BASE_URL}${tab.path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      await showcasePageScroll(page, 1000);
    }

    console.log('\n✅ Walkthrough sequence completed successfully!');
    await page.waitForTimeout(2000);
  } catch (err) {
    console.error('❌ Error during walkthrough recording:', err);
  } finally {
    // Closing the page saves the WebM video cleanly
    const videoObj = page.video();
    await page.close();
    await context.close();
    await browser.close();

    if (videoObj) {
      const videoPath = await videoObj.path();
      const finalDest = path.join(VIDEO_DIR, 'nexpos-walkthrough.webm');
      try {
        fs.copyFileSync(videoPath, finalDest);
        console.log(`\n🎉 Master Walkthrough Video saved: docs/videos/nexpos-walkthrough.webm`);
      } catch (e) {
        console.log(`Video saved at: ${videoPath}`);
      }
    }
  }
}

runWalkthrough().catch(console.error);
