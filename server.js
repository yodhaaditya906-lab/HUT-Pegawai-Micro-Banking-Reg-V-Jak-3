import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';
import pino from 'pino';
import * as xlsx from 'xlsx';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  delay
} from '@whiskeysockets/baileys';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8083;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

const DATA_DIR = path.join(__dirname, 'data');
const SESSION_DIR = path.join(__dirname, 'auth_session');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const EMPLOYEES_FILE = path.join(DATA_DIR, 'employees.json');
const HISTORY_FILE = path.join(DATA_DIR, 'sent_history.json');

if (!process.env.VERCEL) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });
  } catch (_) {}
}

function readJson(file, defaultVal) {
  try {
    if (fs.existsSync(file)) {
      const str = fs.readFileSync(file, 'utf8').replace(/^\\uFEFF/, ''); return JSON.parse(str);
    }
  } catch (err) {
    console.error(`Error reading ${file}:`, err.message);
  }
  return defaultVal;
}

function writeJson(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`Error writing ${file}:`, err.message);
  }
}

// Global WA State
let sock = null;
let qrCodeData = null;
let connectionStatus = 'disconnected';
let connectedUser = null;
let isInitializing = false;
let dispatchLogs = [];

function formatToJid(phone) {
  if (!phone) return null;
  let cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '628' + cleaned.slice(1);
  }
  if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned;
  }
  return `${cleaned}@s.whatsapp.net`;
}

// Initialize Baileys Socket
async function initWhatsApp() {
  if (isInitializing) return;
  isInitializing = true;
  connectionStatus = 'connecting';
  qrCodeData = null;

  try {
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

    sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: ['Micro Banking Birthday Tracker', 'Chrome', '1.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        connectionStatus = 'qr';
        try {
          qrCodeData = await QRCode.toDataURL(qr);
        } catch (qrErr) {
          console.error('Failed to generate QR code data URL:', qrErr);
        }
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        connectionStatus = 'disconnected';
        connectedUser = null;
        isInitializing = false;
        qrCodeData = null;

        console.log(`WA connection closed (${statusCode}). Reconnecting: ${shouldReconnect}`);
        if (shouldReconnect) {
          setTimeout(() => initWhatsApp(), 5000);
        }
      } else if (connection === 'open') {
        connectionStatus = 'connected';
        connectedUser = sock.user;
        qrCodeData = null;
        isInitializing = false;
        console.log(`WA Connected successfully as ${connectedUser?.id || 'User'}`);
      }
    });
  } catch (err) {
    console.error('Error initializing WhatsApp socket:', err);
    connectionStatus = 'disconnected';
    isInitializing = false;
  }
}

// Send WhatsApp message to single target
async function sendWAMessage(recipientPhone, messageText) {
  if (connectionStatus !== 'connected' || !sock) {
    throw new Error('WhatsApp belum terhubung. Pastikan WhatsApp telah terhubung melalui menu pengaturan.');
  }
  const jid = formatToJid(recipientPhone);
  if (!jid) {
    throw new Error(`Nomor telepon tidak valid: ${recipientPhone}`);
  }
  await sock.sendMessage(jid, { text: messageText });
  return true;
}

// Format Robot Automated Alert
function buildRobotAlert(category, employee) {
  const isHariH = category === 'HARI_H';
  const statusLabel = isHariH ? 'HARI H (Ulang Tahun Hari Ini)' : 'H-1 (Pengingat Persiapan Esok Hari)';
  const callToAction = isHariH
    ? 'Hari ini beliau merayakan hari ulang tahun. Silakan berikan doa dan ucapan terbaik melalui grup maupun personal.'
    : 'Besok beliau merayakan hari ulang tahun. Pengingat ini dikirimkan untuk persiapan kado, ucapan, atau kejutan tim.';

  return `[SISTEM NOTIFIKASI OTOMATIS - MICRO BANKING REG V/JAK 3]
Pemberitahuan Jadwal Ulang Tahun Pegawai

Status   : ${statusLabel}
Nama     : ${employee.nama}
NIP      : ${employee.nip || '-'}
Jabatan  : ${employee.jabatan || '-'}
Tanggal  : ${employee.tanggalLahir}

Catatan  :
${callToAction}

Pesan ini dibuat dan dikirim secara otomatis oleh Micro Banking Reg V/Jak 3 Birthday Tracker.
--------------------------------------------------
Micro Banking Region V / Jakarta 3`;
}

