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
