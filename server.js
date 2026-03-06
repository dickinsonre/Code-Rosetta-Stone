import express from 'express';
import multer from 'multer';
import { execFile, spawn } from 'child_process';
import { readFile, readFileSync, unlink, mkdirSync, existsSync, readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import Anthropic from '@anthropic-ai/sdk';

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
const RUBY_ENGINE_PORT = 3009;
const JAVA_ENGINE_PORT = 3011;
const KOTLIN_ENGINE_PORT = 3012;
const SCALA_ENGINE_PORT = 3013;
const NIM_ENGINE_PORT = 3014;
const ZIG_ENGINE_PORT = 3015;
const DART_ENGINE_PORT = 3016;
const TCL_ENGINE_PORT = 3017;
const RACKET_ENGINE_PORT = 3018;
const ELIXIR_ENGINE_PORT = 3019;

const uploadDir = path.join(__dirname, 'uploads');
if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

const goBinary = path.join(__dirname, 'swmm5-go', 'swmm5-go');
const cBinary = path.join(__dirname, 'swmm5-c', 'swmm5-c');
const cppBinary = path.join(__dirname, 'swmm5-cpp', 'swmm5-cpp');
const pyScript = path.join(__dirname, 'swmm5-py', 'swmm5_engine.py');
const tsScript = path.join(__dirname, 'swmm5-ts', 'swmm5_engine.ts');
const rustBinary = path.join(__dirname, 'swmm5-rust-native', 'target', 'release', 'swmm5-rust-native');
const perlScript = path.join(__dirname, 'swmm5-perl', 'swmm5_engine.pl');
const rubyScript = path.join(__dirname, 'swmm5-ruby', 'swmm5_engine.rb');
const luaScript = path.join(__dirname, 'swmm5-lua', 'swmm5_engine.lua');
const javaDir = path.join(__dirname, 'swmm5-java');
const kotlinJar = path.join(__dirname, 'swmm5-kotlin', 'SwmmEngine.jar');
const scalaScript = path.join(__dirname, 'swmm5-scala', 'SwmmEngine.scala');
const nimBinary = path.join(__dirname, 'swmm5-nim', 'swmm5-nim');
const zigBinary = path.join(__dirname, 'swmm5-zig', 'swmm5_engine');
const dartBinary = path.join(__dirname, 'swmm5-dart', 'swmm5-dart');
const tclScript = path.join(__dirname, 'swmm5-tcl', 'swmm5_engine.tcl');
const racketScript = path.join(__dirname, 'swmm5-racket', 'swmm5_engine.rkt');
const elixirScript = path.join(__dirname, 'swmm5-elixir', 'swmm5_engine.exs');
const fortranBinary = path.join(__dirname, 'swmm5-fortran', 'swmm5-fortran');
const rScript = path.join(__dirname, 'swmm5-r', 'swmm5_engine.R');
const ocamlBinary = path.join(__dirname, 'swmm5-ocaml', 'swmm5-ocaml');
const haskellBinary = path.join(__dirname, 'swmm5-haskell', 'swmm5-haskell');
const pascalBinary = path.join(__dirname, 'swmm5-pascal', 'swmm5_engine');
const lispScript = path.join(__dirname, 'swmm5-lisp', 'swmm5_engine.lisp');
const adaBinary = path.join(__dirname, 'swmm5-ada', 'swmm5-ada');

let goProcess = null;
let pyProcess = null;
let cProcess = null;
let cppProcess = null;
let tsProcess = null;
let rustProcess = null;
let perlProcess = null;
let rubyProcess = null;
let javaProcess = null;
let kotlinProcess = null;
let scalaProcess = null;
let nimProcess = null;
let zigProcess = null;
let dartProcess = null;
let tclProcess = null;
let racketProcess = null;
let elixirProcess = null;

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
rubyProcess = startChildEngine('Ruby Engine', 'ruby', [rubyScript], { RUBY_ENGINE_PORT: String(RUBY_ENGINE_PORT) });
if (existsSync(path.join(javaDir, 'SwmmEngine.class'))) {
  const javaProc = spawn('java', ['-cp', javaDir, 'SwmmEngine'], {
    env: { ...process.env, JAVA_ENGINE_PORT: String(JAVA_ENGINE_PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  javaProc.stdout.on('data', d => console.log('[Java Engine]', d.toString().trim()));
  javaProc.stderr.on('data', d => console.error('[Java Engine ERR]', d.toString().trim()));
  javaProc.on('exit', code => console.log(`Java Engine exited with code ${code}`));
  javaProcess = javaProc;
}

if (existsSync(kotlinJar)) {
  kotlinProcess = startChildEngine('Kotlin Engine', 'java', ['-jar', kotlinJar], { KOTLIN_ENGINE_PORT: String(KOTLIN_ENGINE_PORT) });
}
if (existsSync(scalaScript)) {
  scalaProcess = startChildEngine('Scala Engine', 'scala', [scalaScript], { SCALA_ENGINE_PORT: String(SCALA_ENGINE_PORT) });
}
if (existsSync(nimBinary)) {
  nimProcess = startChildEngine('Nim Engine', nimBinary, [], { NIM_ENGINE_PORT: String(NIM_ENGINE_PORT) });
}
if (existsSync(zigBinary)) {
  zigProcess = startChildEngine('Zig Engine', zigBinary, [], { ZIG_ENGINE_PORT: String(ZIG_ENGINE_PORT) });
}
if (existsSync(dartBinary)) {
  dartProcess = startChildEngine('Dart Engine', dartBinary, [], { DART_ENGINE_PORT: String(DART_ENGINE_PORT) });
}
if (existsSync(tclScript)) {
  tclProcess = startChildEngine('Tcl Engine', 'tclsh', [tclScript], { TCL_ENGINE_PORT: String(TCL_ENGINE_PORT) });
}
if (existsSync(racketScript)) {
  racketProcess = startChildEngine('Racket Engine', 'racket', [racketScript], { RACKET_ENGINE_PORT: String(RACKET_ENGINE_PORT) });
}
if (existsSync(elixirScript)) {
  elixirProcess = startChildEngine('Elixir Engine', 'elixir', [elixirScript], { ELIXIR_ENGINE_PORT: String(ELIXIR_ENGINE_PORT) });
}

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

app.post('/api/run-swmm-ruby', upload.single('inpFile'), (req, res) => {
  proxyToEngine('Ruby engine', RUBY_ENGINE_PORT, req, res);
});

app.post('/api/run-swmm-java', upload.single('inpFile'), (req, res) => {
  proxyToEngine('Java engine', JAVA_ENGINE_PORT, req, res);
});

app.post('/api/run-swmm-lua', upload.single('inpFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No .inp file uploaded' });
  }
  const inpPath = req.file.path;
  readFile(inpPath, 'utf8', (readErr, inpText) => {
    try { unlink(inpPath, () => {}); } catch (e) {}
    if (readErr) {
      return res.status(500).json({ error: 'Could not read uploaded file' });
    }
    const proc = spawn('lua', [luaScript], { timeout: 60000 });
    let stdout = '', stderr = '';
    proc.stdout.on('data', d => { stdout += d; });
    proc.stderr.on('data', d => { stderr += d; });
    proc.on('close', (code) => {
      if (code !== 0) {
        return res.status(500).json({ error: 'Lua engine error: ' + stderr });
      }
      try {
        const result = JSON.parse(stdout);
        res.json(result);
      } catch (e) {
        res.status(500).json({ error: 'Invalid response from Lua engine' });
      }
    });
    proc.stdin.write(inpText);
    proc.stdin.end();
  });
});

app.post('/api/run-swmm-kotlin', upload.single('inpFile'), (req, res) => {
  proxyToEngine('Kotlin engine', KOTLIN_ENGINE_PORT, req, res);
});

app.post('/api/run-swmm-scala', upload.single('inpFile'), (req, res) => {
  proxyToEngine('Scala engine', SCALA_ENGINE_PORT, req, res);
});

app.post('/api/run-swmm-nim', upload.single('inpFile'), (req, res) => {
  proxyToEngine('Nim engine', NIM_ENGINE_PORT, req, res);
});

app.post('/api/run-swmm-zig', upload.single('inpFile'), (req, res) => {
  proxyToEngine('Zig engine', ZIG_ENGINE_PORT, req, res);
});

app.post('/api/run-swmm-dart', upload.single('inpFile'), (req, res) => {
  proxyToEngine('Dart engine', DART_ENGINE_PORT, req, res);
});

app.post('/api/run-swmm-tcl', upload.single('inpFile'), (req, res) => {
  proxyToEngine('Tcl engine', TCL_ENGINE_PORT, req, res);
});

app.post('/api/run-swmm-racket', upload.single('inpFile'), (req, res) => {
  proxyToEngine('Racket engine', RACKET_ENGINE_PORT, req, res);
});

app.post('/api/run-swmm-elixir', upload.single('inpFile'), (req, res) => {
  proxyToEngine('Elixir engine', ELIXIR_ENGINE_PORT, req, res);
});

function cgiEngine(engineName, cmd, args, req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'No .inp file uploaded' });
  }
  const inpPath = req.file.path;
  readFile(inpPath, 'utf8', (readErr, inpText) => {
    try { unlink(inpPath, () => {}); } catch (e) {}
    if (readErr) {
      return res.status(500).json({ error: 'Could not read uploaded file' });
    }
    const proc = spawn(cmd, args, { timeout: 60000 });
    let stdout = '', stderr = '';
    proc.stdout.on('data', d => { stdout += d; });
    proc.stderr.on('data', d => { stderr += d; });
    proc.on('close', (code) => {
      if (code !== 0) {
        return res.status(500).json({ error: engineName + ' error: ' + stderr });
      }
      try {
        const result = JSON.parse(stdout);
        res.json(result);
      } catch (e) {
        res.status(500).json({ error: 'Invalid response from ' + engineName });
      }
    });
    proc.stdin.write(inpText);
    proc.stdin.end();
  });
}

