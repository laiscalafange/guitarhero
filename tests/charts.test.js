'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {build,detect}=require('../public/chart-engine');
test('cada nota mantém o instante do áudio, em todas as dificuldades',()=>{
  const events=Array.from({length:30},(_,i)=>({t:.137+i*.117,pitch:50+i%12,dur:0,s:.7}));
  for(const diff of ['facil','medio','dificil','expert']) {
    const chart=build(events,'guitarra',diff,8);assert.ok(chart.notes.length);
    for(const n of chart.notes)assert.ok(events.some(e=>Math.abs(e.t-n.t)<.00006));
  }
  assert.ok(build(events,'guitarra','facil',8).notes.length<build(events,'guitarra','expert',8).notes.length);
});
test('sustain vem da duração detectada; não cria notas nem rastros em silêncio',()=>{
  const chart=build([{t:1,pitch:60,dur:.8,s:.9},{t:4,pitch:64,dur:0,s:.8}],'vocal','expert',7);
  assert.equal(chart.notes.length,2);assert.equal(chart.notes[0].dur,.8);assert.equal(chart.notes[1].dur,0);
  assert.deepEqual(build([],'teclado','medio',8).notes,[]);
});
test('polifonia é simplificada por dificuldade sem deslocar os acordes',()=>{
  const e=[60,64,67].map(pitch=>({t:2.13,pitch,dur:.7,s:.8}));
  assert.equal(build(e,'teclado','facil',5).notes.length,1);
  assert.equal(build(e,'teclado','expert',5).notes.length,3);
});
test('vazamento baixo e silêncio não oferecem teclado ou vocal',()=>{
  assert.equal(detect({ratio:.03,activeSeconds:12,eventCount:200,instrument:'teclado'}),false);
  assert.equal(detect({ratio:.5,activeSeconds:0,eventCount:0,instrument:'vocal'}),false);
  assert.equal(detect({ratio:.25,activeSeconds:12,eventCount:10,instrument:'vocal'}),true);
});

test('graves ficam à esquerda dos agudos e a mesma altura mantém a tecla',()=>{
  const pitches=[48,52,55,59,62,59,55,52,48,62,48,55,62];
  const events=pitches.map((pitch,i)=>({t:1+i*.36,pitch,dur:0,s:.8}));
  for(const instrument of ['guitarra','baixo','teclado','vocal'])for(const diff of ['facil','medio','dificil','expert']){
    const chart=build(events,instrument,diff,8),byPitch=new Map();
    assert.equal(chart.notes.length,events.length);
    chart.notes.forEach((note,i)=>{
      const previous=byPitch.get(pitches[i]);
      if(previous!==undefined)assert.equal(note.lane,previous,'uma nota repetida mudou de tecla');
      byPitch.set(pitches[i],note.lane);
    });
    const ordered=[...byPitch].sort((a,b)=>a[0]-b[0]);
    for(let i=1;i<ordered.length;i++)assert.ok(ordered[i][1]>=ordered[i-1][1],'a subida ficou invertida');
    assert.ok(ordered.at(-1)[1]>ordered[0][1]);
  }
});

test('alturas extremas raras não comprimem as cinco notas principais',()=>{
  const pitches=[48,52,55,59,62];
  const events=Array.from({length:100},(_,i)=>({t:1+i*.4,pitch:pitches[i%5],dur:0,s:.9}));
  const original=build(events,'guitarra','expert',43);
  const withOutliers=build([{t:.1,pitch:0,dur:0,s:.001},...events,{t:42,pitch:127,dur:0,s:.001}],'guitarra','expert',43);
  const main=withOutliers.notes.filter(note=>note.t>=1&&note.t<41);
  assert.deepEqual(main.map(note=>note.lane),original.notes.map(note=>note.lane));
  assert.equal(new Set(main.map(note=>note.lane)).size,5);
});

test('o mesmo acorde mantém o desenho quando muda a força das cordas',()=>{
  const events=[];
  for(const [t,volumes]of [[1,[.65,1,.8]],[2,[1,.6,.9]],[3,[.75,.85,1]]]){
    [60,64,67].forEach((pitch,i)=>events.push({t,pitch,dur:.2,s:volumes[i]}));
  }
  const chart=build(events,'guitarra','expert',5);
  const patterns=[1,2,3].map(t=>chart.notes.filter(note=>note.t===t).map(note=>note.lane));
  assert.equal(patterns[0].length,2);
  assert.deepEqual(patterns[1],patterns[0]);assert.deepEqual(patterns[2],patterns[0]);
});

