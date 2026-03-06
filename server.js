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
const PY_ENGINE_PORT = 3003;
const C_ENGINE_PORT = 3004;
const CPP_ENGINE_PORT = 3005;
const TS_ENGINE_PORT = 3006;
const RUST_ENGINE_PORT = 3007;
const PERL_ENGINE_PORT = 3008;

const uploadDir = path.join(__dirname, 'uploads');
if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

const goBinary = path.join(__dirname, 'swmm5-go', 'swmm5-go');
const cBinary = path.join(__dirname, 'swmm5-c', 'swmm5-c');
const cppBinary = path.join(__dirname, 'swmm5-cpp', 'swmm5-cpp');
const pyScript = path.join(__dirname, 'swmm5-py', 'swmm5_engine.py');
const tsScript = path.join(__dirname, 'swmm5-ts', 'swmm5_engine.ts');
const rustBinary = path.join(__dirname, 'swmm5-rust-native', 'target', 'release', 'swmm5-rust-native');
const perlScript = path.join(__dirname, 'swmm5-perl', 'swmm5_engine.pl');

let goProcess = null;
let pyProcess = null;
let cProcess = null;
let cppProcess = null;
let tsProcess = null;
let rustProcess = null;
let perlProcess = null;

function startChildEngine(name, cmd, args, envOverrides) {
  const checkPath = args.length > 0 ? args[args.length - 1] : cmd;
  if (!existsSync(checkPath)) {
    console.log(`${name} not found at ${checkPath}, skipping`);
    return null;
  }
  const proc = spawn(cmd, args, {
    env: { ...process.env, ...envOverrides },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stdout.on('data', d => console.log(`[${name}]`, d.toString().trim()));
  proc.stderr.on('data', d => console.error(`[${name} ERR]`, d.toString().trim()));
  proc.on('exit', (code) => {
    console.log(`${name} exited with code ${code}`);
  });
  return proc;
}

goProcess = startChildEngine('Go Engine', goBinary, [], { GO_ENGINE_PORT: String(GO_ENGINE_PORT) });
pyProcess = startChildEngine('Python Engine', 'python3', [pyScript], { PY_ENGINE_PORT: String(PY_ENGINE_PORT) });
if (existsSync(cBinary)) cProcess = startChildEngine('C Engine', cBinary, [], { C_ENGINE_PORT: String(C_ENGINE_PORT) });
if (existsSync(cppBinary)) cppProcess = startChildEngine('C++ Engine', cppBinary, [], { CPP_ENGINE_PORT: String(CPP_ENGINE_PORT) });
tsProcess = startChildEngine('TypeScript Engine', 'bun', ['run', tsScript], { TS_ENGINE_PORT: String(TS_ENGINE_PORT) });
if (existsSync(rustBinary)) rustProcess = startChildEngine('Rust Native Engine', rustBinary, [], { RUST_ENGINE_PORT: String(RUST_ENGINE_PORT) });
perlProcess = startChildEngine('Perl Engine', 'perl', [perlScript], { PERL_ENGINE_PORT: String(PERL_ENGINE_PORT) });

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

function proxyToEngine(engineName, enginePort, req, res) {
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
      port: enginePort,
      path: '/simulate',
      method: 'POST',
      headers: { 'Content-Type': 'text/plain', 'Content-Length': Buffer.byteLength(postData) },
      timeout: 60000,
    };

    const engineReq = http.request(options, (engineRes) => {
      let body = '';
      engineRes.on('data', chunk => { body += chunk; });
      engineRes.on('end', () => {
        try {
          const result = JSON.parse(body);
          res.json(result);
        } catch (e) {
          res.status(500).json({ error: 'Invalid response from ' + engineName });
        }
      });
    });

    engineReq.on('error', (err) => {
      res.status(500).json({ error: engineName + ' not available: ' + err.message });
    });

    engineReq.on('timeout', () => {
      engineReq.destroy();
      res.status(500).json({ error: engineName + ' timed out' });
    });

    engineReq.write(postData);
    engineReq.end();
  });
}

app.post('/api/run-swmm-go', upload.single('inpFile'), (req, res) => {
  proxyToEngine('Go engine', GO_ENGINE_PORT, req, res);
});

app.post('/api/run-swmm-python', upload.single('inpFile'), (req, res) => {
  proxyToEngine('Python engine', PY_ENGINE_PORT, req, res);
});

app.post('/api/run-swmm-c', upload.single('inpFile'), (req, res) => {
  proxyToEngine('C engine', C_ENGINE_PORT, req, res);
});

app.post('/api/run-swmm-cpp', upload.single('inpFile'), (req, res) => {
  proxyToEngine('C++ engine', CPP_ENGINE_PORT, req, res);
});

app.post('/api/run-swmm-ts', upload.single('inpFile'), (req, res) => {
  proxyToEngine('TypeScript engine', TS_ENGINE_PORT, req, res);
});

app.post('/api/run-swmm-rust-native', upload.single('inpFile'), (req, res) => {
  proxyToEngine('Rust native engine', RUST_ENGINE_PORT, req, res);
});

app.post('/api/run-swmm-perl', upload.single('inpFile'), (req, res) => {
  proxyToEngine('Perl engine', PERL_ENGINE_PORT, req, res);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SWMM5 backend running on port ${PORT}`);
});