app.post('/api/run-swmm-fortran', upload.single('inpFile'), (req, res) => {
  cgiEngine('Fortran engine', fortranBinary, [], req, res);
});

app.post('/api/run-swmm-r', upload.single('inpFile'), (req, res) => {
  cgiEngine('R engine', 'Rscript', [rScript], req, res);
});

app.post('/api/run-swmm-ocaml', upload.single('inpFile'), (req, res) => {
  cgiEngine('OCaml engine', ocamlBinary, [], req, res);
});

app.post('/api/run-swmm-haskell', upload.single('inpFile'), (req, res) => {
  cgiEngine('Haskell engine', haskellBinary, [], req, res);
});

app.post('/api/run-swmm-pascal', upload.single('inpFile'), (req, res) => {
  cgiEngine('FreePascal engine', pascalBinary, [], req, res);
});

app.post('/api/run-swmm-lisp', upload.single('inpFile'), (req, res) => {
  cgiEngine('Common Lisp engine', 'sbcl', ['--script', lispScript], req, res);
});

app.post('/api/run-swmm-ada', upload.single('inpFile'), (req, res) => {
  cgiEngine('Ada engine', adaBinary, [], req, res);
});

const sourceFileMap = {
  'c': path.join(__dirname, 'swmm5-c', 'swmm5_engine.c'),
  'cpp': path.join(__dirname, 'swmm5-cpp', 'swmm5_engine.cpp'),
  'rust': path.join(__dirname, 'swmm5-rust-native', 'src', 'main.rs'),
  'go': path.join(__dirname, 'swmm5-go', 'main.go'),
  'python': path.join(__dirname, 'swmm5-py', 'swmm5_engine.py'),
  'js': path.join(__dirname, 'src', 'engines', 'swmm5-js.js'),
  'ts': path.join(__dirname, 'swmm5-ts', 'swmm5_engine.ts'),
  'java': path.join(__dirname, 'swmm5-java', 'SwmmEngine.java'),
  'ruby': path.join(__dirname, 'swmm5-ruby', 'swmm5_engine.rb'),
  'perl': path.join(__dirname, 'swmm5-perl', 'swmm5_engine.pl'),
  'lua': path.join(__dirname, 'swmm5-lua', 'swmm5_engine.lua'),
  'kotlin': path.join(__dirname, 'swmm5-kotlin', 'SwmmEngine.kt'),
  'scala': path.join(__dirname, 'swmm5-scala', 'SwmmEngine.scala'),
  'nim': path.join(__dirname, 'swmm5-nim', 'swmm5_engine.nim'),
  'zig': path.join(__dirname, 'swmm5-zig', 'swmm5_engine.zig'),
  'dart': path.join(__dirname, 'swmm5-dart', 'swmm5_engine.dart'),
  'tcl': path.join(__dirname, 'swmm5-tcl', 'swmm5_engine.tcl'),
  'racket': path.join(__dirname, 'swmm5-racket', 'swmm5_engine.rkt'),
  'elixir': path.join(__dirname, 'swmm5-elixir', 'swmm5_engine.exs'),
  'fortran': path.join(__dirname, 'swmm5-fortran', 'swmm5_engine.f90'),
  'r': path.join(__dirname, 'swmm5-r', 'swmm5_engine.R'),
  'ocaml': path.join(__dirname, 'swmm5-ocaml', 'swmm5_engine.ml'),
  'haskell': path.join(__dirname, 'swmm5-haskell', 'swmm5_engine.hs'),
  'pascal': path.join(__dirname, 'swmm5-pascal', 'swmm5_engine.pas'),
  'lisp': path.join(__dirname, 'swmm5-lisp', 'swmm5_engine.lisp'),
  'ada': path.join(__dirname, 'swmm5-ada', 'swmm5_engine.adb'),
};