test('baixo e vocal seguem uma voz; acordes rápidos evitam três teclas',()=>{
  const events=[];
  for(const t of [1,1.2,1.4])[48,52,55,59].forEach(pitch=>events.push({t,pitch,dur:.8,s:.8}));
  for(const instrument of ['baixo','vocal']){
    const chart=build(events,instrument,'expert',4);
    assert.equal(chart.notes.length,3);
  }
  const guitar=build(events,'guitarra','expert',4);
  assert.equal(guitar.notes.filter(note=>note.t===1).length,2);
  assert.equal(guitar.notes.filter(note=>note.t===1.2).length,2);
});

test('dobras de oitava e ecos fracos não empilham o acorde',()=>{
  const events=[{pitch:48,s:.9},{pitch:60,s:.8},{pitch:67,s:.7},{pitch:72,s:.6},{pitch:80,s:.01}]
    .map(event=>({...event,t:1,dur:.8}));
  const chart=build(events,'guitarra','expert',4);
  assert.equal(chart.notes.length,2);
  assert.ok(chart.notes[0].lane<chart.notes[1].lane);
});

test('a dobra de uma corda grave não troca o registro do riff à toa',()=>{
  const pitches=[60,64,67,60,64,67,60,64,67];
  const events=pitches.map((pitch,i)=>({t:1+i*.4,pitch,dur:0,s:.8}));
  events.push({t:2.2,pitch:48,dur:0,s:.9}); // mesma classe de C4, junto do C4 detectado
  const chart=build(events,'guitarra','medio',6);
  const firstC=chart.notes.find(note=>note.t===1),doubledC=chart.notes.find(note=>note.t===2.2);
  assert.ok(firstC&&doubledC);assert.equal(firstC.lane,doubledC.lane);
});

test('Fácil e Médio deixam tempo para soltar a sustentação antes do próximo ataque',()=>{
  const events=[{t:1,pitch:48,dur:1,s:.8},{t:1.7,pitch:60,dur:.5,s:.8},{t:3.99,pitch:67,dur:2,s:.8}];
  for(const diff of ['facil','medio']){
    const chart=build(events,'guitarra',diff,4);
    assert.ok(chart.notes[0].dur>0);
    assert.ok(chart.notes[0].t+chart.notes[0].dur<=1.63);
    for(const note of chart.notes)assert.ok(note.t+note.dur<=4);
  }
});

test('bateria mantém a posição de cada peça, inclusive no Fácil',()=>{
  const events=[0,3,1,3,0,2].map((lane,i)=>({t:1+i*.32,lane,pitch:36+lane,dur:0,s:.9}));
  for(const diff of ['facil','medio','dificil','expert']){
    const chart=build(events,'bateria',diff,4);
    assert.equal(chart.notes.length,events.length);
    chart.notes.forEach((note,i)=>assert.equal(note.lane,Math.min(chart.laneCount-1,events[i].lane)));
  }
});

test('partituras humanas importadas continuam exatamente como foram escritas',()=>{
  const {fromManifest}=require('../public/chart-engine');
  const original={laneCount:5,notes:[{t:1.137,lane:4,dur:.8},{t:2,lane:0,dur:0},{t:2,lane:4,dur:0}]};
  const manifest={source:'chart',charts:{guitarra:{expert:original}}};
  const output=fromManifest(manifest,'guitarra','expert',4);
  assert.deepEqual(output,original);assert.notEqual(output.notes,original.notes);
  output.notes[0].lane=2;assert.equal(original.notes[0].lane,4);
});

test('vozes silenciosas e alturas inválidas não geram pistas inválidas nem alteram a entrada',()=>{
  const events=Object.freeze([
    Object.freeze({t:1,pitch:60,dur:.5,s:0}),Object.freeze({t:2,pitch:NaN,dur:0,s:.8}),
    Object.freeze({t:3,pitch:128,dur:0,s:.8}),Object.freeze({t:4,pitch:60,dur:Infinity,s:.8})
  ]);
  const chart=build(events,'guitarra','expert',5);
  assert.equal(chart.notes.length,1);assert.equal(chart.notes[0].t,4);
  assert.equal(chart.notes[0].dur,0);assert.ok(Number.isInteger(chart.notes[0].lane));
});
