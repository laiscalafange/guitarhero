/**
 * Jam na Garagem — servidor HTTP + WebSocket, sem dependências externas.
 * Mantém salas e o áudio da sala temporariamente em memória (sem armazenamento permanente).
 * Node.js 22+.
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
const MAX_SOCKET_BACKLOG = 1024 * 1024; // Evita acumular mensagens para conexões lentas.
const rooms = new Map();
const html = path.join(__dirname, 'public', 'index.html');
const analysis = require('./analysis-service')({ rooms, broadcast, announce });
const music = require('./music-service')({ rooms, broadcast, onRemove: (room,key) => analysis.remove(room,key),onAdd:room=>analysis.enqueue(room),canSelect:(room,key)=>analysis.state(room,key).status==='ready' });

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  const pathname = url.pathname;
  if (await analysis.handle(req, res, url)) return;
  if (await music.handle(req, res, url)) return;
  if (['/chart-engine.js', '/chart-import.js','/ai-client.js', '/ai-worker.js','/ai-worker-gpu.js'].includes(pathname) || pathname.startsWith('/vendor/') || pathname.startsWith('/models/')) {
    const target = path.resolve(__dirname, 'public', '.' + pathname);
    if (!target.startsWith(path.resolve(__dirname, 'public') + path.sep) || !/\.(m?js|wasm|json|bin)$/.test(target) || !fs.existsSync(target)) { res.writeHead(404); res.end(); return; }
    const mime = { '.js':'text/javascript', '.mjs':'text/javascript', '.wasm':'application/wasm', '.json':'application/json', '.bin':'application/octet-stream' }[path.extname(target)];
    res.writeHead(200, {'Content-Type':mime,'Cache-Control':/\.m?js$/.test(target)?'no-store':'public, max-age=3600','Cross-Origin-Resource-Policy':'same-origin','Cross-Origin-Embedder-Policy':'credentialless'});
    fs.createReadStream(target).pipe(res); return;
  }
  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size, players: [...rooms.values()].reduce((n, r) => n + r.members.size, 0) }));
    return;
  }
  if (pathname === '/' || pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "frame-ancestors 'self'", 'Cross-Origin-Opener-Policy':'same-origin', 'Cross-Origin-Embedder-Policy':'credentialless' });
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
  if (c.closed || !c.socket.writable) return;
  if (c.socket.writableLength > MAX_SOCKET_BACKLOG) {
    close(c, 1013, 'Conexao lenta');
    return;
  }
  try { c.socket.write(frame(1, JSON.stringify(payload))); } catch { drop(c); }
}
function broadcast(room, msg) { for (const c of room.members) send(c, msg); }
function roomSnapshot(room) {
  return [...room.members].map(c => ({ peer: c.id, presence: c.presence }));
}
function announce(room) { broadcast(room, { type: 'peers', peers: roomSnapshot(room), hostId: room.hostId }); }
function drop(c) {
  if (c.closed) return;
  c.closed = true;
  if (c.room) {
    const room = c.room;
    room.members.delete(c);
    if (room.hostId === c.id) {
      // Quem entrou primeiro entre os presentes assume, sem depender do navegador.
      room.hostId = room.members.values().next().value?.id || null;
      if (room.round) {
        // Uma rodada ainda não iniciada pelo host antigo não pode ficar bloqueada.
        const cancelled = room.round.r;
        room.round = null;
        delete room.pendingRound;
        broadcast(room, { type: 'roundCancelled', round: cancelled });
      }
    }
    analysis.peerLeft(room,c.id);
    if (!room.members.size) {
      music.releaseRoom(room);
      analysis.release(room);
      rooms.delete(room.code);
    }
    else announce(room);
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

const allowedInstruments = new Set(['guitarra', 'baixo', 'bateria', 'teclado', 'vocal']);
const allowedDifficulties = new Set(['facil', 'medio', 'dificil', 'expert']);
function applyPresence(c, d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return;
  const p = c.presence;
  if (typeof d.n === 'string') p.n = d.n.trim().slice(0, 16) || 'Jogador';
  const available = analysis.state(c.room,c.room.song?.meta.key);
  if (allowedInstruments.has(d.i) && (available.status !== 'ready' || available.instruments.includes(d.i))) p.i = d.i;
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
function isHost(c) { return c.room.hostId === c.id; }
function handleText(c, text) {
  let m;
  try { m = JSON.parse(text); } catch { return; }
  if (!m || typeof m !== 'object' || Array.isArray(m)) return;
  if (m.type === 'presence') { applyPresence(c, m.data); return; }
  if (m.type !== 'event' || !['go', 'start', 'ping', 'pong', 'hit', 'err', 'hold', 'demo'].includes(m.event)) return;
  if (m.event === 'demo') {
    if (!m.data || !['rock', 'funk', 'voz'].includes(m.data.id)) return;

    const meta = { key: m.data.id, name: m.data.id === 'rock' ? 'Garagem 120' : m.data.id === 'voz' ? 'Ensaio vocal' : 'Ladeira 96', revision: (c.room.songRevision || 0) + 1, kind: 'demo', by: c.id };
    music.select(c.room, { bytes: null, meta }); return;
  }
  if (['go', 'start', 'pong'].includes(m.event) && !isHost(c)) return;
  if (!m.data || typeof m.data !== 'object' || Array.isArray(m.data)) return;
  if (['hit', 'err', 'hold'].includes(m.event) && m.data.i !== c.presence.i) return;
  if (['go', 'start'].includes(m.event) && (!Number.isSafeInteger(m.data.r) || c.presence.hs !== c.room.song?.meta.key)) return;
  if (m.event === 'go') {
    const room = c.room;
    if (m.data.sg !== room.song?.meta.key || !Array.isArray(m.data.roster)) return;
    const active = [...room.members].filter(p => !p.closed && p.presence.on !== false && !!p.presence.n);
    if (m.data.roster.length !== active.length || !active.length) return;
    const rosterIds = new Set();
    for (const item of m.data.roster) {
      if (!item || typeof item.p !== 'string' || rosterIds.has(item.p)) return;
      const peer = active.find(p => p.id === item.p);
      if (!peer || peer.presence.sg !== room.song.meta.key || peer.presence.i !== item.i || peer.presence.d !== item.d) return;
      rosterIds.add(item.p);
    }
    room.pendingRound = { r: m.data.r, roster: [...rosterIds] };
  }
  if (m.event === 'start') {
    const round = c.room.round;
    if (!round || round.r !== m.data.r || !Number.isFinite(m.data.at) ||
        round.roster.some(id => {
          const peer = [...c.room.members].find(p => p.id === id);
          return peer && peer.presence.rd !== round.r;
        })) return;
    // O mesmo início não pode ser transmitido mais de uma vez.
    c.room.round = null;
  }
  if (m.event === 'go' && c.room.song?.meta.kind === 'file') {
    const available = analysis.state(c.room,c.room.song.meta.key);
    if (available.status !== 'ready' || m.data.roster.some(p => !available.instruments.includes(p.i)||(available.difficulties&&!available.difficulties[p.i]?.includes(p.d)))) { delete c.room.pendingRound; return; }
  }
  if (JSON.stringify(m.data).length > 12000) { delete c.room.pendingRound; return; }
  if (m.event === 'go') { c.room.round = c.room.pendingRound; delete c.room.pendingRound; }
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
  if (!room) { room = { code, hostId: null, nextSeq: 1, members: new Set(), playlist: [], songRevision: 1, song: { bytes: null, meta: { key: 'rock', name: 'Garagem 120', revision: 1, kind: 'demo' } } }; rooms.set(code, room); }
  const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  socket.setNoDelay(true);
  const c = { socket, room, id: crypto.randomBytes(8).toString('hex'), uploadToken: crypto.randomBytes(24).toString('hex'), buffer: Buffer.alloc(0), closed: false,
    presence: { seq: room.nextSeq++ }, parts: [], partSize: 0, alive: Date.now(), lastPong: Date.now() };
  room.members.add(c);
  if (!room.hostId) room.hostId = c.id;
  socket.on('data', b => receive(c, b));
  socket.on('close', () => drop(c));
  socket.on('error', () => drop(c));
  send(c, { type: 'welcome', id: c.id, code, token: c.uploadToken, song: room.song?.meta || null, playlist: music.snapshot(room) });
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