import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const LOGIN_URL = process.env.LOGIN_URL || 'https://user.kurigramisp.com/customer/login';

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure directories
const DATA_DIR = path.join(process.cwd(), 'database');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const LOGS_DIR = path.join(process.cwd(), 'logs');

[DATA_DIR, UPLOADS_DIR, LOGS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');
const LOGS_FILE = path.join(LOGS_DIR, 'scan_logs.json');

// Types
export interface StoredAccount {
  id: string;
  username: string;
  password?: string;
  status: 'ONLINE' | 'OFFLINE' | 'CHECKING' | 'FAILED' | 'PENDING';
  lastChecked: string | null;
  responseTimeMs: number | null;
  error: string | null;
  retryCount: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  username: string;
  action: string;
  durationMs: number | null;
  status: 'ONLINE' | 'OFFLINE' | 'FAILED' | 'SYSTEM';
  success: boolean;
  reason: string | null;
  details?: string | null;
}

// In-Memory Database
let accounts: StoredAccount[] = [];
let logs: LogEntry[] = [];

// Load persistent data
try {
  if (fs.existsSync(ACCOUNTS_FILE)) {
    accounts = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf-8'));
  }
} catch (err) {
  console.error('Error loading accounts.json:', err);
  accounts = [];
}

try {
  if (fs.existsSync(LOGS_FILE)) {
    logs = JSON.parse(fs.readFileSync(LOGS_FILE, 'utf-8'));
  }
} catch (err) {
  console.error('Error loading scan_logs.json:', err);
  logs = [];
}

function saveAccounts() {
  try {
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2));
  } catch (err) {
    console.error('Error saving accounts.json:', err);
  }
}

function saveLogs() {
  try {
    // Keep max 1000 logs
    if (logs.length > 1000) {
      logs = logs.slice(0, 1000);
    }
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2));
  } catch (err) {
    console.error('Error saving scan_logs.json:', err);
  }
}

function addLog(entry: Omit<LogEntry, 'id' | 'timestamp'>) {
  const newEntry: LogEntry = {
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    timestamp: new Date().toISOString(),
    ...entry,
  };
  logs.unshift(newEntry);
  saveLogs();
}

// Scan State
let isScanning = false;
let isPaused = false;
let shouldStop = false;
let concurrency = Number(process.env.CONCURRENT_BROWSERS) || 5;
let currentCheckingUsername: string | null = null;
let startTime: string | null = null;
let endTime: string | null = null;

