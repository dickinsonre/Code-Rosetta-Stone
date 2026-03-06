import express from 'express';
import multer from 'multer';
import { execFile, spawn } from 'child_process';
import { readFile, readFileSync, unlink, mkdirSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = 3001;
const GO_ENGINE_PORT = 3002;

const uploadDir = path.join(__dirname, 'uploads');
if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

const goBinary = path.join(__dirname, 'swmm5-go', 'swmm5-go');
let goProcess = null;

function startGoEngine() {
  if (!existsSync(goBinary)) {
    console.log('Go SWMM5 engine binary not found, skipping');
    return;
  }
  goProcess = spawn(goBinary, [], {
    env: { ...process.env, GO_ENGINE_PORT: String(GO_ENGINE_PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  goProcess.stdout.on('data', d => console.log('[Go Engine]', d.toString().trim()));
  goProcess.stderr.on('data', d => console.error('[Go Engine ERR]', d.toString().trim()));
  goProcess.on('exit', (code) => {
    console.log(`Go engine exited with code ${code}`);
    goProcess = null;
  });
}

startGoEngine();

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, unique + '-' + file.originalname);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.originalname.toLowerCase().endsWith('.inp')) {
      cb(null, true);
    } else {
      cb(new Error('Only .inp files are accepted'));
    }
  },
});

app.post('/api/run-swmm', upload.single('inpFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No .inp file uploaded' });
  }

  const inpPath = req.file.path;
  const baseName = inpPath.replace(/\.inp$/i, '');
  const rptPath = baseName + '.rpt';
  const outPath = baseName + '.out';

  const runScript = path.join(__dirname, 'run_swmm.py');

  execFile('python3', [runScript, inpPath, rptPath, outPath], {
    timeout: 120000,
  }, (error, stdout, stderr) => {
    const cleanup = () => {
      [inpPath, outPath].forEach(f => {
        try { unlink(f, () => {}); } catch (e) {}
      });
    };

    if (error) {
      readFile(rptPath, 'utf8', (rptErr, rptData) => {
        cleanup();
        try { unlink(rptPath, () => {}); } catch (e) {}
        return res.status(500).json({
          error: 'SWMM5 simulation failed',
          details: stderr || error.message,
          rpt: rptData || null,
        });
      });
      return;
    }

    readFile(rptPath, 'utf8', (rptErr, rptData) => {
      cleanup();
      try { unlink(rptPath, () => {}); } catch (e) {}

      if (rptErr) {
        return res.status(500).json({
          error: 'Could not read .rpt file',
          details: rptErr.message,
        });
      }

      res.json({
        success: true,
        rpt: rptData,
        stdout: stdout,
      });
    });
  });
});

app.post('/api/run-swmm-go', upload.single('inpFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No .inp file uploaded' });
  }

  const inpPath = req.file.path;
  readFile(inpPath, 'utf8', (readErr, inpText) => {
    try { unlink(inpPath, () => {}); } catch (e) {}

    if (readErr) {
      return res.status(500).json({ error: 'Could not read uploaded file' });
    }

    const postData = inpText;
    const options = {
      hostname: '127.0.0.1',
      port: GO_ENGINE_PORT,
      path: '/simulate',
      method: 'POST',
      headers: { 'Content-Type': 'text/plain', 'Content-Length': Buffer.byteLength(postData) },
      timeout: 30000,
    };

    const goReq = http.request(options, (goRes) => {
      let body = '';
      goRes.on('data', chunk => { body += chunk; });
      goRes.on('end', () => {
        try {
          const result = JSON.parse(body);
          res.json(result);
        } catch (e) {
          res.status(500).json({ error: 'Invalid response from Go engine' });
        }
      });
    });

    goReq.on('error', (err) => {
      res.status(500).json({ error: 'Go engine not available: ' + err.message });
    });

    goReq.on('timeout', () => {
      goReq.destroy();
      res.status(500).json({ error: 'Go engine timed out' });
    });

    goReq.write(postData);
    goReq.end();
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SWMM5 backend running on port ${PORT}`);
});
