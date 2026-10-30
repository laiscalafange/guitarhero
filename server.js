/**
 * Jam na Garagem — servidor HTTP + WebSocket, sem dependências externas.
 * Mantém salas e o áudio da sala temporariamente em memória (sem armazenamento permanente).
 * Node.js 20+.
 */
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const PORT = Number(process.env.PORT) || 3000;
const MAX_PEERS = 8;
const MAX_ROOMS = 300;
const MAX_FRAME = 32768;
const MAX_AUDIO = 25 * 1024 * 1024; // 25 MiB por música
const MAX_AUDIO_TOTAL = 125 * 1024 * 1024; // limite global de arquivos simultâneos
let audioBytes = 0;
const audioTypes = new Set(['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/ogg', 'audio/mp4', 'audio/x-m4a', 'audio/flac', 'audio/x-flac', 'audio/aac', 'application/octet-stream']);
const roomCodeOk = code => /^[a-z0-9-]{3,24}$/.test(code);
function getClient(req, url) {
  const r = rooms.get(url.searchParams.get('room') || '');
  if (!r) return null;
  const token = req.headers['x-jam-token'];
  return [...r.members].find(c => !c.closed && c.uploadToken === token) || null;
}
function reportError(res, status, text) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(text);
}
function notifySong(room) {
  broadcast(room, { type: 'song', song: room.song ? room.song.meta : null });
}
const rooms = new Map();
const html = path.join(__dirname, 'public', 'index.html');

const server = http.createServer((req, res) => {
  const pathname = (req.url || '').split('?')[0];
  if (pathname === '/api/song') {
    const url = new URL(req.url, 'http://localhost');
    const c = getClient(req, url);
    if (!c) { reportError(res, 403, 'Entre na sala antes de enviar ou baixar uma música.'); req.resume(); return; }
    const room = c.room;
    if (req.method === 'GET') {
      if (!room.song || !room.song.bytes) return reportError(res, 404, 'Não há áudio nesta sala.');
      res.writeHead(200, {
        'Content-Type': room.song.mime, 'Content-Length': room.song.bytes.length,
        'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'
      });
      res.end(room.song.bytes); return;
    }
    if (req.method !== 'POST') return reportError(res, 405, 'Método inválido.');
    if (room.uploading) { reportError(res, 409, 'Alguém já está enviando uma música.'); req.resume(); return; }
    const announced = Number(req.headers['content-length']);
    if (Number.isFinite(announced) && announced > MAX_AUDIO) { reportError(res, 413, 'Música maior que o limite de 25 MB.'); req.resume(); return; }
    const mime = String(req.headers['content-type'] || 'application/octet-stream').split(';')[0].toLowerCase();
    if (!audioTypes.has(mime)) { reportError(res, 415, 'Tipo de áudio não permitido.'); req.resume(); return; }
    let name;
    try { name = encodeURIComponent(decodeURIComponent(String(req.headers['x-jam-name'] || 'Música')).slice(0, 90)); }
    catch { name = encodeURIComponent('Música'); }
    let size = 0, failed = false;
    const chunks = [];
    room.uploading = true;
    const fail = (status, reason) => {
      if (failed) return;
      failed = true; room.uploading = false;
      if (!res.writableEnded && !res.destroyed) reportError(res, status, reason);
    };
    req.on('data', chunk => {
      if (failed) return;
      size += chunk.length;
      if (size > MAX_AUDIO) { fail(413, 'Música maior que o limite de 25 MB.'); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('aborted', () => fail(400, 'Envio interrompido.'));
    req.on('error', () => fail(400, 'Erro no envio.'));
    req.on('end', () => {
      if (failed) return;
      if (!size) return fail(400, 'Arquivo vazio.');
      const oldSize = room.song?.bytes?.length || 0;
      if (audioBytes - oldSize + size > MAX_AUDIO_TOTAL) return fail(507, 'Servidor com limite de músicas atingido. Tente mais tarde.');
      const bytes = Buffer.concat(chunks);
      const hash = crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 32);
      const meta = { key: 'f:' + hash, name, size, revision: (room.songRevision || 0) + 1, by: c.id, kind: 'file' };
      audioBytes += size - oldSize;
      room.song = { bytes, mime, meta }; room.songRevision = meta.revision;
      room.uploading = false;
      notifySong(room);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ song: meta }));
    });
    return;
  }
  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size, players: [...rooms.values()].reduce((n, r) => n + r.members.size, 0) }));
    return;
  }
  if (pathname === '/' || pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "frame-ancestors 'self'" });
    fs.createReadStream(html).on('error', () => { if (!res.headersSent) res.writeHead(500); res.end('Falha ao abrir o jogo'); }).pipe(res);
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Não encontrado');
});

