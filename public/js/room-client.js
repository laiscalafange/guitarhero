/* Transporte multiplayer: WebSocket, upload/download, eventos e playlists. */
(function () {
'use strict';
async function connectRoom(code, onDisconnected) {
  return new Promise((resolve, reject) => {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(proto + '//' + location.host + '/ws?room=' + encodeURIComponent(code));
    let playlist = { songs: [], selectedKey: null }, myId = '', hostId = '', token = '', ready = false, roster = [], history = [], closed = false, selected = null;
    const listeners = {}, peerWatch = [];
    const room = {
      get id() { return myId; },
      get hostId() { return hostId; },
      peers: () => roster.map(p => ({ ...p, sameTab: p.peer === myId, isMe: p.peer === myId })),
      history: () => history,
      onPeers: fn => { peerWatch.push(fn); fn(); },
      on: (event, fn) => { (listeners[event] ||= []).push(fn); },
      emit: (event, data) => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'event', event, data })); return Promise.resolve(); },
      presence: data => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'presence', data })); return Promise.resolve(); },
      get currentSong() { return selected; },
      async upload(file,{chartId}={}) {
        const res = await fetch('/api/song?room=' + encodeURIComponent(code), {
          method: 'POST', headers: { 'X-Jam-Token': token, 'X-Jam-Name': encodeURIComponent(file.name), 'Content-Type': file.type || 'application/octet-stream',...(chartId?{'X-Jam-Chart':chartId}:{}) },
          body: file
        });
        if (!res.ok) throw Error(await res.text());
        return (await res.json()).song;
      },
      get playlist() { return playlist; },
      async downloadChartPackage(id,noVideo,onProgress){
        const res=await fetch('/api/charts/package?room='+encodeURIComponent(code)+'&id='+encodeURIComponent(id)+(noVideo?'&novideo=1':''),{headers:{'X-Jam-Token':token}});
        if(!res.ok)throw Error(await res.text());const total=Number(res.headers.get('content-length')),reader=res.body.getReader(),chunks=[];let size=0;
        try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>100*1024*1024){await reader.cancel();throw Error('Pacote maior que 100 MB.');}chunks.push(value);onProgress(size,total);}}finally{reader.releaseLock();}
        return new File(chunks,'partitura.sng',{type:'application/octet-stream'});
      },
      async request(route, { method = 'GET', key, query, body, lease } = {}) {
        const url = new URL(route, location.origin);
        url.searchParams.set('room', code);
        if (key) url.searchParams.set('key', key);
        if (query) url.searchParams.set('q', query);
        const res = await fetch(url, { method, headers: { 'X-Jam-Token': token, ...(body ? { 'Content-Type': 'application/json' } : {}), ...(lease ? {'X-Analysis-Lease':lease} : {}) }, body: body ? JSON.stringify(body) : undefined });
        if (!res.ok) { const text=await res.text(); let message=text;try{message=JSON.parse(text).error||text;}catch{}throw Error(message); }
        return res.json();
      },
      async uploadStem(key,instrument,body,lease) {
        const res=await fetch('/api/analysis/stem?room='+encodeURIComponent(code)+'&key='+encodeURIComponent(key)+'&instrument='+instrument,{method:'PUT',headers:{'X-Jam-Token':token,'X-Analysis-Lease':lease,'Content-Type':'audio/wav'},body});
        if(!res.ok)throw Error((await res.json()).error||'Falha ao compartilhar faixa.');
      },
      async downloadStem(key,instrument) {
        const res=await fetch('/api/analysis/stem?room='+encodeURIComponent(code)+'&key='+encodeURIComponent(key)+'&instrument='+instrument,{headers:{'X-Jam-Token':token}});
        if(!res.ok)throw Error('A faixa separada não está disponível. Prepare a música novamente.');
        return res.arrayBuffer();
      },
      async download(key) {
        const res = await fetch('/api/song?room=' + encodeURIComponent(code) + '&key=' + encodeURIComponent(key), { headers: { 'X-Jam-Token': token }, cache: 'no-store' });
        if (!res.ok) throw Error(await res.text());
        return res.arrayBuffer();
      }
    };
    const timeout = setTimeout(() => { if (!ready) { ws.close(); reject(new Error('O servidor não respondeu. Tente novamente.')); } }, 90000);
    ws.addEventListener('message', e => {
      let m; try { m = JSON.parse(e.data); } catch { return; }
      if (m.type === 'welcome') {
        myId = m.id;
        token = m.token;
        selected = m.song || null;
        playlist = m.playlist || playlist;
        history = Array.isArray(m.history) ? m.history : [];
        ready = true;
        clearTimeout(timeout);
        resolve(room);
      } else if (m.type === 'peers') {
        roster = Array.isArray(m.peers) ? m.peers : [];
        hostId = typeof m.hostId === 'string' ? m.hostId : '';
        peerWatch.forEach(fn => fn());
      } else if (m.type === 'history') {
        history = Array.isArray(m.rounds) ? m.rounds : [];
        (listeners.history || []).forEach(fn => fn(history));
      } else if (m.type === 'roundCancelled') {
        (listeners.roundCancelled || []).forEach(fn => fn(m.round));
      } else if (m.type === 'analysis') {
        (listeners.analysis || []).forEach(fn=>fn(m));
      } else if (m.type === 'analysisQueue') {
        (listeners.analysisQueue || []).forEach(fn=>fn(m.queue));
      } else if (m.type === 'playlist') {
        playlist = m.playlist;
        (listeners.playlist || []).forEach(fn => fn(playlist));
      } else if (m.type === 'song') {
        selected = m.song;
        (listeners.song || []).forEach(fn => fn(m.song));
      } else if (m.type === 'event' && typeof m.event === 'string') {
        const own = m.peer === myId;
        (listeners[m.event] || []).forEach(fn => fn({ peer: m.peer, sameTab: own, isMe: own, data: m.data }));
      }
    });
    ws.addEventListener('error', () => {
      if (!ready) { clearTimeout(timeout); reject(new Error('Não foi possível conectar à sala. Confira sua internet e tente novamente.')); }
    });
    ws.addEventListener('close', () => {
      if (closed) return;
      closed = true;
      (listeners.closed || []).forEach(fn=>fn());
      clearTimeout(timeout);
      if (!ready) reject(new Error('Sala cheia (máximo 8) ou servidor indisponível.'));
      else if (typeof onDisconnected === 'function') onDisconnected();
    });
  });
}
window.JamConnectRoom = connectRoom;
})();