// Schedule State
let scheduleConfig = {
  enabled: false,
  intervalMinutes: 15,
  nextRunTime: null as string | null,
};
let scheduleTimer: NodeJS.Timeout | null = null;

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`),
});
const upload = multer({ storage });

/**
 * Worker check engine for ISP Account Login
 * Supports direct form POST (#customerData: USERNAME & PASS) to /customer/login and checks /customer/dashboard
 */
async function checkAccountConnection(account: StoredAccount): Promise<{
  status: 'ONLINE' | 'OFFLINE' | 'FAILED';
  responseTimeMs: number;
  error: string | null;
}> {
  const start = Date.now();
  const maxRetries = 2;
  let lastError: string | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const cookieJar: string[] = [];

      // Step 1: GET login page to obtain initial cookies and CSRF token if present
      const getRes = await axios.get(LOGIN_URL, {
        timeout: 10000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        validateStatus: () => true,
      });

      if (getRes.headers['set-cookie']) {
        getRes.headers['set-cookie'].forEach((c) => {
          const cookieStr = c.split(';')[0];
          if (!cookieJar.includes(cookieStr)) cookieJar.push(cookieStr);
        });
      }

      const $ = cheerio.load(getRes.data || '');
      const csrfToken =
        $('input[name="_token"]').val() ||
        $('input[name="csrf_token"]').val() ||
        $('input[name="csrf"]').val() ||
        $('meta[name="csrf-token"]').attr('content') ||
        $('meta[name="csrf_token"]').attr('content') ||
        '';

      // Parse action URL from form#customerData or form
      const formActionAttr = $('#customerData').attr('action') || $('form').attr('action') || '/customer/login';
      const targetActionUrl = formActionAttr.startsWith('http')
        ? formActionAttr
        : new URL(formActionAttr, LOGIN_URL).href;

      // Detect field names from form or default to USERNAME & PASS as provided by user
      const usernameFieldName = $('#customerId').attr('name') || $('#customerData input[name="USERNAME"]').attr('name') || 'USERNAME';
      const passwordFieldName = $('#password').attr('name') || $('#customerData input[name="PASS"]').attr('name') || 'PASS';

      // Step 2: Formulate direct POST form parameters
      const formParams = new URLSearchParams();

      // Collect any hidden inputs inside form#customerData
      const $form = $('#customerData').length ? $('#customerData') : $('form');
      $form.find('input[type="hidden"]').each((_, el) => {
        const name = $(el).attr('name');
        const val = $(el).attr('value') || '';
        if (name) formParams.append(name, val);
      });

      if (csrfToken && !formParams.has('_token') && !formParams.has('csrf_token')) {
        formParams.append('_token', String(csrfToken));
      }

      formParams.set(usernameFieldName, account.username);
      formParams.set(passwordFieldName, account.password || '');

      // Direct Standard Form POST headers
      const directHeaders = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'max-age=0',
        Origin: new URL(LOGIN_URL).origin,
        Referer: LOGIN_URL,
        Cookie: cookieJar.join('; '),
      };

      // Perform Direct POST
      let postRes = await axios.post(targetActionUrl, formParams.toString(), {
        timeout: 12000,
        headers: directHeaders,
        maxRedirects: 5,
        validateStatus: () => true,
      });

      if (postRes.headers['set-cookie']) {
        postRes.headers['set-cookie'].forEach((c) => {
          const cookieStr = c.split(';')[0];
          if (!cookieJar.includes(cookieStr)) cookieJar.push(cookieStr);
        });
      }

      // If portal also supports/requires AJAX fallback, try with X-Requested-With if 400/404/500
      if (postRes.status === 500 || postRes.status === 404) {
        const ajaxHeaders = {
          ...directHeaders,
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': String(csrfToken),
          Accept: 'application/json, text/javascript, */*; q=0.01',
        };

        const postResAjax = await axios.post(targetActionUrl, formParams.toString(), {
          timeout: 12000,
          headers: ajaxHeaders,
          maxRedirects: 5,
          validateStatus: () => true,
        });

        if (postResAjax.status !== 500) {
          postRes = postResAjax;
          if (postRes.headers['set-cookie']) {
            postRes.headers['set-cookie'].forEach((c) => {
              const cookieStr = c.split(';')[0];
              if (!cookieJar.includes(cookieStr)) cookieJar.push(cookieStr);
            });
          }
        }
      }

      // Parse JSON or HTML Response
      let responseDataStr = '';
      let jsonObject: any = null;

      if (typeof postRes.data === 'object' && postRes.data !== null) {
        jsonObject = postRes.data;
        responseDataStr = JSON.stringify(postRes.data);
      } else {
        responseDataStr = String(postRes.data || '');
        try {
          jsonObject = JSON.parse(responseDataStr);
        } catch {
          jsonObject = null;
        }
      }

      // Determine redirect or dashboard URL
      let redirectUrlFromResponse = '';
      if (jsonObject) {
        if (jsonObject.redirect) redirectUrlFromResponse = jsonObject.redirect;
        if (jsonObject.url) redirectUrlFromResponse = jsonObject.url;
      }

      const dashboardUrl = redirectUrlFromResponse
        ? (redirectUrlFromResponse.startsWith('http') ? redirectUrlFromResponse : new URL(redirectUrlFromResponse, LOGIN_URL).href)
        : 'https://user.kurigramisp.com/customer/dashboard';

      // Fetch Customer Dashboard HTML
      let dashboardHtml = responseDataStr;
      try {
        const dashRes = await axios.get(dashboardUrl, {
          timeout: 10000,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            Cookie: cookieJar.join('; '),
            Referer: LOGIN_URL,
          },
          validateStatus: () => true,
        });
        if (dashRes.data && String(dashRes.data).length > 50) {
          dashboardHtml = String(dashRes.data);
        }
      } catch {
        // Keep initial post response
      }

      // Inspect HTML/Text for Status Indicators with high precision
      const upperHtml = dashboardHtml.toUpperCase();
      const $resp = cheerio.load(dashboardHtml);

      // Check if page redirected back to login form or shows unauthenticated error
      const isLoginPage = $resp('#customerData').length > 0 || $resp('input[name="PASS"]').length > 0 || $resp('input[name="USERNAME"]').length > 0;
      if (
        isLoginPage ||
        upperHtml.includes('INVALID USERNAME') ||
        upperHtml.includes('INCORRECT PASSWORD') ||
        upperHtml.includes('UNAUTHENTICATED') ||
        (jsonObject && (jsonObject.status === false || jsonObject.error))
      ) {
        const errorMsg = jsonObject?.message || jsonObject?.error || 'Invalid username/password or login failed';
        return {
          status: 'FAILED',
          responseTimeMs: Date.now() - start,
          error: errorMsg,
        };
      }

      // Target specific status badges / elements
      const px1Text = $resp('.px-1').text().trim().toUpperCase();
      const badgeText = $resp('.badge, .status, .user-status, .account-status, #status, .badge-danger, .badge-success, .badge-warning').text().toUpperCase();
      
      // Look for parent containers with "Status" label
      let statusContainerText = '';
      $resp('*').each((_, el) => {
        const text = $resp(el).text().trim().toUpperCase();
        if (text.startsWith('STATUS') || text.includes('CONNECTION STATUS') || text.includes('CUSTOMER STATUS')) {
          statusContainerText += ' ' + text;
        }
      });

      let detectedStatus: 'ONLINE' | 'OFFLINE' | null = null;

      // 1. Check OFFLINE status FIRST (High Priority)
      if (
        px1Text.includes('OFFLINE') ||
        badgeText.includes('OFFLINE') ||
        statusContainerText.includes('OFFLINE') ||
        upperHtml.includes('STATUS: OFFLINE') ||
        upperHtml.includes('STATUS : OFFLINE') ||
        upperHtml.includes('STATUS:OFFLINE') ||
        upperHtml.includes('>OFFLINE<') ||
        upperHtml.includes('STATUS: DISCONNECTED') ||
        upperHtml.includes('>DISCONNECTED<') ||
        upperHtml.includes('EXPIRED') ||
        upperHtml.includes('INACTIVE')
      ) {
        detectedStatus = 'OFFLINE';
      } 
      // 2. Check ONLINE status SECOND
      else if (
        px1Text.includes('ONLINE') ||
        badgeText.includes('ONLINE') ||
        statusContainerText.includes('ONLINE') ||
        upperHtml.includes('STATUS: ONLINE') ||
        upperHtml.includes('STATUS : ONLINE') ||
        upperHtml.includes('STATUS:ONLINE') ||
        upperHtml.includes('>ONLINE<') ||
        upperHtml.includes('STATUS: CONNECTED') ||
        upperHtml.includes('>CONNECTED<')
      ) {
        detectedStatus = 'ONLINE';
      }

      if (detectedStatus) {
        return {
          status: detectedStatus,
          responseTimeMs: Date.now() - start,
          error: null,
        };
      }

      // Fallback check if logged into dashboard successfully
      if (postRes.status === 200 || dashboardUrl.includes('/dashboard')) {
        const isOffline = upperHtml.includes('OFFLINE') || upperHtml.includes('EXPIRED') || upperHtml.includes('DISCONNECTED');
        return {
          status: isOffline ? 'OFFLINE' : 'ONLINE',
          responseTimeMs: Date.now() - start,
          error: null,
        };
      }

      // Handle HTTP 500 explicitly
      if (postRes.status === 500) {
        let serverErrorText = 'Portal Internal Error (HTTP 500)';
        if (jsonObject && jsonObject.message) {
          serverErrorText += `: ${jsonObject.message}`;
        } else if (responseDataStr.includes('<title>') && responseDataStr.includes('</title>')) {
          const title = responseDataStr.match(/<title>(.*?)<\/title>/i)?.[1];
          if (title) serverErrorText += `: ${title.trim()}`;
        }
        lastError = serverErrorText;
      } else {
        lastError = `Unexpected response (HTTP ${postRes.status})`;
      }
    } catch (err: any) {
      lastError = err.message || 'Connection timeout or portal unavailable';
    }

    if (attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }

  return {
    status: 'FAILED',
    responseTimeMs: Date.now() - start,
    error: lastError || 'Check failed after retries',
  };
}

// Queue Scanner Runner
async function runScan() {
  if (isScanning) return;
  isScanning = true;
  isPaused = false;
  shouldStop = false;
  startTime = new Date().toISOString();
  endTime = null;

  addLog({
    username: 'SYSTEM',
    action: 'Scan Started',
    durationMs: null,
    status: 'SYSTEM',
    success: true,
    reason: `Scan initiated for ${accounts.length} accounts with concurrency ${concurrency}`,
  });

  // Set all pending accounts to CHECKING or reset state
  const queue = accounts.map((acc) => acc.id);

  async function worker() {
    while (queue.length > 0 && !shouldStop) {
      while (isPaused && !shouldStop) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      if (shouldStop) break;

      const accId = queue.shift();
      if (!accId) break;

      const accIndex = accounts.findIndex((a) => a.id === accId);
      if (accIndex === -1) continue;

      const acc = accounts[accIndex];
      acc.status = 'CHECKING';
      acc.error = null;
      currentCheckingUsername = acc.username;
      saveAccounts();

      const result = await checkAccountConnection(acc);

      acc.status = result.status;
      acc.responseTimeMs = result.responseTimeMs;
      acc.lastChecked = new Date().toISOString();
      acc.error = result.error;
      saveAccounts();

      addLog({
        username: acc.username,
        action: 'Connection Check',
        durationMs: result.responseTimeMs,
        status: result.status,
        success: result.status !== 'FAILED',
        reason: result.error,
      });
    }
  }

  // Launch workers up to concurrency
  const workers = Array.from({ length: Math.min(concurrency, queue.length || 1) }, () => worker());
  await Promise.all(workers);

  isScanning = false;
  isPaused = false;
  currentCheckingUsername = null;
  endTime = new Date().toISOString();

  addLog({
    username: 'SYSTEM',
    action: 'Scan Completed',
    durationMs: startTime ? Date.now() - new Date(startTime).getTime() : null,
    status: 'SYSTEM',
    success: true,
    reason: shouldStop ? 'Scan stopped by user' : 'Scan completed successfully',
  });
}

// ================= API ROUTES =================

// Get Accounts
app.get('/api/accounts', (req, res) => {
  const { status, search, sortBy, sortOrder } = req.query;

  let filtered = [...accounts];

  if (status && status !== 'ALL') {
    filtered = filtered.filter((a) => a.status === String(status).toUpperCase());
  }

  if (search) {
    const term = String(search).toLowerCase();
    filtered = filtered.filter((a) => a.username.toLowerCase().includes(term));
  }

  if (sortBy) {
    const order = sortOrder === 'desc' ? -1 : 1;
    filtered.sort((a, b) => {
      if (sortBy === 'username') {
        return a.username.localeCompare(b.username) * order;
      }
      if (sortBy === 'status') {
        return a.status.localeCompare(b.status) * order;
      }
      if (sortBy === 'lastChecked') {
        const timeA = a.lastChecked ? new Date(a.lastChecked).getTime() : 0;
        const timeB = b.lastChecked ? new Date(b.lastChecked).getTime() : 0;
        return (timeA - timeB) * order;
      }
      if (sortBy === 'responseTimeMs') {
        return ((a.responseTimeMs || 0) - (b.responseTimeMs || 0)) * order;
      }
      return 0;
    });
  }

  // Hide passwords in response
  const sanitized = filtered.map(({ password, ...rest }) => ({
    ...rest,
    hasPassword: Boolean(password),
  }));

  res.json({
    accounts: sanitized,
    total: accounts.length,
  });
});

// Summary Stats
app.get('/api/summary', (req, res) => {
  const total = accounts.length;
  const online = accounts.filter((a) => a.status === 'ONLINE').length;
  const offline = accounts.filter((a) => a.status === 'OFFLINE').length;
  const failed = accounts.filter((a) => a.status === 'FAILED').length;
  const pending = accounts.filter((a) => a.status === 'PENDING' || a.status === 'CHECKING').length;

  const lastCheckedList = accounts
    .map((a) => (a.lastChecked ? new Date(a.lastChecked).getTime() : 0))
    .filter((t) => t > 0);
  const maxLastChecked = lastCheckedList.length > 0 ? new Date(Math.max(...lastCheckedList)).toISOString() : null;

  res.json({
    total,
    online,
    offline,
    failed,
    pending,
    lastScanTime: maxLastChecked || endTime,
  });
});

// Live Progress
app.get('/api/progress', (req, res) => {
  const total = accounts.length;
  const checked = accounts.filter((a) => a.status !== 'PENDING' && a.status !== 'CHECKING').length;
  const online = accounts.filter((a) => a.status === 'ONLINE').length;
  const offline = accounts.filter((a) => a.status === 'OFFLINE').length;
  const failed = accounts.filter((a) => a.status === 'FAILED').length;

  const percentage = total > 0 ? Math.round((checked / total) * 100) : 0;

  let estRemSec: number | null = null;
  if (isScanning && startTime && checked > 0) {
    const elapsedMs = Date.now() - new Date(startTime).getTime();
    const msPerAccount = elapsedMs / checked;
    const remainingCount = total - checked;
    estRemSec = Math.round((msPerAccount * remainingCount) / 1000 / concurrency);
  }

  res.json({
    isScanning,
    isPaused,
    total,
    completed: checked,
    online,
    offline,
    failed,
    currentCheckingUsername,
    percentage,
    estimatedRemainingTimeSec: estRemSec,
    startTime,
    endTime,
    concurrency,
  });
});

// Start Scan
app.post('/api/scan', (req, res) => {
  if (isScanning && !isPaused) {
    return res.status(400).json({ message: 'Scan is already running' });
  }

  if (isPaused) {
    isPaused = false;
    return res.json({ message: 'Scan resumed' });
  }

  runScan().catch((err) => console.error('Error during runScan:', err));
  res.json({ message: 'Scan started' });
});

// Pause Scan
app.post('/api/pause', (req, res) => {
  if (!isScanning) {
    return res.status(400).json({ message: 'No scan in progress' });
  }
  isPaused = true;
  res.json({ message: 'Scan paused' });
});

// Resume Scan
app.post('/api/resume', (req, res) => {
  if (!isScanning) {
    return res.status(400).json({ message: 'No scan in progress' });
  }
  isPaused = false;
  res.json({ message: 'Scan resumed' });
});

// Stop Scan
app.post('/api/stop', (req, res) => {
  if (!isScanning) {
    return res.status(400).json({ message: 'No scan in progress' });
  }
  shouldStop = true;
  isPaused = false;
  res.json({ message: 'Stopping scan...' });
});

// Upload CSV/TXT Accounts
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const filePath = req.file.path;
  const content = fs.readFileSync(filePath, 'utf-8');

  const newAccounts: StoredAccount[] = [];
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.toLowerCase().startsWith('username')) continue;

    // Support comma, tab, or colon split
    const parts = trimmed.split(/[,:\t]+/).map((p) => p.trim());
    if (parts.length >= 2) {
      const username = parts[0];
      const password = parts[1];

      if (username && password) {
        // Prevent duplicate usernames or replace
        const existingIdx = accounts.findIndex((a) => a.username.toLowerCase() === username.toLowerCase());
        const accObj: StoredAccount = {
          id: existingIdx !== -1 ? accounts[existingIdx].id : 'acc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          username,
          password,
          status: 'PENDING',
          lastChecked: null,
          responseTimeMs: null,
          error: null,
          retryCount: 0,
        };

        if (existingIdx !== -1) {
          accounts[existingIdx] = accObj;
        } else {
          newAccounts.push(accObj);
        }
      }
    }
  }

  accounts = [...accounts, ...newAccounts];
  saveAccounts();

  addLog({
    username: 'SYSTEM',
    action: 'Accounts Uploaded',
    durationMs: null,
    status: 'SYSTEM',
    success: true,
    reason: `Imported ${newAccounts.length} new account(s) via file upload`,
  });

  res.json({
    message: `Successfully processed ${newAccounts.length} account(s)`,
    addedCount: newAccounts.length,
    totalAccounts: accounts.length,
  });
});

// Add Manual / Paste Accounts
app.post('/api/accounts/add', (req, res) => {
  const { rawText, list } = req.body;
  const added: StoredAccount[] = [];

  let inputItems: { username: string; password?: string }[] = [];

  if (Array.isArray(list)) {
    inputItems = list;
  } else if (typeof rawText === 'string') {
    const lines = rawText.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.toLowerCase().startsWith('username')) continue;
      const parts = trimmed.split(/[,:\t\s]+/).map((p) => p.trim());
      if (parts.length >= 2) {
        inputItems.push({ username: parts[0], password: parts[1] });
      }
    }
  }

  for (const item of inputItems) {
    if (!item.username || !item.password) continue;

    const existingIdx = accounts.findIndex((a) => a.username.toLowerCase() === item.username.toLowerCase());
    const accObj: StoredAccount = {
      id: existingIdx !== -1 ? accounts[existingIdx].id : 'acc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      username: item.username,
      password: item.password,
      status: 'PENDING',
      lastChecked: null,
      responseTimeMs: null,
      error: null,
      retryCount: 0,
    };

    if (existingIdx !== -1) {
      accounts[existingIdx] = accObj;
    } else {
      accounts.push(accObj);
      added.push(accObj);
    }
  }

  saveAccounts();

  addLog({
    username: 'SYSTEM',
    action: 'Accounts Added',
    durationMs: null,
    status: 'SYSTEM',
    success: true,
    reason: `Added/updated ${inputItems.length} account(s)`,
  });

  res.json({
    message: `Added/updated ${inputItems.length} account(s)`,
    totalAccounts: accounts.length,
  });
});

// Delete Account(s)
app.delete('/api/accounts', (req, res) => {
  const { id, clearAll } = req.query;

  if (clearAll === 'true') {
    accounts = [];
    saveAccounts();
    return res.json({ message: 'All accounts cleared' });
  }

  if (id) {
    accounts = accounts.filter((a) => a.id !== String(id));
    saveAccounts();
    return res.json({ message: 'Account deleted' });
  }

  res.status(400).json({ message: 'Invalid delete request' });
});

// Export Results
app.get('/api/export', (req, res) => {
  const { format = 'csv' } = req.query;

  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="isp_account_status.json"');
    return res.send(
      JSON.stringify(
        accounts.map(({ password, ...rest }) => rest),
        null,
        2
      )
    );
  }

  // Default CSV format
  let csvContent = 'Username,Status,Last Checked,Response Time (ms),Error\n';
  for (const acc of accounts) {
    csvContent += `"${acc.username}","${acc.status}","${acc.lastChecked || 'N/A'}","${acc.responseTimeMs || 'N/A'}","${
      acc.error || ''
    }"\n`;
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="isp_account_status.csv"');
  res.send(csvContent);
});

