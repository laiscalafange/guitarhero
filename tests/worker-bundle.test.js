'use strict';
// Os modelos são simulados; o empacotamento e as regras de detecção são reais.
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),vm=require('node:vm');
const stubs={
  'onnxruntime-web/wasm':`export const env={wasm:{}};export const InferenceSession={create:async()=>({release:async()=>{}})};`,
  '@tensorflow/tfjs':`export async function setBackend(){};export async function ready(){};export function tensor3d(){throw Error('Este teste só prepara bateria');};export function engine(){return{startScope(){},endScope(){}};};`,
  '@tensorflow/tfjs-backend-wasm':`export function setWasmPaths(){};export function setThreadsCount(){};`,
  '@spotify/basic-pitch':`export class BasicPitch{constructor(){this.model=Promise.resolve({dispose(){}});}};export function outputToNotesPoly(){};export function noteFramesToTime(){};`,
  './demucs/config.mjs':`export const ModelConfig={fromSession:()=>({})};`,
  './demucs/separator.mjs':`export class Separator{async separate(mix,total,sink,progress){const block=new Float32Array(total*12);block.set(mix.subarray(0,total*2));await sink(0,total,block);progress(1,1);}}`
};
for(const gpu of [false,true])test('worker '+(gpu?'GPU':'CPU')+' empacotado detecta bateria sem JamCharts global preexistente',async()=>{
  const {build}=require('esbuild');
  const result=await build({entryPoints:[path.join(__dirname,'../src/ai-worker.js')],bundle:true,format:'iife',platform:'browser',write:false,minify:true,define:{JAM_GPU:String(gpu)},plugins:[{name:'model-fixtures',setup(b){
    b.onResolve({filter:/.*/},args=>Object.hasOwn(stubs,args.path)?{path:args.path,namespace:'fixture'}:undefined);
    b.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:stubs[args.path],loader:'js'}));
  }}]});
  const messages=[],errors=[];
  const context=vm.createContext({navigator:{hardwareConcurrency:4},performance,setTimeout,console:{error:(...items)=>errors.push(items.join(' '))},caches:{open:async()=>({match:async()=>({arrayBuffer:async()=>new ArrayBuffer(8)})})},postMessage:message=>messages.push(message)});
  vm.runInContext('globalThis.self=globalThis',context);
  assert.equal(context.JamCharts,undefined);
  vm.runInContext(result.outputFiles[0].text,context);
  const n=44100*2,left=new Float32Array(n),right=new Float32Array(n);
  for(let beat=0;beat<4;beat++)for(let j=0;j<8820;j++){
    const i=Math.floor((.1+beat*.5)*44100)+j;
    left[i]=right[i]=.6*Math.sin(2*Math.PI*80*j/44100)*Math.exp(-j/4000);
  }
  await context.onmessage({data:{type:'analyze',left,right}});
  assert.equal(messages.find(m=>m.type==='error'),undefined,JSON.stringify({messages,errors}));
  const done=messages.find(m=>m.type==='done');assert.ok(done,'O worker precisa concluir a preparação.');
  assert.deepEqual(Array.from(done.manifest.instruments),['bateria']);assert.ok(done.manifest.events.bateria.length>=3);
  assert.ok(messages.some(m=>m.type==='stem'&&m.key==='bateria'));
});
