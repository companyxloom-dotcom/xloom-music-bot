'use strict';
// Envoltorio de yt-dlp: se descarga solo la primera vez (binario independiente, no necesita Python).
const fs = require('fs');
const path = require('path');
const { execFile, spawn } = require('child_process');

const BIN_DIR = path.join(__dirname, '..', '..', 'bin');

function assetName() {
  const { platform, arch } = process;
  if (platform === 'win32') return 'yt-dlp.exe';
  if (platform === 'darwin') return 'yt-dlp_macos';
  if (platform === 'linux') return arch === 'arm64' ? 'yt-dlp_linux_aarch64' : 'yt-dlp_linux';
  return 'yt-dlp';
}
const binPath = () => process.env.YTDLP_PATH || path.join(BIN_DIR, assetName());

function baseArgs() {
  const a = ['--no-warnings', '--no-playlist'];
  if (process.env.YTDLP_COOKIES) a.push('--cookies', process.env.YTDLP_COOKIES);
  if (process.env.YTDLP_EXTRA_ARGS) a.push(...process.env.YTDLP_EXTRA_ARGS.split(/\s+/).filter(Boolean));
  return a;
}

let ready = null;
function ensure() {
  if (ready) return ready;
  ready = (async () => {
    const file = binPath();
    if (process.env.YTDLP_PATH || fs.existsSync(file)) return file;
    fs.mkdirSync(BIN_DIR, { recursive: true });
    console.log('[music] Descargando yt-dlp (solo la primera vez)...');
    const res = await fetch(`https://github.com/yt-dlp/yt-dlp/releases/latest/download/${assetName()}`, { redirect: 'follow' });
    if (!res.ok) throw new Error(`No pude descargar yt-dlp (HTTP ${res.status}). Descárgalo a mano y pon YTDLP_PATH en .env`);
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
    fs.chmodSync(tmp, 0o755);
    fs.renameSync(tmp, file);
    console.log('[music] yt-dlp listo.');
    return file;
  })().catch((e) => { ready = null; throw e; });
  return ready;
}

// YouTube cambia seguido: actualiza yt-dlp una vez al arrancar (en segundo plano).
function autoUpdate() {
  if (process.env.YTDLP_PATH) return;
  ensure().then((file) => execFile(file, ['-U'], { timeout: 60000 }, (err, out) => {
    if (!err && /Updated|updating/i.test(String(out))) console.log('[music] yt-dlp actualizado.');
  })).catch(() => {});
}

async function run(args, timeout = 45000) {
  const file = await ensure();
  return new Promise((resolve, reject) => {
    execFile(file, [...baseArgs(), ...args], { timeout, maxBuffer: 32 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) return reject(new Error((String(stderr).trim().split('\n').pop() || err.message).slice(0, 300)));
      resolve(stdout);
    });
  });
}

const json = async (args, timeout) => JSON.parse(await run(['-J', ...args], timeout));

// Devuelve el proceso; su stdout es el audio. proc.err acumula stderr.
async function stream(url) {
  const file = await ensure();
  const proc = spawn(file, [...baseArgs(), '-q', '-f', 'bestaudio/best', '-o', '-', url], { stdio: ['ignore', 'pipe', 'pipe'] });
  proc.err = '';
  proc.stderr.on('data', (d) => { proc.err = (proc.err + d).slice(-600); });
  proc.on('error', (e) => { proc.err += ` ${e.message}`; });
  return proc;
}

module.exports = { ensure, autoUpdate, run, json, stream };