// Scheduled Alert Check
async function runScheduledAlertCheck() {
  const config = readJson(CONFIG_FILE, {});
  if (!config.waAlertEnabled) return;

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  const h0Hour = config.h0AlertHour ?? 7;
  const h0Minute = config.h0AlertMinute ?? 0;
  const h1Hour = config.h1AlertHour ?? 17;
  const h1Minute = config.h1AlertMinute ?? 0;

  const isH0Time = currentHour === h0Hour && currentMinute === h0Minute;
  const isH1Time = currentHour === h1Hour && currentMinute === h1Minute;

  if (!isH0Time && !isH1Time) return;

  const history = readJson(HISTORY_FILE, {});
  const employees = readJson(EMPLOYEES_FILE, []);
  const todayStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${String(tomorrow.getDate()).padStart(2, '0')}/${String(tomorrow.getMonth() + 1).padStart(2, '0')}`;

  const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (!history[dateKey]) history[dateKey] = [];

  const targets = (config.alertRecipients || []).filter(r => r.active && r.phone);
  if (targets.length === 0) return;

  // Process HARI_H
  if (isH0Time) {
    for (const emp of employees) {
      if (emp.tanggalLahir && emp.tanggalLahir.startsWith(todayStr)) {
        const sendKey = `H0_${emp.nip || emp.id || emp.nama}`;
        if (!history[dateKey].includes(sendKey)) {
          const msg = buildRobotAlert('HARI_H', emp);
          for (const target of targets) {
            try {
              await sendWAMessage(target.phone, msg);
              dispatchLogs.unshift({
                timestamp: new Date().toISOString(),
                recipient: target.phone,
                employee: emp.nama,
                type: 'HARI_H',
                status: 'SUCCESS'
              });
              await delay(2000);
            } catch (err) {
              console.error(`Gagal kirim alert H0 ke ${target.phone}:`, err.message);
              dispatchLogs.unshift({
                timestamp: new Date().toISOString(),
                recipient: target.phone,
                employee: emp.nama,
                type: 'HARI_H',
                status: 'FAILED',
                error: err.message
              });
            }
          }
          history[dateKey].push(sendKey);
          writeJson(HISTORY_FILE, history);
        }
      }
    }
  }

  // Process H-1
  if (isH1Time) {
    for (const emp of employees) {
      if (emp.tanggalLahir && emp.tanggalLahir.startsWith(tomorrowStr)) {
        const sendKey = `H1_${emp.nip || emp.id || emp.nama}`;
        if (!history[dateKey].includes(sendKey)) {
          const msg = buildRobotAlert('H_MINUS_1', emp);
          for (const target of targets) {
            try {
              await sendWAMessage(target.phone, msg);
              dispatchLogs.unshift({
                timestamp: new Date().toISOString(),
                recipient: target.phone,
                employee: emp.nama,
                type: 'H_MINUS_1',
                status: 'SUCCESS'
              });
              await delay(2000);
            } catch (err) {
              console.error(`Gagal kirim alert H1 ke ${target.phone}:`, err.message);
              dispatchLogs.unshift({
                timestamp: new Date().toISOString(),
                recipient: target.phone,
                employee: emp.nama,
                type: 'H_MINUS_1',
                status: 'FAILED',
                error: err.message
              });
            }
          }
          history[dateKey].push(sendKey);
          writeJson(HISTORY_FILE, history);
        }
      }
    }
  }
}

setInterval(runScheduledAlertCheck, 60 * 1000);

// Helper to fetch CSV from Google Sheets URL
async function fetchGoogleSheetCsv(url) {
  let csvUrl = url;
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) {
    const sheetId = match[1];
    let gid = '0';
    const gidMatch = url.match(/[#&?]gid=([0-9]+)/);
    if (gidMatch) gid = gidMatch[1];
    csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  }

  const response = await fetch(csvUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });

  if (!response.ok) {
    throw new Error(`Gagal mengambil data dari Google Sheet (${response.status}: ${response.statusText}). Pastikan link Google Sheet telah diset publik (Anyone with the link can view).`);
  }

  const csvText = await response.text();
  return csvText;
}

// Helper to parse dates from spreadsheet
function parseDate(rawDate) {
  if (!rawDate) return { normalized: '', tahun: null };
  const str = String(rawDate).trim();

  if (str.includes('/')) {
    const parts = str.split('/');
    let p1 = parseInt(parts[0]);
    let p2 = parseInt(parts[1]);
    let p3 = parts[2] ? parseInt(parts[2]) : null;

    let day, month;
    if (p1 > 12) {
      day = p1;
      month = p2;
    } else {
      // Standard US Google Sheet M/D/YYYY
      day = p2;
      month = p1;
    }

    if (p3 !== null) {
      if (p3 < 30) p3 += 2000;
      else if (p3 < 100) p3 += 1900;
    }

    return {
      normalized: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`,
      tahun: p3
    };
  }

  if (str.includes('-')) {
    const parts = str.split('-');
    let p1 = parseInt(parts[0]);
    let p2 = parseInt(parts[1]);
    let p3 = parts[2] ? parseInt(parts[2]) : null;

    if (parts[0].length === 4) { // YYYY-MM-DD
      return {
        normalized: `${String(p3).padStart(2, '0')}/${String(p2).padStart(2, '0')}`,
        tahun: p1
      };
    } else { // DD-MM-YYYY
      return {
        normalized: `${String(p1).padStart(2, '0')}/${String(p2).padStart(2, '0')}`,
        tahun: p3
      };
    }
  }

  return { normalized: str, tahun: null };
}

