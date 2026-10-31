'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

function harness(auto=false) {
  const handlers={},calls=[],workers=[],selected=[],background=[],foreground=[],intervals=new Set();
  const manifests=new Map([['B',{version:1,instruments:['baixo'],events:{baixo:[{t:1,pitch:40,dur:0,s:.8}]}}]]);
  const jobs=[{key:'A',status:'queued'},{key:'C',status:'queued'},{key:'B',status:'ready'}];let revision=1;
  const snapshot=()=>({revision:revision++,jobs:jobs.map(j=>({...j}))});
  const room={playlist:{songs:[{key:'A',name:'Música A'},{key:'B',name:'Música B'},{key:'C',name:'Música C'}]},
    on(type,fn){handlers[type]=fn;},
    async request(route,options={}) {
      calls.push({route,...options});
      if(route==='/api/analysis/queue')return snapshot();
      if(route==='/api/analysis')return manifests.has(options.key)?{status:'ready',progress:1}:{status:'idle',progress:0};
      if(route==='/api/analysis/claim'){jobs.find(j=>j.key===options.key).status='running';return{status:'running',progress:0,lease:'lease-'+options.key};}
      if(route==='/api/analysis/manifest')return manifests.get(options.key);
      if(route==='/api/analysis/complete'){manifests.set(options.key,options.body);jobs.find(j=>j.key===options.key).status='ready';handlers.analysis({key:options.key,status:'ready',progress:1});return{status:'ready'};}
      return{ok:true};
    },
    async uploadStem(key,instrument,body){calls.push({route:'upload',key,instrument,bytes:body.size});},
    async download(){return new ArrayBuffer(128);}
  };
  class Worker {
    constructor(){workers.push(this);this.terminated=false;}
    postMessage(data){this.input=data;}
    terminate(){this.terminated=true;}
    emit(data){this.onmessage?.({data});}
  }
  class OfflineAudioContext {
    createBufferSource(){return{connect(){},start(){}};}
    async startRendering(){return{getChannelData:()=>new Float32Array(128)};}
  }
  const context={window:{},Worker,OfflineAudioContext,Blob,Uint8Array,Float32Array,Map,Promise,decodeURIComponent,Date,console,
    setInterval(fn){const id={fn};intervals.add(id);return id;},clearInterval(id){intervals.delete(id);}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../public/ai-client.js'),'utf8'),context);
  const ai=new context.window.JamAI({room,getContext:()=>({decodeAudioData:async()=>({duration:6})}),onState:s=>foreground.push(s),onReady:m=>selected.push(m),onBackground:s=>background.push(s),...(auto?{canProcess:()=>true}:{})});
  const song=key=>({key,name:'Música '+key,duration:6,buffer:{}});
  return{ai,room,workers,calls,selected,background,foreground,intervals,handlers,song,manifests,jobs,snapshot};
}
async function until(fn){for(let i=0;i<40;i++){if(fn())return;await new Promise(r=>setImmediate(r));}throw Error('A preparação não avançou.');}
const manifestA={version:1,duration:6,instruments:['vocal'],events:{vocal:[{t:1,pitch:60,dur:.5,s:.8}]}};

test('continua A ao escolher B; terminar A não troca a partitura de B',async()=>{
  const h=harness();await h.ai.follow(h.song('A'));const running=h.ai.run();
  await until(()=>h.workers[0]?.input);
  await h.ai.follow(h.song('B'));
  assert.equal(h.workers[0].terminated,false);
  h.workers[0].emit({type:'progress',p:.7,text:'Transcrevendo A…'});
  assert.equal(h.foreground.at(-1).status,'ready');
  assert.equal(h.background.at(-1).key,'A');
  h.workers[0].emit({type:'stem',key:'vocal',bytes:new ArrayBuffer(44)});
  h.workers[0].emit({type:'done',manifest:manifestA});await running;
  assert.equal(h.ai.key,'B');assert.equal(h.ai.song.analysis.instruments[0],'baixo');
  assert.ok(h.selected.every(m=>m.instruments[0]==='baixo'));
  assert.ok(h.calls.some(c=>c.route==='/api/analysis/complete'&&c.key==='A'));
  assert.equal(h.calls.some(c=>c.route==='/api/analysis/cancel'),false);
  assert.equal(h.background.at(-1).status,'ready');
  assert.equal(h.intervals.size,0);
});

test('continua A ao escolher exemplo; só abre um worker por aparelho',async()=>{
  const h=harness();await h.ai.follow(h.song('A'));const running=h.ai.run();
  await until(()=>h.workers[0]?.input);h.ai.detach();
  assert.equal(h.workers[0].terminated,false);assert.equal(h.ai.key,null);
  await h.ai.follow(h.song('B'));await h.ai.run();assert.equal(h.workers.length,1);
  h.workers[0].emit({type:'stem',key:'vocal',bytes:new ArrayBuffer(44)});h.workers[0].emit({type:'done',manifest:manifestA});await running;
  assert.equal(h.intervals.size,0);
});

test('cancelar em segundo plano interrompe A e preserva B pronta',async()=>{
  const h=harness();await h.ai.follow(h.song('A'));const running=h.ai.run();
  await until(()=>h.workers[0]?.input);await h.ai.follow(h.song('B'));await h.ai.cancel();await running;
  assert.equal(h.workers[0].terminated,true);assert.equal(h.ai.key,'B');
  assert.equal(h.ai.song.analysis.instruments[0],'baixo');
  assert.equal(h.foreground.at(-1).status,'ready');
  assert.ok(h.calls.some(c=>c.route==='/api/analysis/cancel'&&c.key==='A'));
  assert.equal(h.intervals.size,0);
});

test('remover A da playlist cancela sua preparação em segundo plano',async()=>{
  const h=harness();await h.ai.follow(h.song('A'));const running=h.ai.run();
  await until(()=>h.workers[0]?.input);await h.ai.follow(h.song('B'));
  h.handlers.playlist({songs:[{key:'B'}]});await running;
  assert.equal(h.ai.task,null);assert.equal(h.workers[0].terminated,true);
  assert.equal(h.ai.key,'B');assert.equal(h.intervals.size,0);
});

test('resposta atrasada da seleção A não muda B',async()=>{
  const h=harness();let resolveOld;const original=h.room.request;
  h.room.request=(route,options)=>route==='/api/analysis'&&options.key==='A'?new Promise(resolve=>{resolveOld=resolve;}):original(route,options);
  const followingA=h.ai.follow(h.song('A'));await h.ai.follow(h.song('B'));
  resolveOld({status:'running',progress:.2});await followingA;
  assert.equal(h.ai.key,'B');assert.equal(h.foreground.at(-1).status,'ready');
});
test('fila automática prepara A e C em ordem enquanto B permanece escolhida para jogar',async()=>{
  const h=harness(true);await h.ai.follow(h.song('B'));
  await until(()=>h.workers[0]?.input);
  h.workers[0].emit({type:'stem',key:'vocal',bytes:new ArrayBuffer(44)});h.workers[0].emit({type:'done',manifest:manifestA});
  await until(()=>h.workers[1]?.input);
  assert.deepEqual(h.calls.filter(c=>c.route==='/api/analysis/claim').map(c=>c.key),['A','C']);
  assert.equal(h.ai.key,'B');assert.equal(h.ai.song.analysis.instruments[0],'baixo');
  h.workers[1].emit({type:'stem',key:'vocal',bytes:new ArrayBuffer(44)});h.workers[1].emit({type:'done',manifest:manifestA});
  await until(()=>!h.ai.task);h.handlers.closed();assert.equal(h.intervals.size,0);
});
test('troca de prioridade termina o worker antigo sem cancelar a nova fila no servidor',async()=>{
  const h=harness();await h.ai.follow(h.song('A'));const running=h.ai.run();await until(()=>h.workers[0]?.input);
  h.jobs[0].status='queued';h.ai.receiveQueue(h.snapshot());await running;
  assert.equal(h.workers[0].terminated,true);assert.equal(h.ai.task,null);
  assert.equal(h.calls.some(c=>c.route==='/api/analysis/cancel'),false);
});
test('prioridade recebida antes da resposta de claim não inicia um worker com autorização antiga',async()=>{
  const h=harness();await h.ai.follow(h.song('A'));let respond;const original=h.room.request;
  h.room.request=(route,options)=>route==='/api/analysis/claim'?new Promise(resolve=>{respond=resolve;}):original(route,options);
  const running=h.ai.run();h.ai.receiveQueue({revision:12,jobs:[{key:'C',status:'queued'},{key:'A',status:'queued'}]});
  respond({status:'running',lease:'antiga',queueRevision:11});await running;
  assert.equal(h.workers.length,0);assert.equal(h.ai.task,null);
  assert.equal(h.calls.some(c=>c.route==='/api/analysis/cancel'),false);
});
test('erro do worker é enviado com o motivo original, sem virar cancelamento genérico',async()=>{
  const h=harness();await h.ai.follow(h.song('A'));const running=h.ai.run();
  const failed=assert.rejects(running,/arquivo inválido/);await until(()=>h.workers[0]?.input);
  h.workers[0].emit({type:'progress',p:.025,text:'Iniciando a separação'});
  h.workers[0].emit({type:'error',message:'Modelo: arquivo inválido'});await failed;
  const report=h.calls.find(c=>c.route==='/api/analysis/fail');assert.ok(report);
  assert.equal(report.body.details,'Modelo: arquivo inválido');assert.equal(report.body.stage,'Iniciando a separação');
  assert.equal(h.calls.some(c=>c.route==='/api/analysis/cancel'),false);assert.equal(h.workers[0].terminated,true);assert.equal(h.intervals.size,0);
});
test('falha de inicialização reinicia em outro worker com CPU compatível e conclui a mesma música',async()=>{
  const h=harness();h.ai.gpu=true;await h.ai.follow(h.song('A'));const running=h.ai.run();
  await until(()=>h.workers[0]?.input);assert.equal(h.workers[0].input.compatibility,false);
  h.workers[0].emit({type:'error',message:'WebAssembly: Failed to initialize backend'});
  await until(()=>h.workers[1]?.input);assert.equal(h.workers[0].terminated,true);assert.equal(h.workers[1].input.compatibility,true);
  h.workers[1].emit({type:'stem',key:'vocal',bytes:new ArrayBuffer(44)});h.workers[1].emit({type:'done',manifest:manifestA});await running;
  assert.equal(h.workers.length,2);assert.equal(h.calls.filter(c=>c.route==='/api/analysis/claim').length,1);
  assert.equal(h.calls.some(c=>c.route==='/api/analysis/fail'),false);assert.equal(h.ai.song.analysis.instruments[0],'vocal');assert.equal(h.intervals.size,0);
});
test('segunda falha preserva os dois motivos e não entra em repetição de análise',async()=>{
  const h=harness();await h.ai.follow(h.song('A'));const running=h.ai.run();const failed=assert.rejects(running,/Modo compatível/);
  await until(()=>h.workers[0]?.input);h.workers[0].emit({type:'error',message:'WebAssembly: backend indisponível'});
  await until(()=>h.workers[1]?.input);h.workers[1].emit({type:'error',message:'WebAssembly: falha ao carregar biblioteca'});await failed;
  const report=h.calls.find(c=>c.route==='/api/analysis/fail');assert.match(report.body.details,/backend indisponível/);assert.match(report.body.details,/falha ao carregar biblioteca/);
  assert.equal(h.workers.length,2);assert.equal(h.ai.task,null);assert.equal(h.intervals.size,0);
});
