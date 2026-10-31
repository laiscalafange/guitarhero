'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http');
test('download autenticado limita concorrência, rejeita URLs e libera a vaga após falha',async t=>{
  const room={code:'download-test',members:new Set([{id:'a',uploadToken:'token'}]),playlist:[]};let release,calls=0,fail=false;
  const service=require('../music-service')({rooms:new Map([[room.code,room]]),broadcast(){},catalogProvider:{async download(){calls++;if(fail)throw Error('Pacote ausente');if(calls===1)await new Promise(r=>{release=r;});return new Response('SNG de teste',{headers:{'Content-Length':'12'}});}}});
  const server=http.createServer((req,res)=>service.handle(req,res,new URL(req.url,'http://localhost')));await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
  const req=(id,token='token')=>fetch('http://127.0.0.1:'+server.address().port+'/api/charts/package?room='+room.code+'&id='+encodeURIComponent(id),{headers:{'X-Jam-Token':token}});
  assert.equal((await req('https://localhost/private')).status,400);assert.equal((await req('a'.repeat(32),'bad')).status,403);assert.equal(calls,0);
  const first=req('a'.repeat(32));while(!release)await new Promise(r=>setTimeout(r,5));assert.equal((await req('a'.repeat(32))).status,429);release();const response=await first;assert.equal(response.status,200);assert.equal(await response.text(),'SNG de teste');
  fail=true;assert.equal((await req('a'.repeat(32))).status,400);assert.equal(room.chartDownloading,false);fail=false;assert.equal(await(await req('a'.repeat(32))).text(),'SNG de teste');
});
