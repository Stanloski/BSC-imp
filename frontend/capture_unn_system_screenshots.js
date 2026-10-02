import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOTS_DIR = path.resolve(__dirname, '..', 'screenshots');
const SQL_PATH = path.resolve(__dirname, '..', 'database', 'srps_db.sql');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function resetDatabase() {
  execSync(`cmd.exe /c "C:\\xampp\\mysql\\bin\\mysql.exe -u root srps_db < \"${SQL_PATH}\""`);
  console.log('Database reset to pristine seed state.');
}

function setMustChangePasswordFalse() {
  execSync(`cmd.exe /c "C:\\xampp\\mysql\\bin\\mysql.exe -u root srps_db -e \"UPDATE users SET must_change_password = 0;\""`);
  console.log('must_change_password temporarily set to 0 for dashboard captures.');
}

async function captureAll() {
  console.log('Starting full UNN Color & Shadow System screenshot capture...');

  const tempProfileDir = path.resolve(__dirname, 'temp_capture_profile');
  if (!fs.existsSync(tempProfileDir)) {
    fs.mkdirSync(tempProfileDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    userDataDir: tempProfileDir,
    defaultViewport: { width: 1366, height: 850 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    // 1. LOGIN SCREENSHOTS
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    await page.evaluate(async () => {
      try {
        await fetch('http://localhost/srps/api/auth/logout.php', { method: 'POST', credentials: 'include' });
      } catch (e) {}
    });
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    await page.waitForSelector('#login-form', { timeout: 10000 });

    // Ensure light mode first
    await page.evaluate(() => {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('srps-theme', 'light');
    });
    await sleep(400);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_login_dashboard.png') });
    console.log('Saved 01_login_dashboard.png (Light Mode)');

    // Toggle to dark mode on login page
    const loginThemeBtn = await page.$('#login-theme-toggle-btn');
    if (loginThemeBtn) {
      await loginThemeBtn.click();
    } else {
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('srps-theme', 'dark');
      });
    }
    await sleep(400);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'darkmode_login.png') });
    console.log('Saved darkmode_login.png (Dark Mode)');

    // Reset theme to light mode
    await page.evaluate(() => {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('srps-theme', 'light');
    });
    await sleep(200);

    // Prepare users for direct dashboard inspection
    setMustChangePasswordFalse();

    const rolesToCapture = [
      {
        name: 'Student',
        email: 'chukwuma.okonkwo@unn.edu.ng',
        lightFile: '02_student_dashboard.png',
        darkFile: '02_student_dashboard_dark.png',
        waitFor: '#tab-results-btn'
      },
      {
        name: 'Lecturer',
        email: 'chidinma.ani@unn.edu.ng',
        lightFile: '03_lecturer_dashboard.png',
        darkFile: '03_lecturer_dashboard_dark.png',
        waitFor: '#submit-scores-btn'
      },
      {
        name: 'ExamOfficer',
        email: 'obinna.okeke@unn.edu.ng',
        lightFile: '04_examofficer_dashboard.png',
        darkFile: '04_examofficer_dashboard_dark.png',
        waitFor: '#compute-all-btn'
      },
      {
        name: 'HOD',
        email: 'charles.ugwu@unn.edu.ng',
        lightFile: '05_hod_dashboard.png',
        darkFile: '05_hod_dashboard_dark.png',
        waitFor: '#filter-all-btn'
      },
      {
        name: 'Admin',
        email: 'admin@unn.edu.ng',
        lightFile: '06_admin_dashboard.png',
        darkFile: '06_admin_dashboard_dark.png',
        waitFor: '#add-user-modal-btn'
      }
    ];

    for (const r of rolesToCapture) {
      console.log(`\nLogging in as ${r.name} (${r.email})...`);

      // Make sure we are at login form
      await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
      const currentLogout = await page.$('#logout-btn');
      if (currentLogout) {
        await currentLogout.click();
        await page.waitForSelector('#login-form', { timeout: 8000 });
      }

      await page.waitForSelector('#login-email-input', { timeout: 8000 });

      // Clear email and type new one
      await page.click('#login-email-input');
      await page.keyboard.down('Control');
      await page.keyboard.press('KeyA');
      await page.keyboard.up('Control');
      await page.keyboard.press('Backspace');
      await page.type('#login-email-input', r.email);

      // Clear password and type Password123
      await page.click('#login-password-input');
      await page.keyboard.down('Control');
      await page.keyboard.press('KeyA');
      await page.keyboard.up('Control');
      await page.keyboard.press('Backspace');
      await page.type('#login-password-input', 'Password123');

      // Click Sign In
      await page.click('#login-submit-btn');

      // Wait for role dashboard element or logout button
      await page.waitForSelector('#logout-btn', { timeout: 12000 });
      await sleep(1500);

      // Ensure light mode for the first screenshot
      const isDark = await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'dark');
      if (isDark) {
        const themeBtnToggle = await page.$('#theme-toggle-btn');
        if (themeBtnToggle) {
          await themeBtnToggle.click();
          await sleep(400);
        }
      }

      // Capture Light Mode
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, r.lightFile) });
      console.log(`Saved ${r.lightFile} (Light Mode)`);

      // Switch to Dark Mode
      const themeBtn = await page.$('#theme-toggle-btn');
      if (themeBtn) {
        await themeBtn.click();
      } else {
        await page.evaluate(() => {
          document.documentElement.setAttribute('data-theme', 'dark');
          localStorage.setItem('srps-theme', 'dark');
        });
      }
      await sleep(500);

      // Capture Dark Mode
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, r.darkFile) });
      console.log(`Saved ${r.darkFile} (Dark Mode)`);

      // Switch back to light mode
      const themeBtnBack = await page.$('#theme-toggle-btn');
      if (themeBtnBack) {
        await themeBtnBack.click();
        await sleep(300);
      }

      // Log out
      const logoutBtn = await page.$('#logout-btn');
      if (logoutBtn) {
        await logoutBtn.click();
        await sleep(500);
      }
    }

    console.log('\nAll 12 light and dark dashboard screenshots captured successfully!');
  } catch (err) {
    console.error('Error during screenshot capture:', err);
  } finally {
    await browser.close();
    // Clean up temporary profile
    try {
      if (fs.existsSync(tempProfileDir)) {
        fs.rmSync(tempProfileDir, { recursive: true, force: true });
      }
    } catch (e) {}

    // Reset database back to pristine initial state
    resetDatabase();
  }
}

captureAll();