// Normalize Google Drive image links to thumbnail direct URL
function normalizeGoogleDriveUrl(url) {
  if (!url) return '';
  const match1 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match1) {
    return `https://drive.google.com/thumbnail?id=${match1[1]}&sz=w500`;
  }
  const match2 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match2) {
    return `https://drive.google.com/thumbnail?id=${match2[1]}&sz=w500`;
  }
  return url;
}

// Parse Google Sheet CSV to Employee Objects with Deduplication
function parseEmployeesCsv(csvText) {
  const workbook = xlsx.read(csvText, { type: 'string', raw: false });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rows = xlsx.utils.sheet_to_json(worksheet, { defval: '', raw: false });

  const result = [];
  const seenKeys = new Set();
  let counter = 1;

  for (const row of rows) {
    let nama = '';
    let nip = '';
    let jabatan = '';
    let tanggalLahir = '';
    let foto = '';

    for (const [key, val] of Object.entries(row)) {
      const cleanKey = key.trim().toLowerCase();
      const strVal = String(val).trim();

      if (cleanKey.includes('nama')) nama = strVal;
      else if (cleanKey.includes('nip')) nip = strVal;
      else if (cleanKey.includes('jabatan') || cleanKey.includes('role') || cleanKey.includes('posisi')) jabatan = strVal;
      else if (cleanKey.includes('tgl') || cleanKey.includes('tanggal') || cleanKey.includes('lahir') || cleanKey.includes('birth')) tanggalLahir = strVal;
      else if (cleanKey.includes('foto') || cleanKey.includes('image') || cleanKey.includes('avatar') || cleanKey.includes('link')) foto = strVal;
    }

    if (nama) {
      const cleanNip = nip || '-';
      const dedupeKey = `${nama.toLowerCase()}_${cleanNip}`;

      if (!seenKeys.has(dedupeKey)) {
        seenKeys.add(dedupeKey);

        const { normalized, tahun } = parseDate(tanggalLahir);

        result.push({
          id: `EMP-${String(counter++).padStart(4, '0')}`,
          nama,
          nip: cleanNip,
          jabatan: jabatan || 'Pegawai',
          tanggalLahir: normalized,
          tahunLahir: tahun,
          foto: normalizeGoogleDriveUrl(foto)
        });
      }
    }
  }

  return result;
}

// API Routes

