'use strict';
// Celulares de la comunidad ("nodos"): la app hace long-poll al bot, recibe trabajos
// (buscar / info / audio) y devuelve resultados o sube el audio por POST encadenado.
const crypto = require('crypto');
const { PassThrough } = require('stream');

const KEY = process.env.NODE_KEY || '';
const ONLINE_MS = 45000, POLL_MS = 25000, MAX_NODES = 200;
const nodes = new Map();     // id -> {id,name,lastSeen,res,timer,queue,active,badUntil,served}
const pending = new Map();   // rid -> {resolve}
const uploads = new Map();   // rid -> {stream, req}
const banned = new Set();

const okId = (s) => /^[A-Za-z0-9_-]{12,48}$/.test(s || '');
const newRid = () => crypto.randomBytes(8).toString('hex');
const online = () => [...nodes.values()].filter((n) => !banned.has(n.id) && Date.now() - n.lastSeen < ONLINE_MS);
const pick = () => online().filter((n) => n.badUntil < Date.now()).sort((a, b) => a.active - b.active || Math.random() - 0.5);

function sendJob(n, job) {
  if (n.res) {
    clearTimeout(n.timer);
    const r = n.res; n.res = null;
    r.writeHead(200, { 'content-type': 'application/json' }); r.end(JSON.stringify(job));
  } else n.queue.push(job);
}

function askNode(n, job, ms) {
  return new Promise((resolve, reject) => {
    const rid = newRid(); n.active++;
    const timer = setTimeout(() => { pending.delete(rid); n.active--; reject(new Error('timeout')); }, ms);
    pending.set(rid, { resolve: (d) => { clearTimeout(timer); pending.delete(rid); n.active--; d && d.ok ? resolve(d) : reject(new Error((d && d.err) || 'fallo')); } });
    sendJob(n, { ...job, rid });
  });
}
async function ask(job, ms = 15000) {
  for (const n of pick()) {
    try { return await askNode(n, job, ms); } catch { n.badUntil = Date.now() + 120000; }
  }
  throw new Error('NO_NODES');
}
const search = async (q) => (await ask({ t: 'search', q: String(q).slice(0, 120) })).items || [];
const info = async (v) => (await ask({ t: 'info', v })).item;

// Devuelve { stream, node, cancel } cuando llegó el primer pedazo de audio.
function audioFrom(n, v) {
  return new Promise((resolve, reject) => {
    const rid = newRid(); n.active++;
    const stream = new PassThrough({ highWaterMark: 1 << 20 });
    const u = { stream, req: null };
    let done = false, freed = false;
    const free = () => { if (freed) return; freed = true; n.active--; uploads.delete(rid); pending.delete(rid); };
    const fail = (e) => { if (done) return; done = true; clearTimeout(timer); free(); stream.destroy(); reject(e); };
    const timer = setTimeout(() => fail(new Error('timeout')), 25000);
    uploads.set(rid, u);
    pending.set(rid, { resolve: (d) => fail(new Error((d && d.err) || 'fallo')) });
    stream.once('readable', () => {
      if (done) return; done = true; clearTimeout(timer); n.served++;
      resolve({ stream, node: n, cancel: () => { try { u.req && u.req.destroy(); } catch {} stream.destroy(); } });
    });
    stream.once('close', free);
    sendJob(n, { t: 'audio', rid, v });
  });
}
async function audio(v) {
  for (const n of pick()) {
    try { return await audioFrom(n, v); } catch { n.badUntil = Date.now() + 120000; }
  }
  throw new Error('NO_NODES');
}

function handle(req, res) {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  if (p === '/' || p === '/health') { res.writeHead(200); return res.end(`Xloom Music bot OK · ${online().length} celulares`); }
  if (!p.startsWith('/nodo/')) { res.writeHead(404); return res.end(); }
  const id = url.searchParams.get('id'), key = url.searchParams.get('key') || '';
  if (!KEY || key !== KEY) { res.writeHead(401); return res.end(); }
  if (!okId(id) || banned.has(id)) { res.writeHead(403); return res.end(); }

  if (p === '/nodo/poll') {
    let n = nodes.get(id);
    if (!n) {
      if (nodes.size >= MAX_NODES) { res.writeHead(503); return res.end(); }
      n = { id, name: '', lastSeen: 0, res: null, timer: null, queue: [], active: 0, badUntil: 0, served: 0 };
      nodes.set(id, n);
    }
    n.lastSeen = Date.now();
    n.name = String(url.searchParams.get('name') || 'celular').replace(/[^\w .-]/g, '').slice(0, 24) || 'celular';
    if (n.res) { clearTimeout(n.timer); try { n.res.writeHead(204); n.res.end(); } catch {} n.res = null; }
    if (n.queue.length) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify(n.queue.shift())); }
    n.res = res;
    n.timer = setTimeout(() => { if (n.res === res) { n.res = null; res.writeHead(204); res.end(); } }, POLL_MS);
    res.on('close', () => { if (n.res === res) { clearTimeout(n.timer); n.res = null; } });
    return;
  }
  if (p === '/nodo/result' && req.method === 'POST') {
    const rid = url.searchParams.get('rid'); let body = '';
    req.on('data', (c) => { body += c; if (body.length > 200000) req.destroy(); });
    req.on('end', () => {
      try { const w = pending.get(rid); if (w) w.resolve(JSON.parse(body)); } catch {}
      res.writeHead(200); res.end('ok');
    });
    return;
  }
  if (p.startsWith('/nodo/up/') && req.method === 'POST') {
    const u = uploads.get(p.slice(9));
    if (!u) { res.writeHead(404); return res.end(); }
    u.req = req;
    req.pipe(u.stream);
    req.on('aborted', () => u.stream.destroy());
    req.on('error', () => u.stream.destroy());
    req.on('end', () => { res.writeHead(200); res.end('ok'); });
    return;
  }
  res.writeHead(404); res.end();
}

const list = () => online().map((n) => ({ id: n.id, name: n.name, served: n.served, active: n.active }));
const ban = (prefix) => { const n = [...nodes.values()].find((x) => x.id.startsWith(prefix)); if (!n) return false; banned.add(n.id); return true; };

module.exports = { handle, search, info, audio, list, ban, count: () => online().length };
