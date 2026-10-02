import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function check() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    userDataDir: path.resolve(__dirname, 'temp_profile'),
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  
  // 375px mobile test as student
  await page.setViewport({ width: 375, height: 812 });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
  await page.evaluate(async () => {
    await fetch('http://localhost/srps/api/auth/login.php', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'chukwuma.okonkwo@unn.edu.ng', password: 'Password123' })
    });
  });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#tab-results-btn');
  await page.screenshot({ path: path.resolve(__dirname, '..', 'screenshots', 'mobile_375px_student.png') });

  // Open mobile sidebar
  const toggleBtn = await page.$('.d-lg-none button');
  if (toggleBtn) {
    await toggleBtn.click();
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: path.resolve(__dirname, '..', 'screenshots', 'mobile_375px_sidebar_open.png') });
  }

  await browser.close();
  console.log('Mobile screenshots recaptured successfully.');
}

check();
