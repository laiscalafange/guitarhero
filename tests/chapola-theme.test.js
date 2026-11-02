'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const renderer=require('../public/js/chapola-renderer');
test('tema Chapola desenha acertos e combos sem modificar jogador, notas ou partículas',()=>{
  const gradient={addColorStop(){}};
  const g=new Proxy({globalAlpha:1,createLinearGradient:()=>gradient},{get:(object,key)=>key in object?object[key]:()=>{},set(object,key,value){if(['fillStyle','strokeStyle'].includes(key))assert.ok(typeof value==='string'||value===gradient,'cor ou gradiente válido');object[key]=value;return true;}});
  for(let lanes=1;lanes<=5;lanes++)for(const combo of [0,9,10,20,30,40,199]){
    const player={laneCount:lanes,cx:300,hw:300,laneW:300/lanes,yHit:600,hitFx:Array(lanes).fill(.95),combo,score:123,notes:[{t:1,lane:0,st:0,dur:2}]},particle={x:100,y:200,vx:-30,vy:70,t:.05,life:.4,c:'#fff'};
    const before=JSON.stringify({player,particle});
    for(const reduced of [false,true]){renderer.backdrop(g,1280,720,1,{},reduced);renderer.backdrop(g,390,844,1,{},reduced);renderer.player(g,player,1,reduced);renderer.gem(g,200,600,20,'#f00');renderer.particle(g,particle);}
    assert.equal(JSON.stringify({player,particle}),before);
  }
});
