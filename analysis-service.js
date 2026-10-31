'use strict';
// Render só coordena a análise e transmite arquivos. Os modelos rodam no navegador.
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { pipeline } = require('node:stream/promises');
const { Transform } = require('node:stream');
const { INSTRUMENTS } = require('./public/chart-engine');
const MAX_STEM = 40 * 1024 * 1024, MAX_DISK = 400 * 1024 * 1024;
const MAX_CHART_TOTAL = 16 * 1024 * 1024;

module.exports = function createAnalysisService({ rooms, broadcast, announce }) {
  let diskBytes = 0, chartBytes = 0;
  const state = job => job ? { status: job.status, progress: job.progress, message: job.message, ...(job.error?{error:job.error}:{}), instruments: job.manifest?.instruments || [], owner: job.owner, engine: job.manifest?.engine,source:job.manifest?.source,difficulties:job.manifest?.source==='chart'?Object.fromEntries(job.manifest.instruments.map(i=>[i,Object.keys(job.manifest.charts[i])])):undefined } : { status:'idle', progress:0, instruments:[] };
  const find = (room,key) => room.analyses?.get(key);
  function queued(room) { return {status:'queued',progress:0,message:'Aguardando a vez na fila.',order:room.analysisSeq=(room.analysisSeq||0)+1,bytes:0,files:{},writing:new Set()}; }
  function ensure(room) {
    room.analyses ||= new Map();
    for(const song of room.playlist||[])if(!find(room,song.meta.key))room.analyses.set(song.meta.key,{...queued(room),...(song.meta.chartPending?{status:'importing',owner:song.meta.by,message:'Recebendo a partitura pronta…',updated:Date.now()}:{})});
  }
  function snapshot(room) {
    ensure(room);
    return {revision:room.analysisRevision||0,jobs:[...room.analyses].sort((a,b)=>a[1].order-b[1].order).map(([key,job])=>({key,...state(job)}))};
  }
  function notifyQueue(room) { room.analysisRevision=(room.analysisRevision||0)+1;broadcast(room,{type:'analysisQueue',queue:snapshot(room)}); }
  function notify(room,key,job) { broadcast(room,{type:'analysis',key,...state(job)});notifyQueue(room); }
  function requeue(room,key,job) {
    const replacement={...queued(room),order:job.order};
    room.analyses.set(key,replacement);dispose(job);notify(room,key,replacement);
  }
  function recover(room) {
    for(const[key,job]of room.analyses)if(job.status==='running'&&Date.now()-job.updated>90000)requeue(room,key,job);
    else if(job.status==='importing'&&Date.now()-job.updated>90000){job.status='error';job.message='Importação incompleta. Envie o pacote novamente.';notify(room,key,job);}
  }
  async function dispose(job) {
    if (!job || job.cleaned) return;
    job.disposed = true;
    if (job.writing.size) return;
    job.cleaned = true;
    diskBytes -= job.bytes;
    chartBytes -= job.chartBytes || 0;
    job.chartBytes = 0; job.manifest = null;
    job.bytes = 0;
    if(job.dir)await fsp.rm(job.dir,{recursive:true,force:true}).catch(()=>{});
  }
  async function jsonBody(req) {
    let size=0; const chunks=[];
    for await(const b of req){size+=b.length;if(size>4*1024*1024)throw Error('Análise maior que o limite.');chunks.push(b);}
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }
  function reply(res,status,data) { if(res.destroyed||res.writableEnded)return;res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data)); }
  function validate(m) {
    if (!m || m.version!==1 || !Number.isFinite(m.duration) || m.duration<=0 || m.duration>901 || !Array.isArray(m.instruments) || !m.instruments.length || m.instruments.some(i=>!INSTRUMENTS.includes(i))) throw Error('Resultado da análise inválido.');
    const result={version:1,engine:'Demucs 6s econômico + Basic Pitch',duration:m.duration,instruments:[...new Set(m.instruments)],detection:{},events:{},audioFormat:m.audioFormat==='pcm8-mono-22050'?'pcm8-mono-22050':'pcm16-mono-22050'};
    if(Number.isFinite(m.timing?.seconds))result.timing={seconds:Math.max(0,Math.min(7200,m.timing.seconds))};
    let count=0;
    for(const i of INSTRUMENTS) {
      const events=m.events?.[i]||[];
      count+=events.length;if(!Array.isArray(events)||count>50000)throw Error('Quantidade de notas inválida.');
      if(events.some(e=>!e||!Number.isFinite(e.t)||e.t<0||e.t>=m.duration||!Number.isFinite(e.pitch)||e.pitch<0||e.pitch>127||!Number.isFinite(e.dur)||e.dur<0||e.dur>m.duration||!Number.isFinite(e.s)||e.s<0||e.s>1))throw Error('Notas inválidas.');
      result.events[i]=events.map(e=>({t:e.t,pitch:e.pitch,dur:e.dur,s:e.s,...(i==='bateria'?{lane:Math.max(0,Math.min(3,e.lane|0))}:{})}));
      const d=m.detection?.[i]; result.detection[i]={detected:result.instruments.includes(i),ratio:Math.max(0,Math.min(10,Number(d?.ratio)||0)),eventCount:events.length};
      if(result.instruments.includes(i)&&!events.length)throw Error('Um instrumento selecionado não tem notas.');
    }
    return result;
  }
  async function handle(req,res,url) {
    if(!url.pathname.startsWith('/api/analysis'))return false;
    const room=rooms.get(url.searchParams.get('room')||'');
    const c=room&&[...room.members].find(c=>!c.closed&&c.uploadToken===req.headers['x-jam-token']);
    if(!c){reply(res,403,{error:'Entre na sala para acessar a análise.'});req.resume();return true;}
    ensure(room);recover(room);
    if(req.method==='GET'&&url.pathname==='/api/analysis/queue'){reply(res,200,snapshot(room));return true;}
    const key=url.searchParams.get('key');
    if(!room.playlist?.some(s=>s.meta.key===key)){reply(res,404,{error:'Música não encontrada nesta sala.'});req.resume();return true;}
    room.analyses ||= new Map();
    let job=find(room,key);
    try {
      if(req.method==='GET'&&url.pathname==='/api/analysis'){reply(res,200,state(job));return true;}
      if(req.method==='POST'&&url.pathname==='/api/analysis/import'){
        const song=room.playlist.find(s=>s.meta.key===key);
        if(!song.meta.chartPending||song.meta.by!==c.id||!['importing','error'].includes(job.status)){reply(res,409,{error:'Envie o áudio pelo importador de partituras antes de concluir.'});req.resume();return true;}
        const manifest=require('./imported-chart')(await jsonBody(req));
        if(find(room,key)!==job||!['importing','error'].includes(job.status)||rooms.get(room.code)!==room||c.closed)throw Error('A importação foi interrompida.');
        const size=Buffer.byteLength(JSON.stringify(manifest));if(chartBytes+size>MAX_CHART_TOTAL)throw Error('Limite de partituras do servidor atingido.');
        const order=job.order;job.status='committing';await dispose(job);
        if(find(room,key)!==job||rooms.get(room.code)!==room||c.closed)throw Error('A importação foi interrompida.');
        if(chartBytes+size>MAX_CHART_TOTAL)throw Error('Limite de partituras do servidor atingido.');
        job={...queued(room),order,status:'ready',progress:1,message:'Partitura pronta importada.',manifest,chartBytes:size};chartBytes+=size;
        room.analyses.set(key,job);song.meta.chartPending=false;notify(room,key,job);reply(res,200,state(job));return true;
      }
      if(req.method==='POST'&&url.pathname==='/api/analysis/prioritize'){
        if(job.status==='importing'){reply(res,409,{error:'O pacote de partitura ainda está sendo enviado.'});return true;}
        if(job.status==='ready'){reply(res,200,snapshot(room));return true;}
        if(job.status!=='running'){
          const order=Math.min(0,...[...room.analyses.values()].map(j=>j.order))-1;
          if(job.status!=='queued'){dispose(job);job=queued(room);room.analyses.set(key,job);}
          job.order=order;
          for(const[k,j]of room.analyses)if(k!==key&&j.status==='running')requeue(room,k,j);
          notify(room,key,job);
        }
        reply(res,200,snapshot(room));req.resume();return true;
      }
      if(req.method==='POST'&&url.pathname==='/api/analysis/claim'){
        if(job.status==='importing'){reply(res,409,{error:'Esta música está recebendo uma partitura pronta.'});return true;}
        if(job?.status==='ready'){reply(res,200,{...state(job)});return true;}
        if([...room.analyses.values()].some(j=>j.status==='running')){reply(res,409,{error:'A sala já está preparando uma música. Aguarde ou altere a prioridade.'});return true;}
        const head=[...room.analyses].filter(([,j])=>j.status==='queued').sort((a,b)=>a[1].order-b[1].order)[0];
        if((head&&head[0]!==key)||job.status==='error'){reply(res,409,{error:'Respeite a fila ou use Analisar agora para mudar a prioridade.'});return true;}
        const previous=job;
        // Reserva síncrona: duas requisições simultâneas nunca abrem dois trabalhos.
        job={...queued(room),order:previous.order,status:'running',progress:0,message:'Preparando a IA no navegador…',owner:c.id,lease:crypto.randomBytes(24).toString('hex'),updated:Date.now()};
        room.analyses.set(key,job);
        await dispose(previous);
        job.dir=await fsp.mkdtemp(path.join(os.tmpdir(),'guitaband-analysis-'));
        if(job.disposed||find(room,key)!==job){await fsp.rm(job.dir,{recursive:true,force:true});reply(res,409,{error:'A prioridade da fila mudou.'});return true;}
        room.analyses.set(key,job);notify(room,key,job);reply(res,200,{...state(job),lease:job.lease,queueRevision:room.analysisRevision});return true;
      }
      if(req.method==='GET'&&url.pathname==='/api/analysis/manifest'){
        if(job?.status!=='ready')throw Error('A análise ainda não está pronta.');
        reply(res,200,job.manifest);return true;
      }
      if(req.method==='GET'&&url.pathname==='/api/analysis/stem'){
        const instrument=url.searchParams.get('instrument'), file=job?.files[instrument];
        if(job?.status!=='ready'||!file)throw Error('Faixa indisponível.');
        res.writeHead(200,{'Content-Type':'audio/wav','Content-Length':file.size,'Cache-Control':'no-store'});
        await pipeline(fs.createReadStream(file.path),res);return true;
      }
      if(!job||job.disposed||job.status!=='running'||job.owner!==c.id||job.lease!==req.headers['x-analysis-lease']){reply(res,403,{error:'Esta análise pertence a outro participante ou já terminou.'});req.resume();return true;}
      job.updated=Date.now();
      if(req.method==='POST'&&url.pathname==='/api/analysis/progress'){
        const body=await jsonBody(req);if(job.disposed)throw Error('A prioridade da fila mudou.');job.progress=Math.max(0,Math.min(.99,Number(body.progress)||0));job.message=String(body.message||'Analisando…').slice(0,140);
        notify(room,key,job);reply(res,200,{ok:true});return true;
      }
      if(req.method==='PUT'&&url.pathname==='/api/analysis/stem'){
        const instrument=url.searchParams.get('instrument');
        if(!INSTRUMENTS.includes(instrument)||job.writing.has(instrument)||job.files[instrument])throw Error('Faixa inválida ou já enviada.');
        if(Number(req.headers['content-length'])>MAX_STEM)throw Error('Faixa maior que 40 MB.');
        job.writing.add(instrument);
        const file=path.join(job.dir,instrument+'.wav');let size=0,header=Buffer.alloc(0);
        try {
          const limiter=new Transform({transform(chunk,_,callback){size+=chunk.length;job.bytes+=chunk.length;diskBytes+=chunk.length;if(header.length<44)header=Buffer.concat([header,chunk.subarray(0,44-header.length)]);if(size>MAX_STEM||diskBytes>MAX_DISK||job.disposed)callback(Error('Limite temporário de faixas atingido.'));else callback(null,chunk);}});
          await pipeline(req,limiter,fs.createWriteStream(file,{flags:'wx'}));
          if(size<44||header.toString('ascii',0,4)!=='RIFF'||header.toString('ascii',8,12)!=='WAVE'||header.readUInt16LE(20)!==1||header.readUInt16LE(22)!==1||header.readUInt32LE(24)!==22050||![8,16].includes(header.readUInt16LE(34))||header.readUInt32LE(40)!==size-44)throw Error('A faixa precisa ser WAV mono de 22.050 Hz.');
          job.files[instrument]={path:file,size,bits:header.readUInt16LE(34)};reply(res,200,{ok:true});
        } catch(e){job.bytes-=size;diskBytes-=size;await fsp.rm(file,{force:true}).catch(()=>{});throw e;}
        finally{job.writing.delete(instrument);if(job.disposed)await dispose(job);}
        return true;
      }
      if(req.method==='POST'&&url.pathname==='/api/analysis/complete'){
        const manifest=validate(await jsonBody(req));
        if(job.disposed||c.closed||rooms.get(room.code)!==room)throw Error('A preparação foi interrompida.');
        if(manifest.instruments.some(i=>!job.files[i])||job.writing.size)throw Error('Ainda faltam faixas para compartilhar.');
        for(const i of manifest.instruments)if(Math.abs((job.files[i].size-44)/(22050*(job.files[i].bits/8))-manifest.duration)>.15)throw Error('A faixa e as notas têm durações diferentes.');
        const size=Buffer.byteLength(JSON.stringify(manifest));
        if(chartBytes+size>MAX_CHART_TOTAL)throw Error('O servidor atingiu o limite de análises. Remova músicas de outras salas ou tente mais tarde.');
        chartBytes+=size;job.chartBytes=size;
        job.manifest=manifest;job.status='ready';job.progress=1;job.message='Instrumentos e notas prontos.';job.lease=null;
        if(room.song?.meta.key===key)for(const member of room.members)if(!manifest.instruments.includes(member.presence.i))member.presence.i=manifest.instruments[0];
        notify(room,key,job);announce(room);reply(res,200,state(job));return true;
      }
      if(req.method==='POST'&&url.pathname==='/api/analysis/cancel'){
        job.status='error';job.message='Análise interrompida. Você pode tentar novamente.';notify(room,key,job);reply(res,200,{ok:true});await dispose(job);return true;
      }
      if(req.method==='POST'&&url.pathname==='/api/analysis/fail'){
        const body=await jsonBody(req);
        if(job.disposed||find(room,key)!==job)throw Error('A prioridade da fila mudou.');
        job.error={message:String(body.message||'Falha na preparação.').slice(0,500),details:String(body.details||'').slice(0,1500),stage:String(body.stage||job.message||'').slice(0,140),at:Date.now()};
        job.status='error';job.message=job.error.message;job.lease=null;
        notify(room,key,job);reply(res,200,{ok:true});await dispose(job);return true;
      }
      reply(res,405,{error:'Método inválido.'});req.resume();
    } catch(e){
      if(url.pathname==='/api/analysis/import'&&job?.status==='committing'){job.status='error';job.message=e.message;notify(room,key,job);}
      if(url.pathname==='/api/analysis/claim'&&job?.status==='running'&&job.owner===c.id&&!job.disposed){job.status='error';job.message=e.message;dispose(job);notify(room,key,job);}
      reply(res,400,{error:e.message||'Falha na análise.'});
    }
    return true;
  }
  return {handle,snapshot,enqueue(room){ensure(room);notifyQueue(room);},state:(room,key)=>state(find(room,key)),
    peerLeft(room,peer){
      for(const[key,job]of room.analyses||[])if(job.owner===peer&&job.status==='running'){
        requeue(room,key,job);
      }
    },
    remove(room,key){const job=find(room,key);room.analyses?.delete(key);notifyQueue(room);return dispose(job);},
    release(room){const jobs=[...(room.analyses?.values()||[])];room.analyses?.clear();return Promise.all(jobs.map(dispose));},
    validate,stats:()=>({diskBytes,chartBytes})};
};
