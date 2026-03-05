import express from 'express';
import multer from 'multer';
import { execFile } from 'child_process';
import { readFile, unlink, mkdirSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = 3001;

const uploadDir = path.join(__dirname, 'uploads');
if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SWMM5 backend running on port ${PORT}`);
});
