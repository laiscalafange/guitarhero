'use strict';
// Somente metadados: não baixa áudio nem executa IA para pesquisar.
const instruments={guitarra:'guitar',baixo:'bass',bateria:'drums',teclado:'keys'};
const difficulties=['easy','medium','hard','expert'];
const clean=q=>String(q||'').replace(/\.(mp3|m4a|wav|ogg|flac|webm)$/i,'').replace(/official\s*(music\s*)?(video|audio)|lyrics?/ig,' ').replace(/\(\s*\)|\[\s*\]/g,' ').replace(/\s+/g,' ').trim().slice(0,160);
const normalize=q=>clean(q).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const field=value=>({value,exact:false,exclude:false});
function similarity(a,b){
  const left=normalize(a),right=normalize(b);if(!left||!right)return 0;
  const row=Array.from({length:right.length+1},(_,i)=>i);
  for(let i=1;i<=left.length;i++){let diagonal=row[0];row[0]=i;for(let j=1;j<=right.length;j++){const previous=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,diagonal+(left[i-1]===right[j-1]?0:1));diagonal=previous;}}
  return 1-row[right.length]/Math.max(left.length,right.length);
}
function options(raw={}){
  const instrument=raw.instrument||'',difficulty=raw.difficulty||'',sort=raw.sort||'relevance';
  if(instrument&&!instruments[instrument])throw Error('Instrumento de pesquisa inválido.');
  if(difficulty&&!difficulties.includes(difficulty))throw Error('Dificuldade de pesquisa inválida.');
  if(!['relevance','name','artist','length'].includes(sort))throw Error('Ordenação inválida.');
  const page=Number(raw.page==null||raw.page===''?1:raw.page);if(!Number.isInteger(page)||page<1||page>10000)throw Error('Página de pesquisa inválida.');
  return{instrument,difficulty,sort,page,artist:clean(raw.artist),title:clean(raw.title)};
}
function request(query,opts){
  const sort=opts.sort==='relevance'?null:{type:opts.sort,direction:'asc'};
  const body={per_page:25,page:opts.page,instrument:instruments[opts.instrument]||null,difficulty:opts.difficulty||null,drumType:null,drumsReviewed:false,sort,source:'website'};
  if(!opts.artist&&!opts.title)return{endpoint:'search',body:{...body,search:query}};
  for(const key of ['name','artist','album','genre','year','charter'])body[key]=field(key==='name'?opts.title:key==='artist'?opts.artist:'');
  for(const key of ['minLength','maxLength','minIntensity','maxIntensity','minAverageNPS','maxAverageNPS','minMaxNPS','maxMaxNPS','modifiedAfter','hash','hasSoloSections','hasForcedNotes','hasOpenNotes','hasTapNotes','hasLyrics','hasVocals','hasRollLanes','has2xKick','hasIssues','hasVideoBackground','modchart'])body[key]=null;
  return{endpoint:'search/advanced',body};
}
function match(query,song,opts){
  const name=normalize(song.name),artist=normalize(song.artist),q=normalize(query);
  if(opts.artist||opts.title){
    const artistOK=!opts.artist||artist===normalize(opts.artist),titleOK=!opts.title||name===normalize(opts.title);
    return artistOK&&titleOK?(opts.title?'probable':'artist'):'similar';
  }
  if(q===artist)return'artist';
  if(q===name||q===normalize(song.artist+' '+song.name)||q===normalize(song.name+' '+song.artist))return'probable';
  return'similar';
}
function result(raw,query,opts){
  const validId=id=>typeof id==='string'&&/^[\w-]{8,160}$/.test(id);
  const tracks=Array.isArray(raw.notesData?.noteCounts)?raw.notesData.noteCounts:[];
  const availability={};
  for(const[id,source]of Object.entries(instruments)){
    const ds=difficulties.filter(d=>tracks.some(t=>t.instrument===source&&t.difficulty===d&&t.count>0));
    if(ds.length)availability[id]=ds;
  }
  const known=Object.keys(availability),metadata=[['guitarra','diff_guitar'],['baixo','diff_bass'],['bateria','diff_drums'],['teclado','diff_keys'],['vocal','diff_vocals']].filter(([,k])=>Number.isFinite(raw[k])&&raw[k]>=0).map(([id])=>id);
  const available=tracks.length?known:metadata;
  if(raw.notesData?.hasVocals&&!available.includes('vocal'))available.push('vocal');
  const song={name:String(raw.chartName||raw.name||'Música').slice(0,160),artist:String(raw.artist||'').slice(0,100),album:String(raw.chartAlbum||raw.album||'').slice(0,160),year:String(raw.chartYear||raw.year||'').slice(0,20),charter:String(raw.charter||'').slice(0,100),duration:Number(raw.song_length)/1000||null,downloadId:/^[a-f0-9]{32}$/.test(raw.md5||'')?raw.md5:null,hasVideo:!!raw.hasVideoBackground,instruments:available,availability,drumsReviewed:!!raw.drumsReviewed,group:normalize(raw.artist)+'|'+normalize(raw.name),url:validId(raw.driveFileId)?'https://drive.google.com/file/d/'+raw.driveFileId+'/view':validId(raw.parentFolderId)?'https://drive.google.com/drive/folders/'+raw.parentFolderId:'https://www.enchor.us/'};
  song.match=match(query,song,opts);song.relevance=Math.max(similarity(query,song.name),similarity(query,song.artist),similarity(query,song.artist+' '+song.name),similarity(query,song.name+' '+song.artist));return song;
}
function createSearch({fetchImpl=(...args)=>fetch(...args),now=()=>Date.now()}={}){
  const cache=new Map(),pending=new Map();
  return async function search(query,rawOptions={}){
    const q=clean(query),opts=options(rawOptions);if(q.length<2)throw Error('Digite o nome da música ou do artista.');
    const key=JSON.stringify([normalize(q),opts]);
    if(cache.get(key)?.until>now())return cache.get(key).value;
    if(pending.has(key))return pending.get(key);
    if(pending.size>=2)return{status:'unavailable',query:q,results:[],message:'O catálogo está ocupado. Tente novamente.'};
    const task=(async()=>{try{
      const req=request(q,opts),response=await fetchImpl('https://api.enchor.us/'+req.endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(req.body),signal:AbortSignal.timeout(10000)});
      if(!response.ok)throw Error('Catálogo indisponível.');
      const text=await response.text();if(text.length>2*1024*1024)throw Error('Resposta maior que o limite.');
      const data=JSON.parse(text);if(!Array.isArray(data.data)||!Number.isFinite(data.found)||data.found<0||data.data.length>250)throw Error('Resposta inválida.');
      if(opts.page===1&&data.found>0&&!data.data.length)throw Error('Resposta incompleta.');
      const results=data.data.map(s=>result(s,q,opts));
      if(opts.sort==='relevance')results.sort((a,b)=>({probable:0,artist:1,similar:2}[a.match]-{probable:0,artist:1,similar:2}[b.match])||b.relevance-a.relevance);
      const value={status:results.length?'found':'not_found',query:q,results,total:data.found,page:opts.page,pageSize:25,hasMore:data.data.length>0&&opts.page*25<data.found};
      if(cache.size>=64)cache.delete(cache.keys().next().value);
      cache.set(key,{until:now()+600000,value});return value;
    }catch{return{status:'unavailable',query:q,results:[],message:'Não foi possível consultar o catálogo agora. Isso não significa que a música não exista.'};}finally{pending.delete(key);}})();
    pending.set(key,task);return task;
  };
}
module.exports={clean,normalize,options,request,match,result,createSearch};
