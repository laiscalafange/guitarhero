'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url'),vm=require('node:vm');
function sng(files,metadata={name:'Teste SNG',artist:'Guitaband'}){
  const u64=n=>{const b=Buffer.alloc(8);b.writeBigUInt64LE(BigInt(n));return b;},str=s=>{const b=Buffer.from(s),n=Buffer.alloc(4);n.writeInt32LE(b.length);return Buffer.concat([n,b]);};
  const meta=Buffer.concat([u64(Object.keys(metadata).length),...Object.entries(metadata).flatMap(([k,v])=>[str(k),str(v)])]);
  const header=Buffer.alloc(26);header.write('SNGPKG');header.writeUInt32LE(1,6);for(let i=0;i<16;i++)header[10+i]=i+1;
  const entries=Object.entries(files),indexLen=8+entries.reduce((n,[name])=>n+1+Buffer.byteLength(name)+16,0);let offset=26+8+meta.length+8+indexLen+8;
  const index=[u64(entries.length)],data=[];for(const[name,bytes]of entries){const nameBytes=Buffer.from(name);index.push(Buffer.from([nameBytes.length]),nameBytes,u64(bytes.length),u64(offset));offset+=bytes.length;data.push(Buffer.from(bytes.map((v,i)=>v^(i%16+1)^(i&255))));}
  return Buffer.concat([header,u64(meta.length),meta,u64(indexLen),...index,u64(data.reduce((n,b)=>n+b.length,0)),...data]);
}
const chart=Buffer.from('[Song]\n{\n Resolution = 192\n}\n[SyncTrack]\n{\n 0 = B 120000\n}\n[ExpertSingle]\n{\n 192 = N 4 96\n}');
const load=()=>import(pathToFileURL(path.join(__dirname,'../src/chart-import.mjs')).href);
test('SNG gera song.ini e desmascara arquivos Opus, ignorando imagens',async()=>{
  const {filesFromSng}=await load(),opus=Buffer.from('conteúdo de áudio'),bytes=sng({'notes.chart':chart,'song.opus':opus,'album.jpg':Buffer.from('imagem')});
  const files=await filesFromSng(new File([bytes],'teste.sng'));assert.deepEqual(files.map(f=>f.name),['song.ini','notes.chart','song.opus']);assert.match(await files[0].text(),/name = Teste SNG/);assert.deepEqual(Buffer.from(await files[2].arrayBuffer()),opus);
});
test('SNG inválido falha e não fica aguardando arquivos indefinidamente',async()=>{
  const {filesFromSng}=await load();await assert.rejects(filesFromSng(new File([Buffer.alloc(64)],'ruim.sng')));
});
test('bundle de navegador importa SNG e preserva notas e áudio sem dependências globais de Node',async()=>{
  const {build}=require('esbuild');const bundle=await build({entryPoints:[path.join(__dirname,'../src/chart-import.mjs')],bundle:true,format:'iife',platform:'browser',write:false,minify:true});
  const context=vm.createContext({File,Blob,ReadableStream,TextEncoder,TextDecoder,crypto:globalThis.crypto});vm.runInContext('globalThis.window=globalThis',context);vm.runInContext(bundle.outputFiles[0].text,context);
  const audio=Buffer.from('áudio opus'),bytes=sng({'notes.chart':chart,'song.opus':audio});
  const prepared=await context.JamChartImport.prepare([new File([bytes],'teste.sng')],()=>({decodeAudioData:async()=>({duration:3})}));
  assert.equal(prepared.manifest.title,'Teste SNG');assert.equal(prepared.manifest.charts.guitarra.expert.notes[0].t,.5);assert.deepEqual(Buffer.from(await prepared.file.arrayBuffer()),audio);
});
