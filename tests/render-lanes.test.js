const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

test('cinco instrumentos: 1–5 pistas, acordes, sustain, erros, teclas e efeitos de acerto',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
  const palette=html.slice(html.indexOf('const GH ='),html.indexOf('const FD ='));
  const render=html.slice(html.indexOf('function rgba('),html.indexOf('function drawFx('));
  const labels=[];
  const gradient={addColorStop(_position,color){assert.equal(typeof color,'string');}};
  const canvas=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,
    measureText:()=>({width:30}),fillText:(text)=>{assert.notEqual(text,undefined);labels.push(text);}},
    {get:(object,key)=>key in object?object[key]:()=>{},set(object,key,value){
      if(key==='fillStyle'||key==='strokeStyle')assert.notEqual(value,undefined,'cor ausente');
      object[key]=value;return true;
    }});
  const context=vm.createContext({g:canvas,S:{look:2,song:null},G:{mut:{}},C_PERS:2,S_MIN:1/3,
    FM:'sans-serif',FD:'sans-serif',Net:{name:'Teste'},INSTR:Object.fromEntries(['guitarra','baixo','bateria','teclado','vocal'].map(i=>[i,{label:i}])),DIFFS:{expert:{label:'Expert'}}});
  vm.runInContext(palette+render,context);
  for(const instr of ['guitarra','baixo','bateria','teclado','vocal'])for(let count=1;count<=5;count++)for(let state=0;state<=6;state++){
    context.P={instr,laneCount:count,cx:300,hw:300,laneW:300/count,yTop:150,yHit:600,
      down:Array(count).fill(true),notes:Array.from({length:count},(_,lane)=>({t:1,dur:state%2?.7:0,lane,st:state})),i0:0,
      hitFx:Array(count).fill(.95),keyset:{labels:['A','S','D','F','G']},combo:1,score:50,diff:'expert',acc:'#fff',
      flash:.95,last:{t0:.95,text:'OK',color:'#fff'}};
    for(const time of [.0,.95,1,1.5,2]){context.time=time;vm.runInContext('drawPlayer(g,P,time)',context);}
  }
  assert.ok(labels.includes('BUMBO'));
});
