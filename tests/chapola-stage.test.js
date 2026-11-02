'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const stage=require('../public/js/chapola-stage');
function context(){
  const commands=[],saved=[],state={globalAlpha:.65,fillStyle:'#fff',strokeStyle:'#fff',lineWidth:1,font:'12px sans-serif'};
  const gradient={addColorStop(position,color){assert.ok(Number.isFinite(position)&&position>=0&&position<=1);assert.equal(typeof color,'string');assert.equal(color.includes('NaN'),false);}};
  const g=new Proxy({...state,save(){saved.push(Object.fromEntries(Object.keys(state).map(key=>[key,this[key]])));},restore(){assert.ok(saved.length);Object.assign(this,saved.pop());},createLinearGradient(...args){assert.ok(args.every(Number.isFinite));return gradient;},createRadialGradient(...args){assert.ok(args.every(Number.isFinite));assert.ok(args[2]>=0&&args[5]>=0);return gradient;}},{get:(object,key)=>key in object?object[key]:(...args)=>{for(const value of args)if(typeof value==='number')assert.ok(Number.isFinite(value),key+' finito');if(key==='fillText'||key==='strokeText')assert.equal(typeof args[0],'string');commands.push([key,...args]);},set:(object,key,value)=>{if(key==='globalAlpha')assert.ok(Number.isFinite(value)&&value>=0&&value<=1);if(key==='lineWidth')assert.ok(Number.isFinite(value)&&value>0);if(key==='fillStyle'||key==='strokeStyle')assert.ok(typeof value==='string'||value===gradient);object[key]=value;return true;}});
  return{g,commands,check(){assert.equal(saved.length,0);for(const key of Object.keys(state))assert.equal(g[key],state[key],key+' restaurado');}};
}
function frozenPlayer(instrument,lanes,combo,yTop=152){
  return Object.freeze({instr:instrument,laneCount:lanes,cx:250,hw:360,laneW:360/lanes,yTop,yHit:630,combo,score:12345,
    down:Object.freeze(Array.from({length:lanes},(_,lane)=>lane%2===0)),hitFx:Object.freeze(Array(lanes).fill(.95)),keyset:Object.freeze({labels:Object.freeze(['A','S','G','H','ESP'])}),notes:Object.freeze([Object.freeze({t:1,lane:0,dur:2,st:0})])});
}
test('arte do palco preserva jogador, notas, partículas e contexto em todos os instrumentos',()=>{
  for(const instrument of ['guitarra','baixo','bateria','teclado','vocal'])for(let lanes=1;lanes<=5;lanes++)for(const combo of [0,9,10,30,40,199])for(const reduced of [false,true]){
    const P=frozenPlayer(instrument,lanes,combo,lanes%2?152:120),particle=Object.freeze({x:240,y:600,vx:-75,vy:100,t:.1,life:.4}),before=JSON.stringify({P,particle}),ctx=context(),g=ctx.g;
    stage.highway(g,P,1,1/3,reduced);stage.rails(g,P,1,1/3,reduced);
    for(let lane=0;lane<lanes;lane++){
      stage.note(g,P,lane,250,300,.55,'#2fd04a');
      stage.receptor(g,P,lane,250,630,Math.min(P.laneW*.42,31),'#2fd04a',true,.05,reduced);
    }
    stage.sustain(g,Object.freeze({x1:250,y1:600,x2:230,y2:220,w1:8,w2:3,color:'#2fd04a',held:true,time:1}),reduced);
    stage.hud(g,P,Object.freeze({name:'Teste de nome longo',instrument,difficulty:'Expert',mult:4,frac:1}));
    stage.judgement(g,P,Object.freeze({text:'PERFEITO',x:250,y:544,age:.1}),reduced);stage.judgement(g,P,Object.freeze({text:'ERROU',x:250,y:544,age:.2}),reduced);
    stage.player(g,P,1,reduced);stage.particle(g,particle,reduced);ctx.check();assert.equal(JSON.stringify({P,particle}),before);
  }
});
test('bumbo mantém barra larga e as outras gemas cabem na própria pista',()=>{
  for(let lanes=1;lanes<=5;lanes++)for(const s of [.33,.7,1]){
    const P=frozenPlayer('bateria',lanes,0),kick=context();stage.note(kick.g,P,0,P.cx,300,s,'#ff8a1f');
    const kickX=kick.commands.filter(command=>command[0]==='moveTo'||command[0]==='lineTo').map(command=>command[1]);assert.ok(Math.max(...kickX)-Math.min(...kickX)>P.hw*s*.9);kick.check();
    const guitar=frozenPlayer('guitarra',lanes,0),gem=context();stage.note(gem.g,guitar,0,guitar.cx,300,s,'#2fd04a');
    const gemX=gem.commands.filter(command=>command[0]==='moveTo'||command[0]==='lineTo').map(command=>command[1]);assert.ok(Math.max(...gemX)-Math.min(...gemX)<guitar.laneW*s);gem.check();
  }
});
test('movimento reduzido remove partículas e deslocamentos decorativos do braço',()=>{
  const P=frozenPlayer('baixo',4,40),a=context(),b=context();stage.highway(a.g,P,1,1/3,true);stage.highway(b.g,P,12,1/3,true);assert.deepEqual(a.commands,b.commands);a.check();b.check();
  const off=context(),on=context(),particle=Object.freeze({x:100,y:200,vx:50,vy:50});stage.particle(off.g,particle,true);stage.particle(on.g,particle,false);assert.equal(off.commands.length,0);assert.ok(on.commands.length>0);off.check();on.check();
});
