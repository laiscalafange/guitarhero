'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const stage=require('../public/js/johgi-stage');
function canvas(){
  const calls=[],stack=[],initial={globalAlpha:.65,fillStyle:'#fff',strokeStyle:'#fff',lineWidth:1,font:'12px sans-serif',textAlign:'left',textBaseline:'alphabetic'};
  const gradient={addColorStop(t,color){assert.ok(t>=0&&t<=1);assert.equal(typeof color,'string');assert.ok(!color.includes('NaN'));}};
  const g=new Proxy({...initial,save(){stack.push(Object.fromEntries(Object.keys(initial).map(key=>[key,this[key]])));},restore(){assert.ok(stack.length);Object.assign(this,stack.pop());},createLinearGradient(...args){assert.ok(args.every(Number.isFinite));return gradient;}},{
    get:(object,key)=>key in object?object[key]:(...args)=>{for(const arg of args)if(typeof arg==='number')assert.ok(Number.isFinite(arg),key+' finito');if(key==='ellipse')assert.ok(args[2]>=0&&args[3]>=0);calls.push([key,...args]);},
    set:(object,key,value)=>{if(key==='globalAlpha')assert.ok(value>=0&&value<=1);if(key==='lineWidth')assert.ok(value>0&&Number.isFinite(value));object[key]=value;return true;}
  });
  return{g,calls,check(){assert.equal(stack.length,0);for(const key of Object.keys(initial))assert.equal(g[key],initial[key],key+' restaurado');}};
}
const player=(instr,lanes,combo)=>Object.freeze({instr,laneCount:lanes,cx:230,hw:320,laneW:320/lanes,yTop:lanes%2?152:120,yHit:620,score:12345,combo,down:Object.freeze(Array(lanes).fill(true)),hitFx:Object.freeze(Array(lanes).fill(.95)),keyset:Object.freeze({labels:Object.freeze(['A','S','G','H','ESP'])}),notes:Object.freeze([Object.freeze({t:1,lane:0,dur:2,st:0})])});
test('Johgi desenha todos os instrumentos sem alterar notas, placar ou estado do canvas',()=>{
  for(const instrument of ['guitarra','baixo','bateria','teclado','vocal'])for(let lanes=1;lanes<=5;lanes++)for(const combo of [0,10,40])for(const reduced of [false,true]){
    const P=player(instrument,lanes,combo),ctx=canvas(),g=ctx.g,before=JSON.stringify(P),particle=Object.freeze({x:230,y:610,vx:-55,t:.1});
    stage.backdrop(g,960,720,1,{},reduced);stage.highway(g,P,1,1/3,reduced);stage.rails(g,P,1,1/3,reduced);
    for(let lane=0;lane<lanes;lane++){stage.note(g,P,lane,230,330,.5,'#2fd04a');stage.receptor(g,P,lane,230,620,25,'#2fd04a',true,.05,reduced);}
    stage.sustain(g,Object.freeze({x1:230,y1:600,x2:210,y2:200,w1:8,w2:3,color:'#2fd04a',held:true,time:1}),reduced);
    stage.hud(g,P,Object.freeze({name:'Nome muito comprido',instrument,difficulty:'Expert',mult:4,frac:1}));
    for(const text of ['PERFEITO','ERROU'])stage.judgement(g,P,Object.freeze({text,x:230,y:534,age:.1}),reduced);
    stage.player(g,P,1,reduced);stage.particle(g,particle,reduced);stage.gem(g,230,300,20,'#2fd04a');ctx.check();assert.equal(JSON.stringify(P),before);
  }
});
test('Johgi preserva a largura do bumbo e a cor de cada pista; movimento reduzido fica estático',()=>{
  const P=player('bateria',4,40),ctx=canvas();stage.note(ctx.g,P,0,P.cx,300,1,'#ff8a1f');
  const xs=ctx.calls.filter(c=>c[0]==='moveTo'||c[0]==='lineTo').map(c=>c[1]);assert.ok(Math.max(...xs)-Math.min(...xs)>P.hw*.9);assert.ok(ctx.calls.some(c=>c[0]==='fill'));ctx.check();
  const a=canvas(),b=canvas();stage.highway(a.g,P,1,1/3,true);stage.highway(b.g,P,100,1/3,true);assert.deepEqual(a.calls,b.calls);a.check();b.check();
  const off=canvas();stage.particle(off.g,Object.freeze({x:1,y:2,vx:5,t:.1}),true);assert.equal(off.calls.length,0);off.check();
});
test('trocar Johgi, Chapola e avatares padrão restaura o tema correto sem tocar no jogo',()=>{
  const classes=new Set(),calls=[],original={active:false,setCharacter(id){this.active=id==='chapola';}},fakeStage={};
  for(const name of Object.keys(stage)){original[name]=(...args)=>calls.push({theme:'chapola',name,args});fakeStage[name]=(...args)=>calls.push({theme:'johgi',name,args});}
  const window={JamTheme:original,JamJohgiStage:fakeStage},document={body:{classList:{toggle(name,on){on?classes.add(name):classes.delete(name);}}},createElement(){return{setAttribute(){}};},querySelector(){return{before(){}};}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../public/js/johgi-theme'),'utf8'),{window,document,matchMedia:()=>({matches:true}),Image:class{}});
  const theme=window.JamTheme,data=Object.freeze({combo:4});
  theme.setCharacter('gio');assert.equal(theme.active,true);assert.ok(classes.has('theme-johgi'));theme.note(data);assert.equal(calls.at(-1).theme,'johgi');assert.equal(calls.at(-1).args[0],data);
  theme.setCharacter('chapola');assert.equal(theme.active,true);assert.equal(classes.has('theme-johgi'),false);theme.note(data);assert.equal(calls.at(-1).theme,'chapola');assert.equal(calls.at(-1).args[0],data);
  for(const id of ['irisu','roberto','ratazana','lizzi','tatsugiri']){theme.setCharacter(id);assert.equal(theme.active,false);assert.equal(classes.has('theme-johgi'),false);}
});
