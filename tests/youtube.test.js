'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const youtube = require('../youtube');
const createMusicService = require('../music-service');
test('aceita somente IDs e links do YouTube; rejeita destinos arbitrários', () => {
  for (const value of ['sMcWOaJFuw0', 'https://youtu.be/sMcWOaJFuw0?t=2', 'https://www.youtube.com/watch?v=sMcWOaJFuw0', 'https://music.youtube.com/watch?v=sMcWOaJFuw0']) assert.equal(youtube.videoId(value), 'sMcWOaJFuw0');
  for (const value of ['https://example.com/watch?v=sMcWOaJFuw0', 'http://127.0.0.1/secrets', 'https://youtube.com.evil.test/watch?v=sMcWOaJFuw0', '--exec calc', 'https://youtube.com:8080/watch?v=sMcWOaJFuw0']) assert.equal(youtube.videoId(value), null);
});
test('importação com provedor simulado: áudio compartilhado, deduplicação e recuperação de falha', async t => {
  const c = { id: 'a', uploadToken: 'token', closed: false };
  const room = { code: 'yt-test', members: new Set([c]), playlist: [], songRevision: 1, song: { meta: { key: 'rock', kind: 'demo' } } };
  const rooms = new Map([[room.code, room]]), events = [];
  let calls = 0;
  const service = createMusicService({ rooms, broadcast: (_, event) => events.push(event), youtubeProvider: { videoId: youtube.videoId,
    search: async () => [{ id: 'sMcWOaJFuw0', title: 'Teste', duration: 20 }],
    download: async id => { calls++; if (id === 'aaaaaaaaaaa') throw Error('Vídeo indisponível.'); return { bytes: Buffer.from('audio do youtube'), name: 'Teste', mime: 'audio/mp4', duration: 20, sourceId: id }; } } });
  const server = http.createServer((req, res) => service.handle(req, res, new URL(req.url, 'http://localhost')));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = 'http://127.0.0.1:' + server.address().port;
  const request = (route, options = {}) => fetch(base + route + (route.includes('?') ? '&' : '?') + 'room=yt-test', { ...options, headers: { 'X-Jam-Token': 'token', ...(options.headers || {}) } });
  const search = await request('/api/youtube/search?q=teste'); assert.equal((await search.json()).results[0].title, 'Teste');
  const doImport = id => request('/api/youtube/import', { method: 'POST', body: JSON.stringify({ id }) });
  assert.equal((await doImport('sMcWOaJFuw0')).status, 200);
  assert.equal(room.playlist.length, 1); assert.equal(service.stats().audioBytes, 16);
  assert.ok(events.some(m => m.type === 'playlist' && m.playlist.importing));
  assert.equal(room.song.meta.key,'rock');
  assert.equal(await (await request('/api/song?key='+room.playlist[0].meta.key)).text(), 'audio do youtube');
  await doImport('sMcWOaJFuw0'); assert.equal(calls, 1);
  assert.equal((await doImport('aaaaaaaaaaa')).status, 400);
  assert.equal(room.uploading, false); assert.equal(room.playlist.length, 1); assert.equal(service.stats().imports, 0);
  assert.equal((await doImport('https://example.com/audio')).status, 400);
  service.releaseRoom(room); assert.equal(service.stats().audioBytes, 0);
});
