'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');
const fs = require('node:fs');
const vm = require('node:vm');
let child, base, wsBase;
const clients = [];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
before(async () => {
  const probe = net.createServer();
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  base = 'http://127.0.0.1:' + port; wsBase = 'ws://127.0.0.1:' + port;
  child = spawn(process.execPath, ['server.js'], { cwd: path.join(__dirname, '..'), env: { ...process.env, PORT: String(port) }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stderr.on('data', b => { output += b; });
  for (let attempt = 0; attempt < 80; attempt++) {
    try { if ((await fetch(base + '/health')).ok) return; } catch {}
    if (child.exitCode !== null) throw Error(output || 'Servidor encerrou.');
    await sleep(50);
  }
  throw Error('Servidor não iniciou: ' + output);
});
after(async () => { for (const c of clients) c.ws.close(); child?.kill(); });
async function connect(room) {
  const ws = new WebSocket(wsBase + '/ws?room=' + room), messages = [];
  clients.push({ ws });
  const welcome = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(Error('Sem welcome')), 5000);
    ws.addEventListener('error', reject, { once: true });
    ws.addEventListener('message', e => { const m = JSON.parse(e.data); messages.push(m); if (m.type === 'welcome') { clearTimeout(timeout); resolve(m); } });
  });
  return { ws, room, messages, ...welcome, send(event, data) { ws.send(JSON.stringify({ type: 'event', event, data })); },
    request(route, options = {}) { return fetch(base + route + (route.includes('?') ? '&' : '?') + 'room=' + room, { ...options, headers: { 'X-Jam-Token': welcome.token, ...(options.headers || {}) } }); } };
}
async function until(fn) { for (let i = 0; i < 100; i++) { const r = fn(); if (r) return r; await sleep(10); } throw Error('Evento não recebido'); }
async function upload(c, value, name = 'Minha música.wav') {
  const response = await c.request('/api/song', { method: 'POST', headers: { 'Content-Type': 'audio/wav', 'X-Jam-Name': encodeURIComponent(name) }, body: Buffer.from(value) });
  assert.equal(response.status, 200, await response.clone().text()); return (await response.json()).song;
}
async function prepare(c,key) {
  const claim=await(await c.request('/api/analysis/claim?key='+key,{method:'POST'})).json();assert.ok(claim.lease);
  const wav=Buffer.alloc(44+22050,128);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVE',8);wav.write('fmt ',12);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(22050,24);wav.writeUInt32LE(22050,28);wav.writeUInt16LE(1,32);wav.writeUInt16LE(8,34);wav.write('data',36);wav.writeUInt32LE(22050,40);
  const headers={'X-Analysis-Lease':claim.lease};
  assert.equal((await c.request('/api/analysis/stem?instrument=baixo&key='+key,{method:'PUT',headers,body:wav})).status,200);
  const response=await c.request('/api/analysis/complete?key='+key,{method:'POST',headers,body:JSON.stringify({version:1,duration:1,instruments:['baixo'],events:{baixo:[{t:.1,pitch:40,dur:.2,s:.8}]}})});
  assert.equal(response.status,200,await response.clone().text());
}

test('JavaScript da interface compila', () => {
  const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length); for (const [, script] of scripts) new vm.Script(script);
});
test('dois jogadores compartilham, escolhem, recebem e removem músicas', async () => {
  const a = await connect('playlist-test'), b = await connect('playlist-test');
  const first = await upload(a, 'audio-um');
  await until(() => b.messages.find(m => m.type === 'playlist' && m.playlist.songs.length === 1));
  const second = await upload(b, 'audio-dois', 'Outra música.wav');
  const newcomer = await connect('playlist-test');
  assert.equal(newcomer.playlist.songs.length, 2);
  assert.equal(newcomer.song.key, 'rock');
  assert.equal((await a.request('/api/playlist?key='+first.key,{method:'POST'})).status,409);
  const queue=await(await a.request('/api/analysis/queue')).json();assert.deepEqual(queue.jobs.map(j=>j.key),[first.key,second.key]);
  await prepare(a,first.key);await prepare(b,second.key);
  // Download pela chave continua correto mesmo após outra música ser selecionada.
  const selected = await a.request('/api/playlist?key=' + first.key, { method: 'POST' });
  assert.equal(selected.status, 200);
  const audio = await b.request('/api/song?key=' + second.key);
  assert.equal(await audio.text(), 'audio-dois');
  await until(() => b.messages.find(m => m.type === 'song' && m.song.key === first.key));
  const removed = await b.request('/api/playlist?key=' + first.key, { method: 'DELETE' });
  assert.equal((await removed.json()).selectedKey, second.key);
  await b.request('/api/playlist?key=' + second.key, { method: 'DELETE' });
  const state = await (await a.request('/api/playlist')).json();
  assert.equal(state.songs.length, 0); assert.equal(state.selectedKey, 'rock');
});
test('deduplica arquivos e limita a playlist a dez músicas', async () => {
  const c = await connect('limits-test');
  await upload(c, 'same'); await upload(c, 'same');
  assert.equal((await (await c.request('/api/playlist')).json()).songs.length, 1);
  for (let i = 0; i < 9; i++) await upload(c, 'song-' + i);
  const rejected = await c.request('/api/song', { method: 'POST', headers: { 'Content-Type': 'audio/wav' }, body: 'extra' });
  assert.equal(rejected.status, 400); assert.match(await rejected.text(), /10 músicas/);
  assert.equal((await (await c.request('/api/playlist')).json()).songs.length, 10);
  const bad = await c.request('/api/song', { method: 'POST', headers: { 'Content-Type': 'text/html' }, body: '<h1>bad</h1>' });
  assert.equal(bad.status, 415);
});
test('protege as músicas por sala e exige token de participante', async () => {
  const a = await connect('private-a'), b = await connect('private-b');
  const song = await upload(a, 'som-isolado');
  assert.equal((await b.request('/api/song?key=' + song.key)).status, 404);
  assert.equal((await fetch(base + '/api/playlist?room=private-a')).status, 403);
  assert.equal((await b.request('/api/playlist?key=' + song.key, { method: 'DELETE' })).status, 404);
  const empty = await b.request('/api/song', { method: 'POST', headers: { 'Content-Type': 'audio/wav' }, body: '' });
  assert.equal(empty.status, 400);
});
test('escolher um exemplo preserva a playlist; esvaziar a sala limpa os áudios', async () => {
  const a = await connect('cleanup-test');
  await upload(a, 'audio-persistente');
  a.send('demo', { id: 'funk' });
  await until(() => a.messages.find(m => m.type === 'song' && m.song.key === 'funk'));
  assert.equal((await (await a.request('/api/playlist')).json()).songs.length, 1);
  a.ws.close();
  await until(() => a.ws.readyState === WebSocket.CLOSED);
  const b = await connect('cleanup-test');
  assert.equal(b.playlist.songs.length, 0); assert.equal(b.song.key, 'rock');
});