app.get('/api/status', (req, res) => {
  const config = readJson(CONFIG_FILE, {});
  res.json({
    connectionStatus,
    qrCodeData,
    connectedUser: connectedUser ? {
      id: connectedUser.id,
      name: connectedUser.name || 'Micro Banking WhatsApp Bot'
    } : null,
    lastSyncTime: config.lastSyncTime || null,
    serverTime: new Date().toISOString()
  });
});

app.post('/api/connect', async (req, res) => {
  try {
    if (connectionStatus === 'connected') {
      return res.json({ success: true, message: 'WhatsApp sudah terhubung', connectionStatus });
    }
    await initWhatsApp();
    res.json({ success: true, message: 'Menginisialisasi koneksi WhatsApp...', connectionStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/disconnect', async (req, res) => {
  try {
    if (sock) {
      await sock.logout();
      connectionStatus = 'disconnected';
      connectedUser = null;
      qrCodeData = null;
    }
    res.json({ success: true, message: 'WhatsApp berhasil diputus' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/data', (req, res) => {
  const employees = readJson(EMPLOYEES_FILE, []);
  const config = readJson(CONFIG_FILE, {});
  res.json({ employees, config });
});

app.post('/api/config', (req, res) => {
  const currentConfig = readJson(CONFIG_FILE, {});
  const newConfig = { ...currentConfig, ...req.body };
  writeJson(CONFIG_FILE, newConfig);
  res.json({ success: true, config: newConfig });
});

app.post('/api/sync-sheets', async (req, res) => {
  try {
    const config = readJson(CONFIG_FILE, {});
    const sheetUrl = req.body.sheetUrl || config.sheetUrl;

    if (!sheetUrl) {
      return res.status(400).json({ error: 'URL Google Sheet belum diisi' });
    }

    const csvText = await fetchGoogleSheetCsv(sheetUrl);
    const parsedEmployees = parseEmployeesCsv(csvText);

    if (parsedEmployees.length === 0) {
      return res.status(400).json({ error: 'Tidak ditemukan data pegawai pada Google Sheet tersebut. Pastikan kolom berisi Nama Lengkap, NIP, Jabatan, Tanggal lahir.' });
    }

    writeJson(EMPLOYEES_FILE, parsedEmployees);

    config.sheetUrl = sheetUrl;
    config.lastSyncTime = new Date().toISOString();
    writeJson(CONFIG_FILE, config);

    res.json({
      success: true,
      message: `Berhasil sinkronisasi ${parsedEmployees.length} pegawai dari Google Sheet`,
      count: parsedEmployees.length,
      employees: parsedEmployees,
      lastSyncTime: config.lastSyncTime
    });
  } catch (err) {
    console.error('Error syncing Google Sheet:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/employees', (req, res) => {
  const employees = readJson(EMPLOYEES_FILE, []);
  const newEmp = req.body;

  if (!newEmp.id) {
    newEmp.id = `EMP-${String(employees.length + 1).padStart(4, '0')}`;
    employees.push(newEmp);
  } else {
    const index = employees.findIndex(e => e.id === newEmp.id);
    if (index !== -1) {
      employees[index] = { ...employees[index], ...newEmp };
    } else {
      employees.push(newEmp);
    }
  }

  writeJson(EMPLOYEES_FILE, employees);
  res.json({ success: true, employee: newEmp, employees });
});

app.delete('/api/employees/:id', (req, res) => {
  let employees = readJson(EMPLOYEES_FILE, []);
  employees = employees.filter(e => e.id !== req.params.id);
  writeJson(EMPLOYEES_FILE, employees);
  res.json({ success: true, employees });
});

app.post('/api/send-test-alert', async (req, res) => {
  const config = readJson(CONFIG_FILE, {});
  const employees = readJson(EMPLOYEES_FILE, []);

  const employee = req.body.employee || employees.find(e => e.tanggalLahir === '15/10') || employees[0];

  const category = req.body.category || 'HARI_H';
  const customRecipient = req.body.recipient;

  const targets = customRecipient
    ? [{ name: 'Custom Test', phone: customRecipient, active: true }]
    : (config.alertRecipients || []).filter(r => r.active && r.phone);

  if (targets.length === 0) {
    return res.status(400).json({ error: 'Tidak ada nomor WhatsApp tujuan yang aktif dalam konfigurasi.' });
  }

  const alertMessage = buildRobotAlert(category, employee);
  const results = [];

  for (const target of targets) {
    try {
      await sendWAMessage(target.phone, alertMessage);
      results.push({ phone: target.phone, success: true });
      dispatchLogs.unshift({
        timestamp: new Date().toISOString(),
        recipient: target.phone,
        employee: employee.nama,
        type: `TEST_${category}`,
        status: 'SUCCESS'
      });
      await delay(1500);
    } catch (err) {
      results.push({ phone: target.phone, success: false, error: err.message });
      dispatchLogs.unshift({
        timestamp: new Date().toISOString(),
        recipient: target.phone,
        employee: employee.nama,
        type: `TEST_${category}`,
        status: 'FAILED',
        error: err.message
      });
    }
  }

  res.json({
    success: results.some(r => r.success),
    results,
    messagePreview: alertMessage
  });
});

app.get('/api/logs', (req, res) => {
  res.json({ logs: dispatchLogs.slice(0, 50) });
});


// Periodic Auto-Sync from Google Sheets
async function syncFromGoogleSheet() {
  const config = readJson(CONFIG_FILE, {});
  if (!config.sheetUrl) return;
  try {
    const csvText = await fetchGoogleSheetCsv(config.sheetUrl);
    const parsedEmployees = parseEmployeesCsv(csvText);
    if (parsedEmployees.length > 0) {
      writeJson(EMPLOYEES_FILE, parsedEmployees);
      config.lastSyncTime = new Date().toISOString();
      writeJson(CONFIG_FILE, config);
      console.log(`[AUTO-SYNC] ✅ Berhasil menyinkronkan ${parsedEmployees.length} pegawai dari Google Sheet (${new Date().toLocaleTimeString('id-ID')})`);
    }
  } catch (err) {
    console.error('[AUTO-SYNC ERROR]:', err.message);
  }
}

// Interval Auto-Sync: Setiap 10 menit otomatis sinkronisasi dari Google Sheet di background
setInterval(syncFromGoogleSheet, 10 * 60 * 1000);

// Auto-sync Google Sheet on start if sheetUrl is present
(async () => {
  await syncFromGoogleSheet();
})();


const isVercel = process.env.VERCEL === '1';

if (!isVercel) {
  initWhatsApp().catch(err => console.error('WA Init Error:', err.message));
}


// Photo Proxy Endpoint to bypass Google Drive CORS restrictions
app.get('/api/photo-proxy', async (req, res) => {
  try {
    const rawUrl = req.query.url;
    let driveId = req.query.id;

    if (!driveId && rawUrl) {
      const match1 = rawUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (match1) driveId = match1[1];
      else {
        const match2 = rawUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match2) driveId = match2[1];
      }
    }

    if (!driveId && !rawUrl) {
      return res.status(400).send('Missing url or id parameter');
    }

    const candidateUrls = [];
    if (driveId) {
      candidateUrls.push(`https://drive.google.com/thumbnail?id=${driveId}&sz=w1000`);
      candidateUrls.push(`https://drive.google.com/uc?export=download&id=${driveId}`);
      candidateUrls.push(`https://lh3.googleusercontent.com/d/${driveId}`);
    } else {
      candidateUrls.push(rawUrl);
    }

    let imageBuffer = null;
    let contentType = 'image/jpeg';

    for (const targetUrl of candidateUrls) {
      try {
        const resp = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
          }
        });
        if (resp.ok) {
          const type = resp.headers.get('content-type') || '';
          if (type.startsWith('image/')) {
            contentType = type;
            const arr = await resp.arrayBuffer();
            imageBuffer = Buffer.from(arr);
            break;
          }
        }
      } catch (_) {}
    }

    if (!imageBuffer) {
      return res.status(404).send('Image not found or inaccessible');
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(imageBuffer);
  } catch (err) {
    console.error('Photo proxy error:', err.message);
    res.status(500).send('Proxy error: ' + err.message);
  }
});

if (!isVercel) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`✨ Micro Banking Reg V/Jak 3 Birthday Tracker berjalan di:`);
    console.log(`✨ http://localhost:${PORT}`);
    console.log(`=======================================================`);
  });
}

export default app;