const frame = (opcode, data = Buffer.alloc(0)) => {
  const body = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const head = body.length < 126 ? 2 : body.length <= 65535 ? 4 : 10;
  const out = Buffer.allocUnsafe(head + body.length);
  out[0] = 0x80 | opcode;
  if (head === 2) out[1] = body.length;
  else if (head === 4) { out[1] = 126; out.writeUInt16BE(body.length, 2); }
  else { out[1] = 127; out.writeBigUInt64BE(BigInt(body.length), 2); }
  body.copy(out, head);
  return out;
};

function send(c, payload) {
  if (!c.closed && c.socket.writable) {
    try { c.socket.write(frame(1, JSON.stringify(payload))); } catch { drop(c); }
  }
}
function broadcast(room, msg) { for (const c of room.members) send(c, msg); }
function roomSnapshot(room) {
  return [...room.members].map(c => ({ peer: c.id, presence: c.presence }));
}
function announce(room) { broadcast(room, { type: 'peers', peers: roomSnapshot(room) }); }
function drop(c) {
  if (c.closed) return;
  c.closed = true;
  if (c.room) {
    c.room.members.delete(c);
    if (!c.room.members.size) {
      audioBytes -= c.room.song?.bytes?.length || 0;
      rooms.delete(c.room.code);
    }
    else announce(c.room);
  }
  try { c.socket.destroy(); } catch {}
}
function close(c, code = 1000, message = '') {
  if (c.closed) return;
  const b = Buffer.alloc(2 + Buffer.byteLength(message));
  b.writeUInt16BE(code, 0);
  b.write(message, 2);
  try { c.socket.write(frame(8, b)); c.socket.end(); } catch {}
  drop(c);
}

