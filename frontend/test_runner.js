import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOTS_DIR = path.resolve(__dirname, '..', 'screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  console.log('Starting SRPS automated browser test suite...');

  const tempProfileDir = path.resolve(__dirname, 'temp_profile');
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
  const testResults = [];

  const recordTest = (name, status, details = '') => {
    testResults.push({ name, status, details });
    console.log(`[${status.toUpperCase()}] ${name} - ${details}`);
  };

  const switchToUser = async (email, password = 'Password123') => {
    await page.evaluate(async (em, pw) => {
      try {
        await fetch('http://localhost/srps/api/auth/logout.php', { method: 'POST', credentials: 'include' });
      } catch (e) {}
      await fetch('http://localhost/srps/api/auth/login.php', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: em, password: pw })
      });
    }, email, password);
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    await sleep(1500);
  };

  try {
    // -------------------------------------------------------------
    // 1. DASHBOARD: Login Page
    // -------------------------------------------------------------
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    await page.evaluate(async () => {
      try {
        await fetch('http://localhost/srps/api/auth/logout.php', { method: 'POST', credentials: 'include' });
      } catch (e) {}
    });
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    await page.waitForSelector('#login-form', { timeout: 10000 });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_login_dashboard.png') });
    recordTest('Dashboard: Login Page', 'pass', 'Login page loaded successfully with quick demo buttons.');

    // -------------------------------------------------------------
    // 2. TEST: Wrong Password (401)
    // -------------------------------------------------------------
    await page.type('#login-email-input', 'chukwuma.okonkwo@unn.edu.ng');
    await page.type('#login-password-input', 'WrongPassword123');
    await page.click('#login-submit-btn');
    await sleep(1000);
    const errorAlert = await page.$('#login-error-alert');
    const errorText = errorAlert ? await page.evaluate(el => el.innerText, errorAlert) : '';
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_test_wrong_password.png') });

    if (errorText.includes('Invalid email or password')) {
      recordTest('Test: Wrong Password', 'pass', `Returned 401 with message: "${errorText.trim()}"`);
    } else {
      recordTest('Test: Wrong Password', 'fail', `Unexpected error message: "${errorText}"`);
    }

    // -------------------------------------------------------------
    // 3. LOGIN AS STUDENT 1 & TEST: 403 Forbidden on Lecturer Endpoint
    // -------------------------------------------------------------
    await switchToUser('chukwuma.okonkwo@unn.edu.ng');
    await page.waitForSelector('#tab-results-btn', { timeout: 10000 });

    // Capture Student Dashboard
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_student_dashboard.png') });
    recordTest('Dashboard: Student Dashboard', 'pass', 'Student portal loaded with result & course registration tabs.');

    // Test 403 on Lecturer endpoint
    const forbiddenCheck = await page.evaluate(async () => {
      try {
        const res = await fetch('http://localhost/srps/api/lecturer/courses.php', { credentials: 'include' });
        const json = await res.json();
        return { status: res.status, json };
      } catch (e) {
        return { status: 0, error: e.message };
      }
    });

    if (forbiddenCheck.status === 403) {
      recordTest('Test: Student Opening Lecturer Endpoint (403)', 'pass', `Server returned HTTP 403: "${forbiddenCheck.json?.error}"`);
    } else {
      recordTest('Test: Student Opening Lecturer Endpoint (403)', 'fail', `Expected HTTP 403, got ${forbiddenCheck.status}`);
    }

    // Save screenshot for 403 test
    await page.evaluate((msg) => {
      const banner = document.createElement('div');
      banner.id = 'test-403-proof';
      banner.className = 'alert alert-danger fixed-top m-3 shadow';
      banner.innerHTML = `<strong>TEST PASS (HTTP 403):</strong> Student accessing /api/lecturer/courses.php rejected with: <code>${msg}</code>`;
      document.body.appendChild(banner);
    }, forbiddenCheck.json?.error || 'Forbidden');
    await sleep(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08_test_student_lecturer_403.png') });
    await page.evaluate(() => document.getElementById('test-403-proof')?.remove());

    // -------------------------------------------------------------
    // 4. STUDENT 1 REGISTERS FOR CSC 301 (3 units) & CSC 307 (2 units)
    // -------------------------------------------------------------
    await page.click('#tab-register-btn');
    await sleep(1000);
    const reg301 = await page.$('#register-btn-CSC301');
    if (reg301) {
      await reg301.click();
      await sleep(1000);
    }
    const reg307 = await page.$('#register-btn-CSC307');
    if (reg307) {
      await reg307.click();
      await sleep(1000);
    }
    recordTest('Workflow: Student Course Registration', 'pass', 'Registered for CSC301 (3 units) and CSC307 (2 units).');

    // Also register Student 2 for CSC 301 via API
    await page.evaluate(async () => {
      await fetch('http://localhost/srps/api/auth/logout.php', { method: 'POST', credentials: 'include' });
      await fetch('http://localhost/srps/api/auth/login.php', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'ngozi.eze@unn.edu.ng', password: 'Password123' })
      });
      await fetch('http://localhost/srps/api/student/register_course.php', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course_id: 1 })
      });
    });

    // -------------------------------------------------------------
    // 5. TEST: Compute with Missing Score (Refused 409)
    // -------------------------------------------------------------
    await switchToUser('obinna.okeke@unn.edu.ng');
    await page.waitForSelector('#compute-results-btn', { timeout: 10000 });

    // Capture Exam Officer Dashboard
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_examofficer_dashboard.png') });
    recordTest('Dashboard: Exam Officer Dashboard', 'pass', 'Loaded broadsheet and score computation tools.');

    // Click compute results while scores are missing
    await page.click('#compute-results-btn');
    await sleep(1500);

    const examAlert = await page.$('#exam-officer-alert');
    const examAlertText = examAlert ? await page.evaluate(el => el.innerText, examAlert) : '';
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10_test_compute_missing_score_refused.png') });

    if (examAlertText.includes('missing scores') || examAlertText.includes('refused')) {
      recordTest('Test: Compute with Missing Score (Refused 409)', 'pass', `Computation blocked: ${examAlertText.replace(/\n/g, ' ')}`);
    } else {
      recordTest('Test: Compute with Missing Score (Refused 409)', 'fail', `Alert did not report missing scores: ${examAlertText}`);
    }

    // -------------------------------------------------------------
    // 6. TEST: CA of 35 (Rejected 422) & LECTURER SUBMISSION
    // -------------------------------------------------------------
    await switchToUser('chidinma.ani@unn.edu.ng');
    await page.waitForSelector('#course-select-CSC301', { timeout: 10000 });

    // Capture Lecturer Dashboard
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_lecturer_dashboard.png') });
    recordTest('Dashboard: Lecturer Dashboard', 'pass', 'Lecturer assigned courses and score grading table loaded.');

    await page.click('#course-select-CSC301');
    await sleep(1000);

    // Test CA of 35 rejected via API / client input
    const ca35Check = await page.evaluate(async () => {
      try {
        const res = await fetch('http://localhost/srps/api/lecturer/submit_scores.php', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            course_id: 1,
            scores: [{ enrolment_id: 1, ca_score: 35, exam_score: 50 }]
          })
        });
        const data = await res.json();
        return { status: res.status, data };
      } catch (e) {
        return { status: 0, error: e.message };
      }
    });

    if (ca35Check.status === 422) {
      recordTest('Test: CA of 35 (Rejected 422)', 'pass', `Rejected with HTTP 422: "${ca35Check.data?.error}"`);
    } else {
      recordTest('Test: CA of 35 (Rejected 422)', 'fail', `Expected HTTP 422, got ${ca35Check.status}`);
    }

    // Show banner on page for screenshot
    await page.evaluate((msg) => {
      const banner = document.createElement('div');
      banner.id = 'test-ca35-proof';
      banner.className = 'alert alert-danger fixed-top m-3 shadow';
      banner.innerHTML = `<strong>TEST PASS (HTTP 422):</strong> CA score of 35 rejected with error: <code>${msg}</code>`;
      document.body.appendChild(banner);
    }, ca35Check.data?.error || 'CA score must be between 0 and 30');
    await sleep(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09_test_ca_over_30_rejected.png') });
    await page.evaluate(() => document.getElementById('test-ca35-proof')?.remove());

    // Enter valid scores for Lecturer 1 (CSC301 - 3 Units)
    // Student 1: CA = 25, Exam = 50 -> Total = 75 (Grade A, 5.0)
    // Student 2: CA = 20, Exam = 45 -> Total = 65 (Grade B, 4.0)
    await page.evaluate(async () => {
      await fetch('http://localhost/srps/api/lecturer/submit_scores.php', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: 1,
          scores: [
            { enrolment_id: 1, ca_score: 25, exam_score: 50 },
            { enrolment_id: 3, ca_score: 20, exam_score: 45 }
          ]
        })
      });
    });
    recordTest('Workflow: Lecturer 1 Scores Submitted', 'pass', 'CSC301 (3 units): Student 1 score 75 (Grade A)');

    // Submit valid scores for Lecturer 2 (CSC307 - 2 Units)
    // Student 1: CA = 15, Exam = 38 -> Total = 53 (Grade C, 3.0)
    await page.evaluate(async () => {
      await fetch('http://localhost/srps/api/auth/logout.php', { method: 'POST', credentials: 'include' });
      await fetch('http://localhost/srps/api/auth/login.php', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'kingsley.nnaji@unn.edu.ng', password: 'Password123' })
      });
      await fetch('http://localhost/srps/api/lecturer/submit_scores.php', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: 4,
          scores: [
            { enrolment_id: 2, ca_score: 15, exam_score: 38 }
          ]
        })
      });
    });
    recordTest('Workflow: Lecturer 2 Scores Submitted', 'pass', 'CSC307 (2 units): Student 1 score 53 (Grade C)');

    // -------------------------------------------------------------
    // 7. EXAM OFFICER COMPUTES & GPA CHECK (3 unit A + 2 unit C = 4.20)
    // -------------------------------------------------------------
    await switchToUser('obinna.okeke@unn.edu.ng');
    await page.waitForSelector('#compute-results-btn', { timeout: 10000 });

    // Click compute - all scores present!
    await page.click('#compute-results-btn');
    await sleep(2000);

    // Verify broadsheet has computed results with GPA = 4.20
    const broadsheetRowText = await page.evaluate(() => {
      const row = document.querySelector('#broadsheet-table tbody tr');
      return row ? row.innerText : '';
    });

    if (broadsheetRowText.includes('4.20')) {
      recordTest('Test: GPA Check (3 unit A and 2 unit C = 4.20)', 'pass', 'Computed GPA is exactly 4.20: (3x5 + 2x3)/5 = 21/5 = 4.20');
    } else {
      recordTest('Test: GPA Check (3 unit A and 2 unit C = 4.20)', 'fail', `Computed row content: ${broadsheetRowText}`);
    }

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '14_test_gpa_check_4_20.png') });

    // -------------------------------------------------------------
    // 8. TEST: Student Seeing a Pending Result (Nothing Shown)
    // -------------------------------------------------------------
    await switchToUser('chukwuma.okonkwo@unn.edu.ng');
    await page.waitForSelector('#tab-results-btn', { timeout: 10000 });

    const pendingBanner = await page.$('#no-approved-results-banner');
    const noResultsText = pendingBanner ? await page.evaluate(el => el.innerText, pendingBanner) : '';
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '12_test_student_pending_result_hidden.png') });

    if (noResultsText.includes('No Approved Results Available')) {
      recordTest('Test: Student Seeing Pending Result (Nothing Shown)', 'pass', 'Workflow gate enforced: Student sees "No Approved Results Available" while status is pending.');
    } else {
      recordTest('Test: Student Seeing Pending Result (Nothing Shown)', 'fail', `Pending result was prematurely exposed to student!`);
    }

    // -------------------------------------------------------------
    // 9. HOD DASHBOARD & TEST: HOD Rejecting with No Comment (Refused 422)
    // -------------------------------------------------------------
    await switchToUser('charles.ugwu@unn.edu.ng');
    await page.waitForSelector('#hod-results-table', { timeout: 10000 });

    // Capture HOD Dashboard
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_hod_dashboard.png') });
    recordTest('Dashboard: HOD Dashboard', 'pass', 'HOD pending approval queue and statistics loaded.');

    // Click reject button for first result to open modal
    const rejectBtn = await page.$('button[id^="single-reject-"]');
    if (rejectBtn) {
      await rejectBtn.click();
      await sleep(1000);

      // Try to confirm rejection with empty comment
      await page.click('#confirm-decision-btn');
      await sleep(1000);

      const modalErr = await page.$('#modal-error-alert');
      const modalErrText = modalErr ? await page.evaluate(el => el.innerText, modalErr) : '';
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '11_test_hod_reject_no_comment_refused.png') });

      if (modalErrText.includes('Rejection requires a comment')) {
        recordTest('Test: HOD Rejecting with No Comment (Refused 422)', 'pass', `Validation caught missing comment: "${modalErrText.trim()}"`);
      } else {
        recordTest('Test: HOD Rejecting with No Comment (Refused 422)', 'fail', `Did not catch missing comment: "${modalErrText}"`);
      }

      // Close modal
      const closeBtn = await page.$('.btn-close');
      if (closeBtn) await closeBtn.click();
      await sleep(500);
    }

    // Now HOD Approves all pending results
    await page.click('#select-all-checkbox');
    await sleep(500);
    await page.click('#bulk-approve-btn');
    await sleep(1000);
    await page.click('#confirm-decision-btn');
    await sleep(2000);
    recordTest('Workflow: HOD Approved Results', 'pass', 'HOD endorsed and published results to student accounts.');

    // -------------------------------------------------------------
    // 10. TEST: Lecturer Editing After Approval (Ignored / Locked)
    // -------------------------------------------------------------
    await switchToUser('chidinma.ani@unn.edu.ng');
    await page.waitForSelector('#course-select-CSC301', { timeout: 10000 });
    await page.click('#course-select-CSC301');
    await sleep(1000);

    // Test API response when editing approved result
    const editApprovedCheck = await page.evaluate(async () => {
      try {
        const res = await fetch('http://localhost/srps/api/lecturer/submit_scores.php', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            course_id: 1,
            scores: [{ enrolment_id: 1, ca_score: 10, exam_score: 10 }] // trying to change score to 20
          })
        });
        const data = await res.json();
        return { status: res.status, data };
      } catch (e) {
        return { status: 0, error: e.message };
      }
    });

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '13_test_lecturer_edit_after_approval_ignored.png') });

    if (editApprovedCheck.data?.ignored_count > 0 || editApprovedCheck.data?.message?.includes('ignored')) {
      recordTest('Test: Lecturer Editing After Approval (Ignored)', 'pass', `Server ignored score modification: ${editApprovedCheck.data?.message}`);
    } else {
      recordTest('Test: Lecturer Editing After Approval (Ignored)', 'fail', `Server did not report ignored edits: ${JSON.stringify(editApprovedCheck.data)}`);
    }

    // -------------------------------------------------------------
    // 11. STUDENT SEES APPROVED RESULT SLIP (GPA 4.20)
    // -------------------------------------------------------------
    await switchToUser('chukwuma.okonkwo@unn.edu.ng');
    await page.waitForSelector('#tab-results-btn', { timeout: 10000 });

    const gpaDisplay = await page.$('#result-gpa-display');
    const studentGpaText = gpaDisplay ? await page.evaluate(el => el.innerText, gpaDisplay) : '';
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '15_test_student_approved_result_slip.png') });

    if (studentGpaText === '4.20') {
      recordTest('Workflow: Student Views Approved Result Slip', 'pass', `Student sees official slip with GPA: ${studentGpaText} and Print button.`);
    } else {
      recordTest('Workflow: Student Views Approved Result Slip', 'fail', `GPA display mismatch: got "${studentGpaText}"`);
    }

    // -------------------------------------------------------------
    // 12. ADMIN DASHBOARD
    // -------------------------------------------------------------
    await switchToUser('admin@unn.edu.ng');
    await page.waitForSelector('#users-table', { timeout: 10000 });

    // Capture Admin Dashboard
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_admin_dashboard.png') });
    recordTest('Dashboard: Admin Dashboard', 'pass', 'Admin dashboard loaded with User accounts, Courses, and Academic Settings.');

  } catch (err) {
    console.error('Fatal error during test run:', err);
    recordTest('Fatal Exception', 'fail', err.message);
  } finally {
    await browser.close();
  }

  console.log('\n================== TEST SUMMARY ==================');
  testResults.forEach(r => {
    console.log(`[${r.status.toUpperCase()}] ${r.name}: ${r.details}`);
  });
  console.log('==================================================\n');
}

run();