app.get('/api/engine-source/:lang', (req, res) => {
  const filePath = sourceFileMap[req.params.lang];
  if (!filePath || !existsSync(filePath)) {
    return res.status(404).json({ error: 'Source not found' });
  }
  readFile(filePath, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Could not read source' });
    res.type('text/plain').send(data);
  });
});

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

function gatherCodeContext() {
  const dirs = readdirSync(__dirname, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name.startsWith('swmm5-'))
    .map(d => d.name);
  const snippets = [];
  for (const dir of dirs) {
    const files = readdirSync(path.join(__dirname, dir)).filter(f =>
      /\.(c|cpp|rs|go|py|js|ts|java|rb|pl|lua|kt|scala|nim|zig|dart|tcl|rkt|exs|f90|R|ml|hs|pas|lisp|adb)$/.test(f)
    );
    for (const f of files) {
      try {
        const content = readFileSync(path.join(__dirname, dir, f), 'utf8');
        if (content.length < 50000) {
          snippets.push(`--- ${dir}/${f} (${content.split('\n').length} lines) ---\n${content.substring(0, 3000)}${content.length > 3000 ? '\n... (truncated)' : ''}`);
        }
      } catch {}
    }
  }
  return snippets.join('\n\n');
}

let cachedCodeContext = null;
function getCodeContext() {
  if (!cachedCodeContext) cachedCodeContext = gatherCodeContext();
  return cachedCodeContext;
}

app.use(express.json({ limit: '1mb' }));

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    const codeContext = getCodeContext();
    const systemPrompt = `You are the SWMM5 & EPANET Rosetta Stone AI assistant. You have deep knowledge of:
- EPA SWMM5 (Storm Water Management Model) — hydraulics, hydrology, water quality
- EPA EPANET — pressurized pipe network hydraulic/water quality modeling
- This project: an interactive multi-language code comparison tool showing SWMM5 algorithms in 37 languages and EPANET algorithms in 8 languages
- All the engine implementations (C, Rust, Go, Python, JavaScript, TypeScript, Java, Ruby, Perl, Lua, Kotlin, Scala, Nim, Zig, Dart, Tcl, Racket, Elixir, Fortran, R, OCaml, Haskell, Pascal, Common Lisp, Ada)

Here is a summary of all engine source code in this project:
${codeContext}

Answer questions about the code, algorithms, SWMM5/EPANET concepts, or help users understand the implementations. Be specific and reference actual code when relevant. Keep answers concise but thorough.`;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error) {
    console.error('Chat API error:', error);
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SWMM5 backend running on port ${PORT}`);
});
