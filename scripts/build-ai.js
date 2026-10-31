'use strict';
const fs = require('node:fs');
const path = require('node:path');
async function main() {
  const options={entryPoints:['src/ai-worker.js'],bundle:true,format:'iife',platform:'browser',minify:true,legalComments:'eof'};
  await require('esbuild').build({...options,entryPoints:['src/chart-import.mjs'],outfile:'public/chart-import.js'});
  await require('esbuild').build({...options,outfile:'public/ai-worker.js',define:{JAM_GPU:'false'}});
  await require('esbuild').build({...options,outfile:'public/ai-worker-gpu.js',define:{JAM_GPU:'true'},alias:{'onnxruntime-web/wasm':'onnxruntime-web/webgpu'}});
  const files = {
    'node_modules/onnxruntime-web/dist': require('node:fs').readdirSync('node_modules/onnxruntime-web/dist').filter(n => /^ort-wasm-simd-threaded\.(jsep\.)?(wasm|mjs)$/.test(n)),
    'node_modules/@tensorflow/tfjs-backend-wasm/dist': ['tfjs-backend-wasm.wasm','tfjs-backend-wasm-simd.wasm','tfjs-backend-wasm-threaded-simd.wasm'],
    'node_modules/@spotify/basic-pitch/model': ['model.json','group1-shard1of1.bin']
  };
  for(const [dir,names]of Object.entries(files)) {
    const target = dir.includes('onnxruntime') ? 'public/vendor/ort-1.31.1' : dir.includes('tfjs') ? 'public/vendor/tf' : 'public/models/basic-pitch';
    fs.mkdirSync(target,{recursive:true}); for(const name of names)fs.copyFileSync(path.join(dir,name),path.join(target,name));
  }
  console.log('IA preparada: worker e bibliotecas estáticas. O Render não executará os modelos.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
