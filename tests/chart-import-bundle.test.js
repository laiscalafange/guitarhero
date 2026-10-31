'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),path=require('node:path');
test('importador de navegador lê ZIP, usa áudio original e preserva as notas sem globais auxiliares',async()=>{
  const {build}=require('esbuild'),{zipSync}=require('fflate');
  const result=await build({entryPoints:[path.join(__dirname,'../src/chart-import.mjs')],bundle:true,format:'iife',platform:'browser',write:false,minify:true});
  const context=vm.createContext({File,TextEncoder,TextDecoder,crypto:globalThis.crypto});vm.runInContext('globalThis.window=globalThis',context);vm.runInContext(result.outputFiles[0].text,context);
  const chart='[Song]\n{\n Resolution = 192\n}\n[SyncTrack]\n{\n 0 = B 120000\n}\n[ExpertSingle]\n{\n 192 = N 4 96\n}';
  const audio=Buffer.from('áudio original preservado'),zip=zipSync({'song/notes.chart':Buffer.from(chart),'song/song.ini':Buffer.from('[song]\nname = Teste\nartist = Autor\n'),'song/song.ogg':audio});
  const prepared=await context.JamChartImport.prepare([new File([zip],'pacote.zip')],()=>({decodeAudioData:async()=>({duration:6})}));
  assert.equal(prepared.manifest.source,'chart');assert.deepEqual(JSON.parse(JSON.stringify(prepared.manifest.charts.guitarra.expert.notes)),[{t:.5,dur:.25,lane:4}]);
  assert.deepEqual(Buffer.from(await prepared.file.arrayBuffer()),audio);assert.match(prepared.chartId,/^[a-f0-9]{32}$/);
});
