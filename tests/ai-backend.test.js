'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/ai-worker.js'),'utf8');
const separate=source.slice(source.indexOf('async function separate('),source.indexOf('async function separateWithSession('));
test('GPU opcional: erro durante inferência libera a sessão e tenta CPU, sem baixar o modelo de novo',async()=>{
  const providers=[],released=[];let downloads=0;
  const env={wasm:{}};
  const context={GPU_BUILD:true,self:{crossOriginIsolated:true},navigator:{hardwareConcurrency:8,gpu:{requestAdapter:async()=>({})}},progress(){},modelData:async()=>{downloads++;return new Uint8Array(2);},ort:{env,InferenceSession:{create:async(_,options)=>{providers.push(options.executionProviders);return{provider:options.executionProviders[0],release:async()=>released.push(options.executionProviders[0])};}}},separateWithSession:async session=>{if(session.provider==='webgpu')throw Error('Operador indisponível na GPU');return'CPU pronta';}};
  const run=vm.runInNewContext(separate+';separate',context);assert.equal(await run([],[]),'CPU pronta');
  assert.deepEqual(Array.from(providers,p=>Array.from(p)),[['webgpu','wasm'],['wasm']]);
  assert.deepEqual(released,['webgpu','wasm']);assert.equal(downloads,1);assert.equal(env.wasm.numThreads,4);
});
test('sem suporte a GPU ou isolamento, a preparação usa CPU com uma thread',async()=>{
  let provider;
  const context={GPU_BUILD:true,self:{crossOriginIsolated:false},navigator:{hardwareConcurrency:8},progress(){},modelData:async()=>new Uint8Array(2),ort:{env:{wasm:{}},InferenceSession:{create:async(_,options)=>{provider=options.executionProviders[0];return{release:async()=>{}};}}},separateWithSession:async()=>true};
  const run=vm.runInNewContext(separate+';separate',context);assert.equal(await run([],[]),true);
  assert.equal(provider,'wasm');assert.equal(context.ort.env.wasm.numThreads,1);
});