// Get Logs
app.get('/api/logs', (req, res) => {
  res.json({ logs });
});

// Single Account Test Check
app.post('/api/accounts/check-single', async (req, res) => {
  const { username, password } = req.body;
  if (!username) {
    return res.status(400).json({ message: 'Username is required' });
  }

  const dummyAcc: StoredAccount = {
    id: 'single_test',
    username,
    password: password || '',
    status: 'CHECKING',
    lastChecked: null,
    responseTimeMs: null,
    error: null,
    retryCount: 0,
  };

  const result = await checkAccountConnection(dummyAcc);

  // Update existing account in state if found
  const existingIndex = accounts.findIndex((a) => a.username.toLowerCase() === username.toLowerCase());
  if (existingIndex !== -1) {
    accounts[existingIndex].status = result.status;
    accounts[existingIndex].responseTimeMs = result.responseTimeMs;
    accounts[existingIndex].lastChecked = new Date().toISOString();
    accounts[existingIndex].error = result.error;
    saveAccounts();
  }

  addLog({
    username,
    action: 'Single Check (Manual)',
    durationMs: result.responseTimeMs,
    status: result.status,
    success: result.status !== 'FAILED',
    reason: result.error,
  });

  res.json({
    username,
    status: result.status,
    responseTimeMs: result.responseTimeMs,
    error: result.error,
  });
});