const allowedInstruments = new Set(['guitarra', 'baixo', 'bateria', 'teclado']);
const allowedDifficulties = new Set(['facil', 'medio', 'dificil', 'expert']);
function applyPresence(c, d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return;
  const p = c.presence;
  if (typeof d.n === 'string') p.n = d.n.trim().slice(0, 16) || 'Jogador';
  if (allowedInstruments.has(d.i)) p.i = d.i;
  if (allowedDifficulties.has(d.d)) p.d = d.d;
  if (typeof d.on === 'boolean') p.on = d.on;
  for (const k of ['sg', 'hs', 'hn']) {
    if (d[k] === null) delete p[k];
    else if (typeof d[k] === 'string') p[k] = d[k].slice(0, 160);
  }
  if (d.rd === null) delete p.rd;
  else if (Number.isSafeInteger(d.rd)) p.rd = d.rd;
  if (d.st === null) delete p.st;
  else if (d.st && typeof d.st === 'object' && Number.isSafeInteger(d.st.r)) {
    const s = d.st;
    const points = x => Math.max(0, Math.min(100000000, Number(x) || 0));
    p.st = { r: s.r, tot: points(s.tot), sc: points(s.sc), cb: points(s.cb), mx: points(s.mx),
      c: Array.isArray(s.c) ? s.c.slice(0, 3).map(points) : [0, 0, 0], ms: points(s.ms), cv: points(s.cv), fin: s.fin ? 1 : 0 };
  }
  announce(c.room);
}
function isHost(c) { return c === c.room.members.values().next().value; }
function handleText(c, text) {
  let m;
  try { m = JSON.parse(text); } catch { return; }
  if (!m || typeof m !== 'object') return;
  if (m.type === 'presence') { applyPresence(c, m.data); return; }
  if (m.type !== 'event' || !['go', 'start', 'ping', 'pong', 'hit', 'err', 'hold', 'demo'].includes(m.event)) return;
  if (m.event === 'demo') {
    if (!m.data || !['rock', 'funk'].includes(m.data.id)) return;
    audioBytes -= c.room.song?.bytes?.length || 0;
    const meta = { key: m.data.id, name: m.data.id === 'rock' ? 'Garagem 120' : 'Ladeira 96', revision: (c.room.songRevision || 0) + 1, kind: 'demo', by: c.id };
    c.room.song = { bytes: null, meta }; c.room.songRevision = meta.revision;
    notifySong(c.room); return;
  }
  if (['go', 'start', 'pong'].includes(m.event) && !isHost(c)) return;
  if (!m.data || typeof m.data !== 'object' || Array.isArray(m.data)) return;
  if (['hit', 'err', 'hold'].includes(m.event) && m.data.i !== c.presence.i) return;
  if (['go', 'start'].includes(m.event) && (!Number.isSafeInteger(m.data.r) || !c.presence.hs)) return;
  if (JSON.stringify(m.data).length > 12000) return;
  broadcast(c.room, { type: 'event', event: m.event, peer: c.id, data: m.data });
}
function receive(c, raw) {
  c.buffer = Buffer.concat([c.buffer, raw]);
  if (c.buffer.length > MAX_FRAME * 2) return close(c, 1009, 'Mensagem grande');
  while (c.buffer.length >= 2) {
    const b = c.buffer, fin = !!(b[0] & 0x80), opcode = b[0] & 0x0f;
    if (b[0] & 0x70) return close(c, 1002, 'Quadro inválido');
    if (!(b[1] & 0x80)) return close(c, 1002, 'Máscara obrigatória');
    let len = b[1] & 0x7f, pos = 2;
    if (len === 126) { if (b.length < 4) return; len = b.readUInt16BE(2); pos = 4; }
    else if (len === 127) {
      if (b.length < 10) return;
      const n = b.readBigUInt64BE(2);
      if (n > BigInt(MAX_FRAME)) return close(c, 1009, 'Mensagem grande');
      len = Number(n); pos = 10;
    }
    if (len > MAX_FRAME) return close(c, 1009, 'Mensagem grande');
    if (b.length < pos + 4 + len) return;
    const mask = b.subarray(pos, pos + 4), payload = Buffer.from(b.subarray(pos + 4, pos + 4 + len));
    for (let i = 0; i < len; i++) payload[i] ^= mask[i % 4];
    c.buffer = b.subarray(pos + 4 + len);
    c.alive = Date.now();
    if (opcode >= 8) {
      if (!fin || len > 125) return close(c, 1002, 'Controle inválido');
      if (opcode === 8) return close(c);
      if (opcode === 9) c.socket.write(frame(10, payload));
      if (opcode === 10) c.lastPong = Date.now();
      continue;
    }
    if (opcode === 2) return close(c, 1003, 'Somente texto');
    if (opcode === 1) {
      if (c.parts.length) return close(c, 1002, 'Fragmentação inválida');
      c.parts = [payload]; c.partSize = len;
    } else if (opcode === 0) {
      if (!c.parts.length) return close(c, 1002, 'Continuação inválida');
      c.parts.push(payload); c.partSize += len;
      if (c.partSize > MAX_FRAME) return close(c, 1009, 'Mensagem grande');
    } else return close(c, 1002, 'Operação inválida');
    if (fin) {
      const complete = Buffer.concat(c.parts); c.parts = []; c.partSize = 0;
      const decoder = new TextDecoder('utf-8', { fatal: true });
      try { handleText(c, decoder.decode(complete)); } catch { return close(c, 1007, 'Texto inválido'); }
    }
  }
}

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url || '/', 'http://localhost');
  const code = url.searchParams.get('room') || '';
  const key = req.headers['sec-websocket-key'];
  if (url.pathname !== '/ws' || !/^[a-z0-9-]{3,24}$/.test(code) ||
    req.headers.upgrade?.toLowerCase() !== 'websocket' || req.headers['sec-websocket-version'] !== '13' ||
    !key || Buffer.from(key, 'base64').length !== 16) {
    socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n'); return;
  }
  const origin = req.headers.origin;
  if (origin) {
    try { if (new URL(origin).host !== req.headers.host) throw Error('origem diferente'); }
    catch { socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return; }
  }
  let room = rooms.get(code);
  if ((!room && rooms.size >= MAX_ROOMS) || (room && room.members.size >= MAX_PEERS)) {
    socket.end('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n'); return;
  }
  if (!room) { room = { code, nextSeq: 1, members: new Set(), songRevision: 1, song: { bytes: null, meta: { key: 'rock', name: 'Garagem 120', revision: 1, kind: 'demo' } } }; rooms.set(code, room); }
  const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  socket.setNoDelay(true);
  const c = { socket, room, id: crypto.randomBytes(8).toString('hex'), uploadToken: crypto.randomBytes(24).toString('hex'), buffer: Buffer.alloc(0), closed: false,
    presence: { seq: room.nextSeq++ }, parts: [], partSize: 0, alive: Date.now(), lastPong: Date.now() };
  room.members.add(c);
  socket.on('data', b => receive(c, b));
  socket.on('close', () => drop(c));
  socket.on('error', () => drop(c));
  send(c, { type: 'welcome', id: c.id, code, token: c.uploadToken, song: room.song?.meta || null });
  announce(room);
  if (head.length) receive(c, head);
});

const heart = setInterval(() => {
  for (const room of rooms.values()) for (const c of room.members) {
    if (Date.now() - c.lastPong > 95000) { drop(c); continue; }
    if (!c.closed && c.socket.writable) c.socket.write(frame(9));
  }
}, 30000);
heart.unref();
server.listen(PORT, '0.0.0.0', () => console.log(`Jam na Garagem disponível na porta ${PORT}`));
process.on('SIGTERM', () => { for (const room of rooms.values()) for (const c of room.members) close(c, 1001, 'Servidor reiniciado'); server.close(); });