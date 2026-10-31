import {unzipSync} from 'fflate';
import {parseMidi} from 'midi-file';
import {SngStream} from 'parse-sng';
const DIFFS=['facil','medio','dificil','expert'],MAX=100*1024*1024;
export function ini(text=''){
  const result={};let section='song';for(const line of text.replace(/^\uFEFF/,'').split(/\r?\n/)){
    const s=line.match(/^\s*\[([^\]]+)\]/);if(s){section=s[1].toLowerCase();continue;}
    const m=line.match(/^\s*([\w]+)\s*=\s*(.*?)\s*$/);if(m&&section==='song')result[m[1].toLowerCase()]=m[2].replace(/^"(.*)"$/,'$1');
  }return result;
}
function clock(tempos,resolution){
  if(!Number.isInteger(resolution)||resolution<1||resolution>32767)throw Error('Resolução da partitura inválida.');
  const points=[{tick:0,us:500000},...tempos].sort((a,b)=>a.tick-b.tick);let t=0,previous=points[0];
  for(const p of points){if(!Number.isFinite(p.us)||p.us<=0||p.tick<0)throw Error('Andamento inválido.');t+=(p.tick-previous.tick)*previous.us/(resolution*1e6);p.seconds=t;previous=p;}
  return tick=>{let lo=0,hi=points.length;while(lo+1<hi){const mid=(lo+hi)>>1;if(points[mid].tick<=tick)lo=mid;else hi=mid;}const p=points[lo];return p.seconds+(tick-p.tick)*p.us/(resolution*1e6);};
}
function output(metadata,duration){return{version:1,source:'chart',audioMode:'mix',duration,title:metadata.name||'Partitura',artist:metadata.artist||'',charter:metadata.charter||'',instruments:[],charts:{},warnings:[]};}
function add(out,instrument,diff,t,dur,lane){
  if(!Number.isFinite(t)||!Number.isFinite(dur)||dur<0||t>=out.duration||(t<0&&t+dur<=0))return;
  if(t<0){dur+=t;t=0;}dur=Math.max(0,Math.min(dur,out.duration-t));
  const tracks=out.charts[instrument]||={};const chart=tracks[diff]||={laneCount:5,notes:[]};chart.notes.push({t:+t.toFixed(6),dur:+dur.toFixed(6),lane});
}
function finish(out){let count=0;for(const tracks of Object.values(out.charts))for(const c of Object.values(tracks)){
  c.notes.sort((a,b)=>a.t-b.t||a.lane-b.lane);const notes=[];for(const n of c.notes){const prev=notes.at(-1);if(prev&&prev.t===n.t&&prev.lane===n.lane)prev.dur=Math.max(prev.dur,n.dur);else notes.push(n);}c.notes=notes;count+=notes.length;
  if(count>50000)throw Error('Partitura maior que 50 mil notas.');
  }out.instruments=Object.keys(out.charts);if(!out.instruments.length)throw Error('Nenhuma pista de guitarra, baixo, bateria, teclado ou vocal compatível.');return out;
}
export function fromChart(text,settings,duration){
  const sections=[...text.matchAll(/\[([^\]\r\n]+)\]\s*\{([\s\S]*?)\}/g)],song=ini(sections.find(s=>s[1]==='Song')?.[2]);const meta={...song,...settings};
  const out=output(meta,duration),resolution=Number(song.resolution||192),tempo=[];
  for(const line of (sections.find(s=>s[1]==='SyncTrack')?.[2]||'').split(/\r?\n/)){const m=line.match(/^\s*(\d+)\s*=\s*B\s+(\d+)/);if(m)tempo.push({tick:+m[1],us:60000000000/+m[2]});}
  const time=clock(tempo,resolution),offset=Number(settings.chart_offset??song.offset??0)+Number(settings.delay||0)/1000;
  if(!Number.isFinite(offset)||Math.abs(offset)>60)throw Error('Deslocamento da partitura inválido.');
  for(const section of sections){const match=section[1].match(/^(Easy|Medium|Hard|Expert)(Single|DoubleBass|Drums|Keyboard)$/);if(!match)continue;
    const instrument={Single:'guitarra',DoubleBass:'baixo',Drums:'bateria',Keyboard:'teclado'}[match[2]],diff=DIFFS[['Easy','Medium','Hard','Expert'].indexOf(match[1])];
    for(const line of section[2].split(/\r?\n/)){const m=line.match(/^\s*(\d+)\s*=\s*N\s+(\d+)\s+(\d+)/);if(!m)continue;const tick=+m[1],note=+m[2],length=+m[3];let lane=note;
      if(instrument==='bateria'){if(note>5)continue;if(note===5){lane=4;if(!out.warnings.length)out.warnings.push('Bateria com seis posições adaptada para cinco teclas.');}}
      else{if(note===7){lane=0;if(!out.warnings.includes('Notas abertas usam a primeira tecla.'))out.warnings.push('Notas abertas usam a primeira tecla.');}else if(note>4)continue;}
      add(out,instrument,diff,time(tick)+offset,time(tick+length)-time(tick),lane);
    }
  }return finish(out);
}
export function fromMidi(bytes,settings,duration){
  const midi=parseMidi(bytes),resolution=midi.header.ticksPerBeat;if(!resolution)throw Error('MIDI SMPTE não suportado; use um MIDI musical com PPQ.');
  const tracks=midi.tracks.map(events=>{let tick=0;return events.map(e=>({...e,tick:tick+=e.deltaTime}));});
  const tempos=tracks.flat().filter(e=>e.type==='setTempo').map(e=>({tick:e.tick,us:e.microsecondsPerBeat}));const time=clock(tempos,resolution),out=output(settings,duration),offset=Number(settings.delay||0)/1000;
  if(!Number.isFinite(offset)||Math.abs(offset)>60)throw Error('Deslocamento MIDI inválido.');
  for(const track of tracks){const name=track.find(e=>e.type==='trackName')?.text?.toUpperCase().trim(),instrument={'PART GUITAR':'guitarra','T1 GEMS':'guitarra','PART BASS':'baixo','PART DRUMS':'bateria','PART KEYS':'teclado','PART VOCALS':'vocal'}[name];if(!instrument)continue;const active=new Map();
    for(const e of track){if(!['noteOn','noteOff'].includes(e.type))continue;const id=e.channel+':'+e.noteNumber;
      if(e.type==='noteOn'&&e.velocity>0){if(!active.has(id))active.set(id,[]);active.get(id).push(e);continue;}
      const start=active.get(id)?.shift();if(!start)continue;const n=e.noteNumber,t=time(start.tick)+offset,dur=time(e.tick)-time(start.tick);
      if(instrument==='vocal'){if(n>=36&&n<=84)for(const diff of DIFFS)add(out,instrument,diff,t,dur,Math.min(4,Math.floor((n-36)*5/49)));}
      else for(let d=0;d<4;d++){const base=60+d*12;if(n>=base&&n<=base+4)add(out,instrument,DIFFS[d],t,dur,n-base);else if(instrument==='bateria'&&n===base+5){add(out,instrument,DIFFS[d],t,dur,4);if(!out.warnings.includes('Bateria com seis posições adaptada para cinco teclas.'))out.warnings.push('Bateria com seis posições adaptada para cinco teclas.');}else if(instrument!=='bateria'&&n===base-1){add(out,instrument,DIFFS[d],t,dur,0);if(!out.warnings.includes('Notas abertas usam a primeira tecla.'))out.warnings.push('Notas abertas usam a primeira tecla.');}}
    }
  }return finish(out);
}
export async function filesFrom(input){
  if(input.length===1&&/\.sng$/i.test(input[0].name))return filesFromSng(input[0]);
  let files=[...input];if(files.length===1&&/\.zip$/i.test(files[0].name)){
    if(files[0].size>MAX)throw Error('ZIP maior que 100 MB.');let total=0,count=0;
    const data=unzipSync(new Uint8Array(await files[0].arrayBuffer()),{filter:file=>{
      if(!/\.(chart|mid|ini|mp3|ogg|opus|wav|m4a|flac|webm)$/i.test(file.name))return false;
      total+=file.originalSize;if(file.originalSize>25*1024*1024||total>MAX||++count>128)throw Error('Pacote ultrapassa os limites de tamanho.');return true;
    }});files=Object.entries(data).map(([name,bytes])=>new File([bytes],name));
  }
  if(files.length>128||files.reduce((s,f)=>s+f.size,0)>MAX)throw Error('Pacote maior que 100 MB ou com arquivos demais.');return files;
}
export async function filesFromSng(file){
  if(file.size>MAX)throw Error('Pacote SNG maior que 100 MB.');
  return new Promise((resolve,reject)=>{
    const parser=new SngStream(file.stream(),{generateSongIni:true}),files=[];let failed=false,total=0;
    const fail=error=>{failed=true;reject(error instanceof Error?error:Error(String(error)));};
    parser.on('header',header=>{try{
      if(header.fileMeta.length>128)throw Error('Pacote com arquivos demais.');
      for(const item of header.fileMeta){if(item.contentsLen>BigInt(MAX)||item.contentsIndex+item.contentsLen>BigInt(file.size))throw Error('Índice do pacote SNG inválido.');if(/\.(chart|mid|ini|mp3|ogg|opus|wav|m4a|flac|webm)$/i.test(item.filename)&&item.contentsLen>25n*1024n*1024n)throw Error('Arquivo do pacote ultrapassa 25 MB.');}
    }catch(e){fail(e);}});
    parser.on('file',async(name,stream,next)=>{const reader=stream.getReader();try{
      if(failed){await reader.cancel();return;}
      const keep=/\.(chart|mid|ini|mp3|ogg|opus|wav|m4a|flac|webm)$/i.test(name),chunks=[];let size=0;
      while(true){const {done,value}=await reader.read();if(done)break;if(keep){size+=value.length;total+=value.length;if(size>25*1024*1024||total>MAX)throw Error('Pacote ultrapassa os limites de tamanho.');chunks.push(value);}}
      if(keep)files.push(new File(chunks,name));if(next)next();else resolve(files);
    }catch(e){await reader.cancel().catch(()=>{});fail(e);}});
    parser.on('error',fail);parser.start();
  });
}
function wav(buffer){const x=buffer.getChannelData(0),data=new ArrayBuffer(44+x.length),v=new DataView(data),str=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};str(0,'RIFF');v.setUint32(4,36+x.length,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,22050,true);v.setUint32(28,22050,true);v.setUint16(32,1,true);v.setUint16(34,8,true);str(36,'data');v.setUint32(40,x.length,true);for(let i=0;i<x.length;i++)v.setUint8(44+i,Math.max(0,Math.min(255,Math.round(x[i]*128+128))));return data;}
export async function prepare(input,getContext){
  const files=await filesFrom(input),filePath=f=>(f.webkitRelativePath||f.name).replaceAll('\\','/'),base=f=>filePath(f).split('/').at(-1).toLowerCase();
  const charts=files.filter(f=>/\.(chart|mid)$/i.test(f.name));if(charts.length!==1)throw Error('Escolha um pacote com uma única partitura notes.chart ou notes.mid.');
  const chart=charts[0];if(chart.size>4*1024*1024)throw Error('Partitura maior que 4 MB.');const folder=filePath(chart).replace(/[^/]+$/,'');const group=files.filter(f=>filePath(f).replace(/[^/]+$/,'')===folder);
  const settings=ini(await group.find(f=>base(f)==='song.ini')?.text());const audio=group.filter(f=>/\.(mp3|ogg|opus|wav|m4a|flac|webm)$/i.test(f.name)&&!/^preview\./i.test(base(f)));
  if(!audio.length)throw Error('Inclua o áudio correspondente à partitura no mesmo pacote.');
  let selected=audio.length===1?audio:audio.filter(f=>/^(song|guitar|bass|rhythm|keys|vocals|drums(?:_[1-4])?|crowd)\./i.test(base(f)));
  if(selected.some(f=>/^drums_[1-4]\./i.test(base(f))))selected=selected.filter(f=>!/^drums\./i.test(base(f)));
  if(!selected.length)throw Error('Os áudios do pacote precisam usar nomes como song.ogg ou guitar.ogg.');
  if(selected.some(f=>f.size>25*1024*1024))throw Error('Um áudio do pacote ultrapassa 25 MB.');
  let duration=0,mix=new Float32Array(0);
  for(const f of selected){
    const buffer=await getContext().decodeAudioData(await f.arrayBuffer());duration=Math.max(duration,buffer.duration);if(duration>900)throw Error('O áudio deve ter até 15 minutos.');
    if(selected.length>1){
      const offline=new OfflineAudioContext(1,Math.ceil(buffer.duration*22050),22050),source=offline.createBufferSource();source.buffer=buffer;source.connect(offline.destination);source.start();
      const samples=(await offline.startRendering()).getChannelData(0);
      if(mix.length<samples.length){const larger=new Float32Array(samples.length);larger.set(mix);mix=larger;}
      for(let i=0;i<samples.length;i++)mix[i]+=samples[i];
      source.buffer=null;source.disconnect?.();
    }
  }
  const manifest=/\.mid$/i.test(chart.name)?fromMidi(new Uint8Array(await chart.arrayBuffer()),settings,duration):fromChart(await chart.text(),settings,duration);
  let file=selected[0];if(selected.length>1){file=new File([wav({getChannelData:()=>mix})],'partitura-mix.wav',{type:'audio/wav'});manifest.warnings.push('Áudios separados reunidos em uma mistura mono de 8 bits para compartilhar a sala.');}
  const ext=base(file).split('.').at(-1),mime={mp3:'audio/mpeg',ogg:'audio/ogg',opus:'audio/ogg',wav:'audio/wav',m4a:'audio/mp4',flac:'audio/flac',webm:'audio/webm'}[ext];file=new File([file],(manifest.artist?manifest.artist+' - ':'')+manifest.title+'.'+ext,{type:mime});
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(manifest)));const chartId=[...new Uint8Array(hash)].map(n=>n.toString(16).padStart(2,'0')).join('').slice(0,32);
  return{file,manifest,chartId};
}
if(typeof window!=='undefined')window.JamChartImport={prepare};