// Update Config / Concurrency
app.post('/api/config', (req, res) => {
  const { newConcurrency } = req.body;
  if (typeof newConcurrency === 'number' && newConcurrency >= 1 && newConcurrency <= 10) {
    concurrency = newConcurrency;
    return res.json({ message: `Concurrency set to ${concurrency}`, concurrency });
  }
  res.status(400).json({ message: 'Concurrency must be between 1 and 10' });
});

// Auto Schedule Setup
app.post('/api/schedule', (req, res) => {
  const { enabled, intervalMinutes } = req.body;

  scheduleConfig.enabled = Boolean(enabled);
  if (typeof intervalMinutes === 'number') {
    scheduleConfig.intervalMinutes = intervalMinutes;
  }

  if (scheduleTimer) {
    clearInterval(scheduleTimer);
    scheduleTimer = null;
  }

  if (scheduleConfig.enabled) {
    const next = new Date(Date.now() + scheduleConfig.intervalMinutes * 60 * 1000).toISOString();
    scheduleConfig.nextRunTime = next;

    scheduleTimer = setInterval(() => {
      if (!isScanning) {
        runScan().catch((err) => console.error('Scheduled scan error:', err));
        scheduleConfig.nextRunTime = new Date(Date.now() + scheduleConfig.intervalMinutes * 60 * 1000).toISOString();
      }
    }, scheduleConfig.intervalMinutes * 60 * 1000);
  } else {
    scheduleConfig.nextRunTime = null;
  }

  res.json({
    message: scheduleConfig.enabled ? `Schedule enabled for every ${scheduleConfig.intervalMinutes} min` : 'Schedule disabled',
    scheduleConfig,
  });
});

// Main async server bootstrapper
async function startServer() {
  // Vite middleware for dev or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ISP Account Status Checker server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
