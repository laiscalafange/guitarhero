'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),path=require('node:path');
const validate=require('../imported-chart'),engine=require('../public/chart-engine');
const parser=()=>import(pathToFileURL(path.join(__dirname,'../src/chart-import.mjs')).href);
const chart=`[Song]\n{\n Name = "Exemplo"\n Resolution = 192\n Offset = 0.1\n}\n[SyncTrack]\n{\n 0 = B 120000\n 384 = B 60000\n}\n[ExpertSingle]\n{\n 192 = N 0 192\n 192 = N 2 0\n 576 = N 4 96\n}`;
test('partitura preserva mudanças de BPM, offset, acordes e sustentações, sem a simplificação da IA',async()=>{
  const {fromChart}=await parser();const m=validate(fromChart(chart,{delay:'50'},5));
  assert.deepEqual(m.instruments,['guitarra']);assert.deepEqual(m.charts.guitarra.expert.notes,[{t:.65,dur:.5,lane:0},{t:.65,dur:0,lane:2},{t:2.15,dur:.5,lane:4}]);
  const playable=engine.fromManifest(m,'guitarra','expert',5);assert.deepEqual(playable.notes,m.charts.guitarra.expert.notes);
  assert.throws(()=>engine.fromManifest(m,'guitarra','facil',5),/dificuldade/);
});
test('MIDI reconhece vocal, guitarra e mapa de andamento sem criar instrumentos ausentes',async()=>{
  const {writeMidi}=require('midi-file'),{fromMidi}=await parser();
  const bytes=writeMidi({header:{format:1,numTracks:3,ticksPerBeat:192},tracks:[[{deltaTime:0,type:'setTempo',microsecondsPerBeat:500000},{deltaTime:384,type:'setTempo',microsecondsPerBeat:1000000},{deltaTime:0,type:'endOfTrack'}],[{deltaTime:0,type:'trackName',text:'PART GUITAR'},{deltaTime:576,type:'noteOn',channel:0,noteNumber:100,velocity:100},{deltaTime:96,type:'noteOff',channel:0,noteNumber:100,velocity:0},{deltaTime:0,type:'endOfTrack'}],[{deltaTime:0,type:'trackName',text:'PART VOCALS'},{deltaTime:192,type:'noteOn',channel:0,noteNumber:60,velocity:100},{deltaTime:192,type:'noteOff',channel:0,noteNumber:60,velocity:0},{deltaTime:0,type:'endOfTrack'}]]});
  const m=validate(fromMidi(bytes,{},5));assert.deepEqual(m.instruments,['guitarra','vocal']);assert.equal(m.charts.guitarra.expert.notes[0].t,2);assert.equal(m.charts.guitarra.expert.notes[0].dur,.5);assert.equal(m.charts.vocal.medio.notes[0].t,.5);
});
test('validação rejeita notas fora da música e faixas inválidas',async()=>{
  const {fromChart}=await parser();const m=fromChart(chart,{},5);m.charts.guitarra.expert.notes[0].lane=6;assert.throws(()=>validate(m),/Notas/);
  m.charts.guitarra.expert.notes[0].lane=0;m.charts.guitarra.expert.notes[0].t=7;assert.throws(()=>validate(m),/Notas/);
});
test('ZIP só extrai conteúdo musical e bloqueia pacotes excessivos antes de descompactar',async()=>{
  const {zipSync}=require('fflate'),{filesFrom}=await parser();
  const zip=zipSync({'teste/notes.chart':new TextEncoder().encode(chart),'teste/song.ini':new Uint8Array([1]),'teste/cover.jpg':new Uint8Array([1])});
  const files=await filesFrom([new File([zip],'pacote.zip')]);assert.deepEqual(files.map(f=>f.name).sort(),['teste/notes.chart','teste/song.ini']);
  const huge=zipSync({'song.wav':new Uint8Array(26*1024*1024)});await assert.rejects(filesFrom([new File([huge],'grande.zip')]),/limites/);
});
