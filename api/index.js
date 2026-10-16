import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

const app = express();
app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(process.cwd(), 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const EMPLOYEES_FILE = path.join(DATA_DIR, 'employees.json');

function readJson(file, defaultVal) {
  try {
    if (fs.existsSync(file)) {
      const str = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
      return JSON.parse(str);
    }
  } catch (err) {
    console.error(`Error reading ${file}:`, err.message);
  }
  return defaultVal;
}

app.get('/api/data', (req, res) => {
  const employees = readJson(EMPLOYEES_FILE, []);
  const config = readJson(CONFIG_FILE, {});
  res.json({ employees, config });
});

app.get('/api/status', (req, res) => {
  res.json({
    status: 'disconnected',
    user: null,
    qr: null,
    isInitializing: false,
    message: 'Bot WhatsApp berjalan di server lokal.'
  });
});

app.get('/api/logs', (req, res) => {
  res.json({ logs: [] });
});

app.post('/api/config', (req, res) => {
  res.json({ success: true, message: 'Settings saved in session.' });
});

app.post('/api/connect', (req, res) => {
  res.json({ success: false, message: 'Bot WhatsApp hanya dapat dijalankan di server lokal, bukan di Vercel.' });
});

app.post('/api/disconnect', (req, res) => {
  res.json({ success: true, message: 'Disconnected' });
});

app.post('/api/send-test-alert', (req, res) => {
  res.json({ success: false, message: 'Pesan otomatis dikirim melalui server lokal yang terhubung WhatsApp.' });
});

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
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
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
      return res.status(404).send('Image not found');
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(imageBuffer);
  } catch (err) {
    res.status(500).send('Proxy error: ' + err.message);
  }
});

export default app;
