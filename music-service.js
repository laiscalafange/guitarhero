'use strict';
// Playlist e APIs de música isoladas das regras de pontuação/multiplayer.
const crypto = require('node:crypto');
const {Readable,Transform}=require('node:stream');
const {pipeline}=require('node:stream/promises');
const youtube = require('./youtube');
const MAX_AUDIO = 25 * 1024 * 1024;
const MAX_TOTAL = 125 * 1024 * 1024;
const MAX_SONGS = 10;
const audioTypes = new Set(['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/ogg', 'audio/mp4', 'audio/x-m4a', 'audio/flac', 'audio/x-flac', 'audio/aac', 'audio/webm', 'application/octet-stream']);

module.exports = function createMusicService({ rooms, broadcast, youtubeProvider = youtube, catalogProvider = require('./chart-catalog'), onRemove = () => {}, onAdd = () => {}, canSelect = () => true }) {
  let audioBytes = 0, pendingBytes = 0, imports = 0, searches = 0,packageDownloads=0;
  const snapshot = room => ({ songs: (room.playlist || []).map(s => s.meta), selectedKey: room.song?.meta.key || null, importing: !!room.uploading });
  const notify = room => broadcast(room, { type: 'playlist', playlist: snapshot(room) });
  function select(room, song) {
    room.round = null; // Cancela contagem regressiva pendente se a música mudou.
    room.songRevision++;
    room.song = { ...song, meta: { ...song.meta, revision: room.songRevision } };
    broadcast(room, { type: 'song', song: room.song.meta });
    notify(room);
  }
  function add(room, c, { bytes, mime, name, duration, sourceId,chartId }) {
    if (rooms.get(room.code) !== room || !room.members.size) throw Error('A sala foi encerrada.');
    const key = (chartId?'c:':'f:') + crypto.createHash('sha256').update(bytes).update(chartId||'').digest('hex').slice(0, 32);
    const existing = room.playlist.find(s => s.meta.key === key);
    if (existing) { if(canSelect(room,key))select(room, existing);return existing.meta; }
    if (room.playlist.length >= MAX_SONGS) throw Error('A playlist já tem 10 músicas. Remova uma antes de adicionar outra.');
    if (audioBytes + pendingBytes + bytes.length > MAX_TOTAL) throw Error('O servidor atingiu o limite de músicas. Remova músicas ou tente mais tarde.');
    const song = { bytes, mime, meta: { key, name: encodeURIComponent(name.slice(0, 90)), size: bytes.length, kind: 'file', by: c.id,
      ...(duration ? { duration } : {}), ...(sourceId ? { sourceId } : {}),...(chartId?{chartPending:true}:{}) } };
    audioBytes += bytes.length;
    room.playlist.push(song);
    onAdd(room,key);notify(room);
    return song.meta;
  }
  function error(res, status, message) {
    if (!res.destroyed && !res.writableEnded) {
      res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.end(message);
    }
  }
  function json(res, data) {
    if (res.destroyed || res.writableEnded) return;
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(JSON.stringify(data));
  }
  function readJson(req) {
    return new Promise((resolve, reject) => {
      let body = '', failed = false;
      req.setEncoding('utf8');
      req.on('data', chunk => { if (failed) return; body += chunk; if (body.length > 2048) { failed = true; body = ''; reject(Error('Pedido muito grande.')); } });
      req.on('end', () => { if (failed) return; try { resolve(JSON.parse(body)); } catch { reject(Error('Pedido inválido.')); } });
      req.on('error', reject);
      req.on('aborted', () => reject(Error('Pedido interrompido.')));
    });
  }
  async function handle(req, res, url) {
    if (!['/api/song', '/api/playlist', '/api/youtube/search', '/api/youtube/import','/api/charts/search','/api/charts/package'].includes(url.pathname)) return false;
    const room = rooms.get(url.searchParams.get('room') || '');
    const c = room && [...room.members].find(c => !c.closed && c.uploadToken === req.headers['x-jam-token']);
    if (!c) { error(res, 403, 'Entre na sala antes de acessar as músicas.'); req.resume(); return true; }
    room.playlist ||= [];
    try {
      if(url.pathname==='/api/charts/package'&&req.method==='GET'){
        const id=url.searchParams.get('id')||'';if(!/^[a-f0-9]{32}$/.test(id)){error(res,400,'Pacote inválido.');return true;}
        if(room.chartDownloading||packageDownloads>=2){error(res,429,'Já há um download de pacote em andamento. Aguarde e tente novamente.');return true;}
        room.chartDownloading=true;packageDownloads++;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),120000),abort=()=>{if(!res.writableEnded)controller.abort();};res.once('close',abort);
        try{
          const upstream=await catalogProvider.download(id,{noVideo:url.searchParams.get('novideo')==='1',signal:controller.signal});
          const headers={'Content-Type':'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};const length=upstream.headers.get('content-encoding')?0:Number(upstream.headers.get('content-length'));
          if(length>100*1024*1024){await upstream.body.cancel();throw Error('O pacote ultrapassa 100 MB.');}if(length>0)headers['Content-Length']=length;
          res.writeHead(200,headers);let size=0;
          await pipeline(Readable.fromWeb(upstream.body),new Transform({transform(chunk,_,callback){size+=chunk.length;callback(size>100*1024*1024?Error('Pacote maior que 100 MB.'):null,chunk);}}),res,{signal:controller.signal});
        }catch(e){if(res.headersSent)res.destroy();else error(res,400,e.name==='AbortError'?'O download demorou demais. Tente novamente.':e.message);}
        finally{clearTimeout(timer);res.removeListener('close',abort);room.chartDownloading=false;packageDownloads--;}
        return true;
      }
      if(url.pathname==='/api/charts/search'&&req.method==='GET'){
        const q=String(url.searchParams.get('q')||'').trim();if(q.length<2||q.length>160){error(res,400,'Digite de 2 a 160 caracteres.');return true;}
        if(c.checkingCharts){error(res,429,'Aguarde a consulta atual.');return true;}
        c.checkingCharts=true;try{json(res,await catalogProvider.search(q));}finally{c.checkingCharts=false;}return true;
      }
      if (url.pathname === '/api/youtube/search' && req.method === 'GET') {
        const query = (url.searchParams.get('q') || '').trim();
        if (query.length < 2 || query.length > 160) { error(res, 400, 'Digite de 2 a 160 caracteres para pesquisar.'); return true; }
        if (c.searching || searches >= 3) { error(res, 429, 'Já há uma pesquisa em andamento. Aguarde um instante.'); return true; }
        c.searching = true; searches++;
        try { json(res, { results: await youtubeProvider.search(query) }); }
        finally { c.searching = false; searches--; }
        return true;
      }
      if (url.pathname === '/api/youtube/import' && req.method === 'POST') {
        const body = await readJson(req);
        const id = youtubeProvider.videoId(body?.id);
        if (!id) { error(res, 400, 'Escolha um vídeo válido do YouTube.'); return true; }
        if (room.uploading || imports >= 1) { error(res, 409, 'Já há uma importação em andamento no servidor. Aguarde e tente novamente.'); return true; }
        const existing = room.playlist.find(s => s.meta.sourceId === id);
        if (existing) { if(canSelect(room,existing.meta.key))select(room, existing);json(res, { song: existing.meta }); return true; }
        if (room.playlist.length >= MAX_SONGS) { error(res, 409, 'A playlist já tem 10 músicas. Remova uma primeiro.'); return true; }
        room.uploading = true; imports++;
        room.abortController = new AbortController(); notify(room);
        try { json(res, { song: add(room, c, await youtubeProvider.download(id, room.abortController.signal)) }); }
        finally { imports--; room.uploading = false; room.abortController = null; notify(room); }
        return true;
      }
      if (url.pathname === '/api/playlist') {
        if (req.method === 'GET') { json(res, snapshot(room)); return true; }
        const key = url.searchParams.get('key');
        const song = room.playlist.find(s => s.meta.key === key);
        if (!song) { error(res, 404, 'Essa música não está mais na playlist.'); req.resume(); return true; }
        if (req.method === 'POST') {
          if(!canSelect(room,key)){error(res,409,'Essa música ainda está na fila de análise. Escolha uma das prontas.');req.resume();return true;}
          select(room, song); json(res, { song: room.song.meta }); req.resume(); return true;
        }
        if (req.method === 'DELETE') {
          room.playlist.splice(room.playlist.indexOf(song), 1); audioBytes -= song.bytes.length;
          onRemove(room, key);
          if (room.song?.meta.key === key) select(room, room.playlist.find(s=>canSelect(room,s.meta.key)) || { bytes: null, meta: { key: 'rock', name: 'Garagem 120', kind: 'demo' } });
          else notify(room);
          json(res, snapshot(room)); return true;
        }
      }
      if (url.pathname === '/api/song') {
        if (req.method === 'GET') {
          const key = url.searchParams.get('key');
          const song = key ? room.playlist.find(s => s.meta.key === key) : room.song;
          if (!song?.bytes) { error(res, 404, 'Esse áudio não está mais na sala.'); return true; }
          res.writeHead(200, { 'Content-Type': song.mime, 'Content-Length': song.bytes.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
          res.end(song.bytes); return true;
        }
        if (req.method === 'POST') {
          if (room.uploading) { error(res, 409, 'Alguém já está adicionando uma música.'); req.resume(); return true; }
          const mime = String(req.headers['content-type'] || 'application/octet-stream').split(';')[0].toLowerCase();
          if (!audioTypes.has(mime)) { error(res, 415, 'Tipo de áudio não permitido.'); req.resume(); return true; }
          if (Number(req.headers['content-length']) > MAX_AUDIO) { error(res, 413, 'Música maior que 25 MB.'); req.resume(); return true; }
          let name = 'Música';
          try { name = decodeURIComponent(req.headers['x-jam-name'] || name).slice(0, 90); } catch {}
          room.uploading = true; notify(room);
          let size = 0;
          try {
            const chunks = [];
            for await (const chunk of req) {
              size += chunk.length; pendingBytes += chunk.length;
              if (size > MAX_AUDIO) { error(res, 413, 'Música maior que 25 MB.'); return true; }
              if (audioBytes + pendingBytes > MAX_TOTAL) { error(res, 507, 'Servidor com limite de músicas atingido.'); return true; }
              chunks.push(chunk);
            }
            if (!size) { error(res, 400, 'Arquivo vazio.'); return true; }
            pendingBytes -= size;
            const bytes = Buffer.concat(chunks); size = 0;
            const chartId=String(req.headers['x-jam-chart']||'');if(chartId&&!/^[a-f0-9]{32}$/.test(chartId))throw Error('Identificador de partitura inválido.');
            json(res, { song: add(room, c, { bytes, mime, name,...(chartId?{chartId}:{}) }) });
          } finally { pendingBytes -= size; room.uploading = false; notify(room); }
          return true;
        }
      }
      error(res, 405, 'Método inválido.'); req.resume();
    } catch (e) { error(res, 400, e.message || 'Não foi possível adicionar a música.'); }
    return true;
  }
  return { handle, snapshot, select,
    releaseRoom(room) { room.abortController?.abort(); audioBytes -= (room.playlist || []).reduce((sum, s) => sum + s.bytes.length, 0); },
    stats: () => ({ audioBytes, pendingBytes, imports, searches }) };
};
