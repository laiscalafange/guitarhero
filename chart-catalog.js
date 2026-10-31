'use strict';
// Catálogo e download do CDN fixo. O servidor não aceita URLs arbitrárias.
const cache=new Map(),pending=new Map();
const clean=q=>String(q||'').replace(/\.(mp3|m4a|wav|ogg|flac|webm)$/i,'').replace(/\([^)]*\)|\[[^\]]*\]/g,' ').replace(/official\s*(music\s*)?(video|audio)|lyrics?/ig,' ').replace(/\s+/g,' ').trim().slice(0,160);
async function search(query){
  const q=clean(query);if(q.length<2)throw Error('Digite o nome da música e, se possível, o artista.');
  if(cache.get(q)?.until>Date.now())return cache.get(q).value;
  if(pending.has(q))return pending.get(q);
  if(pending.size>=2)return{status:'unavailable',query:q,results:[],message:'O catálogo está ocupado. Tente novamente.'};
  const request=(async()=>{try{
    const r=await fetch('https://api.enchor.us/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({search:q,per_page:8,page:1,instrument:null,difficulty:null,drumType:null,drumsReviewed:false,sort:null,source:'api'}),signal:AbortSignal.timeout(8000)});
    if(!r.ok)throw Error('Catálogo indisponível.');
    const text=await r.text();if(text.length>2*1024*1024)throw Error('Resposta maior que o limite.');const data=JSON.parse(text);
    if(!Array.isArray(data.data)||!Number.isFinite(data.found))throw Error('Resposta inválida.');
    if(data.found>0&&!data.data.length)throw Error('Resposta incompleta.');
    const validId=id=>typeof id==='string'&&/^[\w-]{8,160}$/.test(id);
    const results=data.data.slice(0,8).map(s=>({name:String(s.name||'Música').slice(0,160),artist:String(s.artist||'').slice(0,100),charter:String(s.charter||'').slice(0,100),duration:Number(s.song_length)/1000||null,downloadId:/^[a-f0-9]{32}$/.test(s.md5||'')?s.md5:null,hasVideo:!!s.hasVideoBackground,instruments:[['guitarra','diff_guitar'],['baixo','diff_bass'],['bateria','diff_drums'],['teclado','diff_keys'],['vocal','diff_vocals']].filter(([,k])=>Number.isFinite(s[k])&&s[k]>=0).map(([i])=>i),url:validId(s.driveFileId)?'https://drive.google.com/file/d/'+s.driveFileId+'/view':validId(s.parentFolderId)?'https://drive.google.com/drive/folders/'+s.parentFolderId:'https://www.enchor.us/'}));
    const value={status:results.length?'found':'not_found',query:q,results,total:data.found};
    if(cache.size>=64)cache.delete(cache.keys().next().value);cache.set(q,{until:Date.now()+600000,value});return value;
  }catch{return{status:'unavailable',query:q,results:[],message:'Não foi possível consultar o catálogo agora. Isso não significa que a música não exista.'};}finally{pending.delete(q);}})();
  pending.set(q,request);return request;
}
async function download(id,{noVideo=false,signal}={}){
  if(!/^[a-f0-9]{32}$/.test(id))throw Error('Identificador de pacote inválido.');
  let response=await fetch('https://files.enchor.us/'+id+(noVideo?'_novideo':'')+'.sng',{redirect:'error',signal});
  if(noVideo&&response.status===404){await response.body?.cancel();response=await fetch('https://files.enchor.us/'+id+'.sng',{redirect:'error',signal});}
  if(!response.ok||!response.body||/text\/html|application\/json/i.test(response.headers.get('content-type')||'')){await response.body?.cancel();throw Error('Este pacote não está disponível para download direto agora. Tente outra versão.');}
  if(Number(response.headers.get('content-length'))>100*1024*1024){await response.body.cancel();throw Error('O pacote ultrapassa 100 MB. Escolha uma versão menor.');}
  return response;
}
module.exports={search,clean,download};
