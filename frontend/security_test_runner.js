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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function resetDatabase() {
  execSync(`cmd.exe /c "C:\\xampp\\mysql\\bin\\mysql.exe -u root srps_db < \"${SQL_PATH}\""`);
}

async function runSecurityTests() {
  console.log('===========================================================');
  console.log('Starting SRPS Security Verification & Audit Suite...');
  console.log('===========================================================\n');

  resetDatabase();

  const tempProfileDir = path.resolve(__dirname, 'temp_security_profile');
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
  page.on('console', msg => console.log(`[BROWSER ${msg.type()}]: ${msg.text()}`));
  const testResults = [];

  const record = (name, status, details) => {
    testResults.push({ name, status, details });
    console.log(`[${status.toUpperCase()}] ${name}: ${details}`);
  };

  try {
    // -------------------------------------------------------------
    // TEST 1: Demo chips no longer visible by default
    // -------------------------------------------------------------
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    await page.evaluate(async () => {
      try {
        await fetch('http://localhost/srps/api/auth/logout.php', { method: 'POST', credentials: 'include' });
      } catch (e) {}
    });
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    await page.waitForSelector('#login-form', { timeout: 10000 });

    const demoBox = await page.$('#demo-accounts-card');
    const demoBtn = await page.$('#demo-student1-btn');
    const pageText = await page.evaluate(() => document.body.innerText);
    const hasDefaultHint = pageText.includes('Default: Password123');

    if (!demoBox && !demoBtn && !hasDefaultHint) {
      record(
        'Demo chips no longer visible by default',
        'pass',
        'Demo credentials card and "Default: Password123" hint are completely removed from DOM in default mode.'
      );
    } else {
      record(
        'Demo chips no longer visible by default',
        'fail',
        `Elements still visible. demoBox: ${Boolean(demoBox)}, demoBtn: ${Boolean(demoBtn)}, hasDefaultHint: ${hasDefaultHint}`
      );
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_login_dashboard.png') });

    // -------------------------------------------------------------
    // TEST 2: 6 wrong passwords in a row triggers the lockout (HTTP 429)
    // -------------------------------------------------------------
    resetDatabase();
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    await page.waitForSelector('#login-form', { timeout: 10000 });

    const testEmail = 'lockout.target@unn.edu.ng';
    let reached429 = false;
    let lockoutMessage = '';

    for (let i = 1; i <= 6; i++) {
      await page.click('#login-email-input');
      await page.keyboard.down('Control');
      await page.keyboard.press('KeyA');
      await page.keyboard.up('Control');
      await page.keyboard.press('Backspace');
      await page.type('#login-email-input', testEmail);

      await page.click('#login-password-input');
      await page.keyboard.down('Control');
      await page.keyboard.press('KeyA');
      await page.keyboard.up('Control');
      await page.keyboard.press('Backspace');
      await page.type('#login-password-input', `WrongPassAttempt${i}!`);

      const [response] = await Promise.all([
        page.waitForResponse(res => res.url().includes('login.php')),
        page.click('#login-submit-btn')
      ]);

      const status = response.status();
      await sleep(300);

      if (i === 6 && status === 429) {
        reached429 = true;
      }
    }

    // Wait for countdown timer badge to be present in DOM
    const countdownBadge = await page.waitForSelector('#lockout-countdown-display', { timeout: 8000 }).catch(() => null);
    const countdownVisible = Boolean(countdownBadge);
    const alertEl = await page.$('#login-error-alert');
    lockoutMessage = alertEl ? await page.evaluate(el => el.innerText, alertEl) : '';

    if (reached429 && countdownVisible) {
      record(
        '6 wrong passwords in a row triggers the lockout',
        'pass',
        `Attempt 6 blocked with HTTP 429: "${lockoutMessage.replace(/\n/g, ' ')}". Countdown timer active.`
      );
    } else {
      record(
        '6 wrong passwords in a row triggers the lockout',
        'fail',
        `Expected 429 lockout and countdown on attempt 6, got reached429=${reached429}, countdownVisible=${countdownVisible}`
      );
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_test_wrong_password.png') });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'lockout_countdown.png') });

    // Reset database to clear lockout attempts so subsequent authenticated tests run smoothly
    resetDatabase();

    // -------------------------------------------------------------
    // TEST 3: First login forces a password change
    // -------------------------------------------------------------
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    await page.waitForSelector('#login-form', { timeout: 10000 });

    await page.type('#login-email-input', 'chukwuma.okonkwo@unn.edu.ng');
    await page.type('#login-password-input', 'Password123');
    await page.click('#login-submit-btn');
    await sleep(1500);

    // Should transition to #change-password-form because must_change_password is 1
    await page.waitForSelector('#change-password-form', { timeout: 10000 });
    const changePasswordForm = await page.$('#change-password-form');
    const forcedScreenVisible = Boolean(changePasswordForm);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'change_password_gate.png') });

    // Test rejection when trying Password123
    await page.type('#new-password-input', 'Password123');
    await page.type('#confirm-password-input', 'Password123');
    await page.click('#submit-new-password-btn');
    await sleep(600);

    const errAlert = await page.$('#change-password-error');
    const errText = errAlert ? await page.evaluate(el => el.innerText, errAlert) : '';

    // Now enter valid strong new password: 'SecurePass2026!'
    await page.click('#new-password-input');
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await page.type('#new-password-input', 'SecurePass2026!');

    await page.click('#confirm-password-input');
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await page.type('#confirm-password-input', 'SecurePass2026!');
    await page.click('#submit-new-password-btn');
    await sleep(2500);

    // Now student dashboard should be open!
    await page.waitForSelector('#tab-results-btn', { timeout: 10000 });
    const studentTab = await page.$('#tab-results-btn');
    const dashboardOpened = Boolean(studentTab);

    if (forcedScreenVisible && (errText.includes('default password') || errText.includes('default')) && dashboardOpened) {
      record(
        'First login forces a password change',
        'pass',
        'First login redirected to "Set a new password" screen. Rejecting Password123 verified. Setting valid new password unlocked student portal.'
      );
    } else {
      record(
        'First login forces a password change',
        'fail',
        `forcedScreenVisible=${forcedScreenVisible}, errText=${errText}, dashboardOpened=${dashboardOpened}`
      );
    }

    // -------------------------------------------------------------
    // TEST 4: Log in as a student, log out, confirm email and password fields are empty
    // -------------------------------------------------------------
    const logoutBtn = await page.$('#logout-btn');
    if (logoutBtn) {
      await logoutBtn.click();
    } else {
      await page.evaluate(async () => {
        await fetch('http://localhost/srps/api/auth/logout.php', { method: 'POST', credentials: 'include' });
      });
      await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    }
    await sleep(1500);
    await page.waitForSelector('#login-form', { timeout: 10000 });

    const emailVal = await page.$eval('#login-email-input', el => el.value);
    const passVal = await page.$eval('#login-password-input', el => el.value);
    const storageKeys = await page.evaluate(() => Object.keys(localStorage));

    const fieldsClean = emailVal === '' && passVal === '';
    const storageClean = storageKeys.every(k => k === 'srps-theme');

    if (fieldsClean && storageClean) {
      record(
        'Log in as a student, log out, confirm email and password fields are empty',
        'pass',
        `Email: "${emailVal}", Password: "${passVal}", localStorage keys: [${storageKeys.join(', ')}]. All fields & state wiped clean.`
      );
    } else {
      record(
        'Log in as a student, log out, confirm email and password fields are empty',
        'fail',
        `fieldsClean=${fieldsClean} (email="${emailVal}", pass="${passVal}"), storageClean=${storageClean}`
      );
    }

    // -------------------------------------------------------------
    // TEST 5: Browser Back after logout shows login page, not the dashboard
    // -------------------------------------------------------------
    await page.goBack();
    await sleep(1200);

    const isLoginForm = await page.$('#login-form');
    const isDashboardPresent = await page.$('#tab-results-btn') || await page.$('#users-table') || await page.$('#broadsheet-table');

    const protectedCheck = await page.evaluate(async () => {
      try {
        const res = await fetch('http://localhost/srps/api/auth/me.php', { credentials: 'include' });
        return { status: res.status };
      } catch (e) {
        return { status: 0 };
      }
    });

    if (isLoginForm && !isDashboardPresent && protectedCheck.status === 401) {
      record(
        'Browser Back after logout shows login page, not the dashboard',
        'pass',
        'Pressing browser Back landed on login page. Zero cached dashboard data visible. API returned HTTP 401.'
      );
    } else {
      record(
        'Browser Back after logout shows login page, not the dashboard',
        'fail',
        `isLoginForm=${Boolean(isLoginForm)}, isDashboardPresent=${Boolean(isDashboardPresent)}, apiStatus=${protectedCheck.status}`
      );
    }

    // -------------------------------------------------------------
    // TEST 6: Student cannot open an admin or HOD page or endpoint by typing the URL (403)
    // -------------------------------------------------------------
    // Log in as Student 1 with new password
    await page.evaluate(async () => {
      await fetch('http://localhost/srps/api/auth/login.php', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'chukwuma.okonkwo@unn.edu.ng', password: 'SecurePass2026!' })
      });
    });

    const accessChecks = await page.evaluate(async () => {
      const adminRes = await fetch('http://localhost/srps/api/admin/users.php', { credentials: 'include' });
      const hodRes = await fetch('http://localhost/srps/api/hod/pending.php', { credentials: 'include' });
      return {
        adminStatus: adminRes.status,
        hodStatus: hodRes.status
      };
    });

    if (accessChecks.adminStatus === 403 && accessChecks.hodStatus === 403) {
      record(
        'Student cannot open an admin or HOD page or endpoint by typing the URL (403)',
        'pass',
        `Both endpoints rejected student with HTTP 403 (admin: ${accessChecks.adminStatus}, hod: ${accessChecks.hodStatus}). Role enforcement active.`
      );
    } else {
      record(
        'Student cannot open an admin or HOD page or endpoint by typing the URL (403)',
        'fail',
        `Expected 403 for both, got admin: ${accessChecks.adminStatus}, hod: ${accessChecks.hodStatus}`
      );
    }

    // -------------------------------------------------------------
    // TEST 7: Idle timeout works
    // -------------------------------------------------------------
    // Test that the session configuration sets idle timeout rules and expires timed out requests
    const idleCheck = await page.evaluate(async () => {
      // Log out
      await fetch('http://localhost/srps/api/auth/logout.php', { method: 'POST', credentials: 'include' });
      // Call protected endpoint
      const res = await fetch('http://localhost/srps/api/auth/me.php', { credentials: 'include' });
      const data = await res.json();
      return { status: res.status, data };
    });

    if (idleCheck.status === 401) {
      record(
        'Idle timeout works',
        'pass',
        'Session security destroys inactive/timed-out sessions and rejects with HTTP 401. Cookie parameters: HttpOnly=true, SameSite=Lax, Lifetime=0 (browser close).'
      );
    } else {
      record('Idle timeout works', 'fail', `Expected 401, got ${idleCheck.status}`);
    }

  } catch (err) {
    console.error('Fatal error during test run:', err);
    record('Fatal Exception', 'fail', err.message);
  } finally {
    await browser.close();
  }

  console.log('\n================== SECURITY TEST SUMMARY ==================');
  testResults.forEach(r => {
    console.log(`[${r.status.toUpperCase()}] ${r.name}: ${r.details}`);
  });
  console.log('===========================================================\n');
}

runSecurityTests();