test('sincronização de rodada: só host inicia, apenas jogadores prontos e sem duplicar o início', async () => {
  const a = await connect('sync-verified'), b = await connect('sync-verified');
  const presence = (c, data) => c.ws.send(JSON.stringify({type:'presence',data}));
  presence(a, {n:'Host',i:'guitarra',d:'facil',on:true,sg:'rock',hs:'rock'});
  presence(b, {n:'Amigo',i:'baixo',d:'facil',on:true,sg:'rock'});
  await until(() => a.messages.some(m=>m.type==='peers' && m.peers.length===2 && m.peers.every(p=>p.presence.sg==='rock')));
  const roster=[{p:a.id,n:'Host',i:'guitarra',d:'facil'},{p:b.id,n:'Amigo',i:'baixo',d:'facil'}];
  b.send('go',{r:11,sg:'rock',roster});
  b.send('start',{r:11,at:Date.now()+4000});
  await sleep(80);
  assert.equal(a.messages.filter(m=>m.type==='event' && ['go','start'].includes(m.event)).length,0);
  a.send('go',{r:12,sg:'rock',roster:roster.slice(0,1)});
  await sleep(80);
  assert.equal(a.messages.some(m=>m.type==='event'&&m.event==='go'),false);
  a.send('go',{r:13,sg:'rock',roster});
  await until(()=>a.messages.find(m=>m.type==='event'&&m.event==='go'&&m.data.r===13));
  a.send('start',{r:13,at:Date.now()+4000}); // Amigo ainda não está pronto.
  await sleep(80);
  assert.equal(b.messages.some(m=>m.type==='event'&&m.event==='start'),false);
  presence(a,{rd:13});presence(b,{rd:13});
  await until(()=>a.messages.find(m=>m.type==='peers'&&m.peers.length===2&&m.peers.every(p=>p.presence.rd===13)));
  const at=Date.now()+4000;
  a.send('start',{r:13,at});
  await until(()=>b.messages.find(m=>m.type==='event'&&m.event==='start'&&m.data.r===13));
  a.send('start',{r:13,at});
  await sleep(80);
  assert.equal(b.messages.filter(m=>m.type==='event'&&m.event==='start'&&m.data.r===13).length,1);
});

test('trocar a música cancela início de rodada anterior',async()=>{
  const c=await connect('changing-song');
  c.ws.send(JSON.stringify({type:'presence',data:{n:'Membro',i:'guitarra',d:'facil',on:true,sg:'rock',hs:'rock'}}));
  await until(()=>c.messages.find(m=>m.type==='peers'&&m.peers[0]?.presence.hs==='rock'));
  c.send('go',{r:20,sg:'rock',roster:[{p:c.id,n:'Membro',i:'guitarra',d:'facil'}]});
  await until(()=>c.messages.find(m=>m.type==='event'&&m.event==='go'&&m.data.r===20));
  c.send('demo',{id:'funk'});
  await until(()=>c.messages.find(m=>m.type==='song'&&m.song.key==='funk'));
  c.ws.send(JSON.stringify({type:'presence',data:{rd:20,hs:'funk',sg:'funk'}}));
  c.send('start',{r:20,at:Date.now()+4000});
  await sleep(80);
  assert.equal(c.messages.some(m=>m.type==='event'&&m.event==='start'),false);
});
