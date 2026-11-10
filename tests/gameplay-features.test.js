'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../public/js/game.js'),'utf8');
function block(start,end){const i=html.indexOf(start),j=html.indexOf(end,i);assert.ok(i>=0&&j>i);return html.slice(i,j);}
test('a escolha de 3, 4 ou 5 teclas redistribui notas sem pistas inválidas',()=>{
  const ctx=vm.createContext({});
  vm.runInContext(block('function adaptLanes(chart, wanted)', 'function makePlayer'),ctx);
  for(const count of [3,4,5]){
    const original={laneCount:5,notes:[{t:1,lane:0,dur:0},{t:1,lane:1,dur:0},{t:2,lane:2,dur:0},{t:3,lane:3,dur:.5},{t:4,lane:4,dur:0}]};
    const out=vm.runInContext(`adaptLanes(${JSON.stringify(original)}, ${count})`,ctx);
    assert.equal(out.laneCount,count);
    assert.ok(out.notes.length>0);
    assert.ok(out.notes.every(n=>n.lane>=0&&n.lane<count));
    assert.ok(out.notes.every(n=>n.sl>=0&&n.sl<5));
  }
});
test('pressionar fora do ritmo não marca erro, não desconta pontos nem quebra combo',()=>{
  const P={laneCount:3,down:[false,false,false],lane:[[0],[],[]],ptr:[0,0,0],win:{ok:.1},notes:[{t:10,st:0}],stray:0,score:120,miss:0,combo:4};
  const evt=[];
  const ctx=vm.createContext({G:{players:[P],state:'play',paused:false},ctx:{currentTime:2},songNow:()=>3,playKeyHit:()=>{},Net:{emit:(...v)=>evt.push(v)}});
  vm.runInContext(block('function press(pi, l)', 'function release(pi, l)'),ctx);
  vm.runInContext('press(0,0)',ctx);
  assert.equal(P.miss,0); assert.equal(P.score,120); assert.equal(P.combo,4);
  assert.equal(P.stray,1); assert.equal(evt.length,0);
});
test('a nota longa só erra depois de passar o fim sem estar segurando',()=>{
 const P={notes:[{t:1,dur:3,st:7,lane:0}],lane:[[0]],ptr:[0],laneCount:1,diff:'medio',instr:'guitarra',combo:4,miss:0,score:100,win:{ok:.1},lastPress:0};
 const events=[],G={players:[P],state:'play',muteUntil:{},round:5};
 const ctx=vm.createContext({G,S:{song:{duration:50}},Net:{emit:(...args)=>events.push(args)},teamSize:()=>0,breakCombo:p=>{p.combo=0;},failFx:p=>{p.score=Math.max(0,p.score-20);},setMutedI:()=>{},playErrI:()=>{},ctx:{currentTime:1},finish:()=>{}});
 vm.runInContext(block('function update(tv)', 'function press(pi, l)'),ctx);
 vm.runInContext('update(3.9)',ctx);
 assert.equal(P.miss,0);
 vm.runInContext('update(4.5)',ctx);
 assert.equal(P.miss,1);assert.equal(P.score,80);assert.equal(P.combo,0);
});

test('adaptação de partituras grandes elimina duplicatas da mesma pista preservando sustains', () => {
  const ctx = vm.createContext({});
  vm.runInContext(block('function adaptLanes(chart, wanted)', 'function makePlayer'), ctx);
  const notes = [];
  for (let i = 0; i < 12000; i++) notes.push({ t: i * 0.05, lane: i % 5, dur: .03 });
  notes.push({ t: 1, lane: 0, dur: .5 });
  const result = vm.runInContext(`adaptLanes(${JSON.stringify({ laneCount: 5, notes })}, 3)`, ctx);
  assert.equal(result.laneCount, 3);
  assert.ok(result.notes.length < notes.length);
  assert.ok(result.notes.every(n => n.lane >= 0 && n.lane < 3));
  assert.ok(result.notes.every(n => Number.isInteger(n.sl) && n.sl >= 0 && n.sl < 5));
});

test('mixagem residual preserva o áudio original e não cria matrizes temporárias por canal', async () => {
  const ctx = vm.createContext({ Promise, setTimeout, Float32Array, Math });
  vm.runInContext(block('async function makeResidualBuffer(', 'async function prepare('), ctx);
  const makeBuffer = (channels, sampleRate) => ({
    numberOfChannels: channels.length, length: channels[0].length, sampleRate,
    getChannelData(index) { return channels[index]; }
  });
  const left = Float32Array.from([1, .8, .6, .4]);
  const right = Float32Array.from([.9, .7, .5, .3]);
  const source = makeBuffer([left, right], 44100);
  const stem = makeBuffer([Float32Array.from([.2, .2, .2, .2])], 44100);
  const c = { createBuffer(n, length, sr) {
    assert.equal(sr, 44100);
    return makeBuffer(Array.from({ length: n }, () => new Float32Array(length)), sr);
  } };
  const result = await ctx.makeResidualBuffer(c, { buffer: source, sr: 44100, stems: { baixo: stem } }, ['baixo']);
  assert.ok(Math.abs(result.getChannelData(0)[0] - .8) < 1e-6);
  assert.ok(Math.abs(result.getChannelData(1)[0] - .7) < 1e-6);
  assert.equal(left[0], 1);
  assert.ok(Math.abs(right[0] - .9) < 1e-6, 'não modifica o áudio original');
});
