import * as ort from 'onnxruntime-web/wasm';
import * as tf from '@tensorflow/tfjs';
import { setWasmPaths,setThreadsCount } from '@tensorflow/tfjs-backend-wasm';
import { BasicPitch, outputToNotesPoly, noteFramesToTime } from '@spotify/basic-pitch';
import ChartEngine from '../public/chart-engine.js';
import {ModelConfig} from './demucs/config.mjs';
import {Separator} from './demucs/separator.mjs';

const MODEL_URL = 'https://huggingface.co/HRSadeghi/demucs-onnx/resolve/9128f6ee0f1b8e333b5b8d12613aefb3bebc249a/htdemucs_6s.onnx';
const SR = 44100, SEG = 343980, OVERLAP = 85995, STEP = SEG - OVERLAP;
const ROWS = { bateria: 0, baixo: 1, vocal: 3, guitarra: 4, teclado: 5 };
const GPU_BUILD=typeof JAM_GPU!=='undefined'&&JAM_GPU;
let stage='Iniciando';
let compatibilityMode=false;
const progress = (p, text) => {stage=text;postMessage({ type: 'progress', p, text });};
const wait = () => new Promise(r => setTimeout(r, 0));
function rms(x) { let sum = 0; for (const v of x) sum += v * v; return Math.sqrt(sum / Math.max(1, x.length)); }
async function modelData() {
  const cache = typeof caches!=='undefined' ? await caches.open('guitaband-models-v1').catch(() => null) : null;
  let response = cache && await cache.match(MODEL_URL);
  if (!response) {
    response = await fetch(MODEL_URL);
    if (!response.ok) throw Error('Não foi possível baixar o modelo de separação. Confira sua conexão.');
    if (cache) await cache.put(MODEL_URL, response.clone()).catch(() => {});
  }
  return new Uint8Array(await response.arrayBuffer());
}
async function separate(left, right) {
  ort.env.wasm.wasmPaths = '/vendor/ort-1.31.1/';
  // Até quatro núcleos, deixando capacidade para áudio e interface da partida.
  ort.env.wasm.numThreads = typeof compatibilityMode!=='undefined'&&compatibilityMode ? 1 : self.crossOriginIsolated ? Math.min(4,Math.max(1,(navigator.hardwareConcurrency||2)-1)) : 1;
  progress(.01,'Carregando o modelo econômico (110 MB no primeiro uso)…');
  const data=await modelData();
  let useGPU=false;
  if(GPU_BUILD&&navigator.gpu)try{useGPU=!!(await navigator.gpu.requestAdapter());}catch{}
  const attempts=useGPU?[['webgpu','wasm'],['wasm']]:[['wasm']];
  for(let attempt=0;attempt<attempts.length;attempt++){
    const providers=attempts[attempt];
    progress(.025,providers[0]==='webgpu'?'Testando aceleração por GPU…':'Separação com FFT otimizada · até '+ort.env.wasm.numThreads+' núcleos…');
    let session;
    try{
      session=await ort.InferenceSession.create(data,{executionProviders:providers,graphOptimizationLevel:'all',enableCpuMemArena:true,enableMemPattern:true});
      return await separateWithSession(session,left,right,providers[0]);
    }catch(error){
      // O worker comum continua disponível se o aparelho não aceitar WebGPU.
      if(attempt===attempts.length-1)throw error;
      progress(.025,'GPU indisponível para este modelo. Continuando pela CPU…');
    }finally{await session?.release();}
  }
}
async function separateWithSession(session,left,right,device) {
  const config=ModelConfig.fromSession(session,{sidecar:{name:'htdemucs_6s',sources:['drums','bass','other','vocals','guitar','piano'],samplerate:44100,audio_channels:2,segment_samples:343980,nfft:4096,hop:1024,freq_bins:2048,frames:336,dynamic_batch:true}});
  const separator=new Separator({ort,session,config,device},{batch:1,overlap:.1,pipeline:false});
  const total=left.length,stems=Object.fromEntries(Object.keys(ROWS).map(k=>[k,new Float32Array(Math.ceil(total/2))]));
  const mix=new Float32Array(total*2);mix.set(left);mix.set(right,total);
  const started=performance.now();
  await separator.separate(mix,total,(offset,count,block)=>{
      for(const[key,row]of Object.entries(ROWS))for(let i=offset%2;i<count;i+=2){
        const j=Math.min(count-1,i+1);
        stems[key][(offset+i)/2]=(block[row*2*count+i]+block[(row*2+1)*count+i]+block[row*2*count+j]+block[(row*2+1)*count+j])*.25;
      }
    },(done,totalChunks)=>{
      const elapsed=(performance.now()-started)/1000,remaining=Math.max(0,Math.round(elapsed/Math.max(1,done)*(totalChunks-done)));
      progress(.04+.60*done/totalChunks,'Separando: '+done+'/'+totalChunks+' trechos'+(remaining>0?' · cerca de '+Math.ceil(remaining/60)+' min restantes':'')+'…');
    });
  return stems;
}
function drumEvents(x) {
  const n = 1024, hop = 128, sr = 22050, bands = [[35,150],[180,3200],[5000,10000]];
  const frames = Math.ceil(x.length / hop), energies = bands.map(() => new Float32Array(frames));
  // Filtros Goertzel em frequências de referência: cada ataque vem só da faixa de bateria isolada.
  const probes = [[55,80,110],[200,700,1800,3000],[5500,7500,9500]];
  const window=Float64Array.from({length:n},(_,j)=>.5-.5*Math.cos(2*Math.PI*j/(n-1)));
  const coefficients=probes.map(band=>band.map(hz=>2*Math.cos(2*Math.PI*hz/sr)));
  for (let frame = 0; frame < frames; frame++) {
    const offset = frame * hop;
    for (let band = 0; band < 3; band++) {
      let power = 0;
      for (const coeff of coefficients[band]) {
        let a = 0, b = 0;
        for (let j = 0; j < n && offset + j < x.length; j++) { const v = x[offset + j] * window[j] + coeff * a - b; b = a; a = v; }
        power += Math.max(0, a * a + b * b - coeff * a * b);
      }
      energies[band][frame] = Math.sqrt(power) / n;
    }
  }
  const events = [];
  energies.forEach((energy, lane) => {
    const novelty = energy.map((v, i) => Math.max(0, v - (energy[i - 1] || 0)));
    const sorted = Array.from(novelty).sort((a,b)=>a-b), floor = sorted[Math.floor(sorted.length * .94)] * .3;
    let last = -1;
    for (let i = 2; i < frames - 2; i++) {
      let local = 0; for (let k = Math.max(0, i-20); k < Math.min(frames, i+21); k++) local += novelty[k];
      local /= Math.min(frames, i+21)-Math.max(0, i-20);
      if (novelty[i] < Math.max(floor, local * 1.7, .00004) || novelty[i] < novelty[i-1] || novelty[i] <= novelty[i+1] || (i-last)*hop/sr < .065) continue;
      // Refina o primeiro ataque pela energia em blocos curtos, sem empurrar para uma grade de BPM.
      let first = Math.max(0, i*hop - 256), max = 0;
      for (let s = first; s < Math.min(x.length-32, i*hop+512); s += 32) { let p=0; for(let j=0;j<32;j++)p+=x[s+j]*x[s+j]; if(p>max){max=p;first=s;} }
      events.push({ t: +(first/sr).toFixed(4), lane: lane === 2 && energy[i+12] > energy[i]*.55 ? 3 : lane, pitch: 36+lane, dur: 0, s: Math.min(1, novelty[i]/Math.max(floor*5,.0001)) }); last=i;
    }
  });
  return events.sort((a,b)=>a.t-b.t);
}
async function tonalEvents(basic, x) {
  // Enquadramento equivalente ao Basic Pitch, sem tf.signal.frame/padding intermediário.
  // Reduz cópias e evita Fill sem dtype no backend WASM do TensorFlow 3.
  basic.prepareData = async samples => {
    const window=43844,hop=36164,pad=3840,count=Math.ceil((samples.length+pad)/hop);
    const framed=new Float32Array(count*window);
    for(let frame=0;frame<count;frame++){
      const start=frame*hop-pad,from=Math.max(0,start),end=Math.min(samples.length,start+window);
      if(end>from)framed.set(samples.subarray(from,end),frame*window+from-start);
    }
    return [tf.tensor3d(framed,[count,window,1],'float32'),samples.length];
  };
  const events = [], SR = 22050, length = 20 * SR, overlap = SR;
  for (let start = 0; start < x.length; start += length - overlap) {
    const sample = x.slice(start, Math.min(x.length, start + length));
    if (rms(sample) < .0006) continue;
    let frames = [], onsets = [];
    tf.engine().startScope();
    try {
      await basic.evaluateModel(sample, (f,o) => { frames.push(...f); onsets.push(...o); }, () => {});
      const notes = noteFramesToTime(outputToNotesPoly(frames, onsets, .45, .30, 6));
      for (const note of notes) {
        const local = note.startTimeSeconds;
        if (local < 0 || (start > 0 && local < .5) || (start + length < x.length && local >= 19.5)) continue;
        const t = start / SR + local;
        events.push({ t: +t.toFixed(4), pitch: note.pitchMidi, dur: +note.durationSeconds.toFixed(4), s: +note.amplitude.toFixed(4) });
      }
    } finally { tf.engine().endScope(); }
    await wait();
  }
  return events;
}
function activity(x, referenceRms) {
  let seconds = 0;
  for (let i = 0; i < x.length; i += 2205) if (rms(x.subarray(i, i+2205)) > Math.max(.001, referenceRms*.08)) seconds += .1;
  return seconds;
}
function wav(x, sr = 22050) {
  // PCM mono de 8 bits: metade do tráfego das faixas anteriores, mesmos timestamps.
  const buf=new ArrayBuffer(44+x.length),v=new DataView(buf);
  const text=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
  text(0,'RIFF');v.setUint32(4,36+x.length,true);text(8,'WAVE');text(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sr,true);v.setUint32(28,sr,true);v.setUint16(32,1,true);v.setUint16(34,8,true);text(36,'data');v.setUint32(40,x.length,true);
  for(let i=0;i<x.length;i++)v.setUint8(44+i,Math.max(0,Math.min(255,Math.round(Math.max(-1,Math.min(1,x[i]))*128+128))));
  return buf;
}
self.onmessage = async ({ data }) => {
  if (data.type !== 'analyze') return;
  compatibilityMode=!!data.compatibility;
  try {
    const started=performance.now();
    const { left, right } = data, duration = left.length / SR, reference = (rms(left)+rms(right))*.5;
    const stems = await separate(left, right), events = {}, detection = {};
    progress(.66,'Carregando a IA que reconhece notas e sustentações…');
    setWasmPaths('/vendor/tf/');
    setThreadsCount(compatibilityMode?1:Math.min(2,Math.max(1,(navigator.hardwareConcurrency||2)-1)));
    await tf.setBackend('wasm'); await tf.ready();
    const basic = new BasicPitch('/models/basic-pitch/model.json'); await basic.model;
    try {
      const keys = Object.keys(ROWS);
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i], x = stems[key], ratio = rms(x)/Math.max(reference,1e-8), activeSeconds = activity(x,reference);
        progress(.67+i*.06,'Reconhecendo as notas: '+key+'…');
        events[key] = ratio < .035 ? [] : key === 'bateria' ? drumEvents(x) : await tonalEvents(basic,x);
        detection[key] = { detected: ChartEngine.detect({ratio,activeSeconds,eventCount:events[key].length,instrument:key}), ratio:+ratio.toFixed(4), activeSeconds:+activeSeconds.toFixed(1), eventCount:events[key].length };
      }
    } finally { (await basic.model).dispose(); }
    const instruments = Object.keys(detection).filter(k=>detection[k].detected);
    if (!instruments.length) throw Error('A IA não encontrou notas suficientes. Experimente outro áudio.');
    const manifest = { version:1, engine:'Demucs 6s econômico + Basic Pitch', duration, instruments, detection, events, timing:{seconds:+((performance.now()-started)/1000).toFixed(2)}, audioFormat:'pcm8-mono-22050' };
    // Os WAVs têm começo e duração idênticos ao original. Só as faixas jogáveis são enviadas.
    for (const key of instruments) { const bytes=wav(stems[key]); postMessage({ type:'stem', key, bytes },[bytes]); }
    postMessage({type:'done',manifest});
  } catch (error) { console.error('AI worker:',error); postMessage({type:'error',message:stage+': '+(error.message || String(error))}); }
};
