'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {createSearch,clean,options,result}=require('../catalog-search');
const song=(name='Killer Queen',artist='Queen',extra={})=>({name,artist,md5:'a'.repeat(32),song_length:180000,diff_guitar:5,groupId:123,...extra});
test('preserva a versão ao vivo e usa filtros/páginas na chave do cache',async()=>{
  assert.equal(clean('Queen - Killer Queen (Live at Wembley) [Official Video].mp3'),'Queen - Killer Queen (Live at Wembley)');
  const calls=[],search=createSearch({fetchImpl:async(url,init)=>{calls.push({url,body:JSON.parse(init.body)});return new Response(JSON.stringify({found:80,data:[song()]}));}});
  const first=await search('Queen',{instrument:'guitarra',difficulty:'expert'});assert.equal(first.hasMore,true);assert.equal(first.pageSize,25);
  await search('Queen',{instrument:'guitarra',difficulty:'expert'});assert.equal(calls.length,1);
  await search('Queen',{instrument:'bateria',difficulty:'expert',page:2});assert.equal(calls.length,2);assert.equal(calls[1].body.instrument,'drums');assert.equal(calls[1].body.page,2);
  assert.equal(options({page:101}).page,101);assert.throws(()=>options({page:0}));assert.throws(()=>options({page:10001}));assert.throws(()=>options({instrument:'https://example.org'}));assert.throws(()=>options({difficulty:'impossible'}));
});
test('artista e título separados usam a busca avançada; dificuldade vem das notas, sem adivinhar pelo nível',async()=>{
  let request;
  const search=createSearch({fetchImpl:async(url,init)=>{request={url,body:JSON.parse(init.body)};return new Response(JSON.stringify({found:1,data:[song('Águas de Março','Elis Regina',{diff_bass:2,notesData:{noteCounts:[{instrument:'guitar',difficulty:'expert',count:400},{instrument:'guitar',difficulty:'easy',count:100}],hasVocals:true}})]}));}});
  const found=await search('Aguas de Marco',{artist:'Elis Regina',title:'Aguas de Marco',sort:'length'});
  assert.match(request.url,/search\/advanced$/);assert.equal(request.body.artist.value,'Elis Regina');assert.equal(request.body.name.value,'Aguas de Marco');assert.deepEqual(request.body.sort,{type:'length',direction:'asc'});
  assert.deepEqual(found.results[0].availability.guitarra,['easy','expert']);assert.deepEqual(found.results[0].instruments,['guitarra','vocal']);assert.equal(found.results[0].match,'probable');
  const live=result(song('Killer Queen (Live)'), 'Queen - Killer Queen',options());assert.equal(live.match,'similar');
  assert.notEqual(live.group,result(song(),'Queen - Killer Queen',options()).group);
  assert.equal(result(song('Killer Queen','Queen',{groupId:999}), 'Queen',options()).group,result(song(),'Queen',options()).group);
  assert.equal(result(song(), 'Another Song',options()).match,'similar');assert.equal(result(song(),'Queen',options()).match,'artist');
});
test('ordena títulos aproximados sem anunciar correspondência exata para erro de digitação',async()=>{
  const search=createSearch({fetchImpl:async()=>new Response(JSON.stringify({found:2,data:[song('Another Song'),song('Bohemian Rhapsody')]}))});
  const found=await search('Bohemain Rapsody');assert.equal(found.results[0].name,'Bohemian Rhapsody');assert.equal(found.results[0].match,'similar');
});
test('página final vazia não é falha e erro de catálogo não vira música inexistente',async()=>{
  const search=createSearch({fetchImpl:async()=>new Response(JSON.stringify({found:25,data:[]}))});
  const end=await search('Queen',{page:2});assert.equal(end.status,'not_found');assert.equal(end.hasMore,false);
  assert.equal((await search('Queen')).status,'unavailable');
  const broken=createSearch({fetchImpl:async()=>{throw Error('offline');}});assert.equal((await broken('Queen')).status,'unavailable');
});
test('consultas iguais compartilham a requisição; limita concorrência e permite tentar novamente após falha',async()=>{
  let resolve,count=0;const search=createSearch({fetchImpl:()=>{count++;return new Promise(r=>{resolve=r;});}});
  const a=search('Queen'),b=search('Queen');assert.equal(count,1);resolve(new Response(JSON.stringify({found:1,data:[song()]})));assert.deepEqual(await a,await b);
  let releases=[];const busy=createSearch({fetchImpl:()=>new Promise(r=>releases.push(r))});
  const one=busy('One'),two=busy('Two');assert.equal((await busy('Three')).status,'unavailable');for(const release of releases)release(new Response('{}'));await Promise.all([one,two]);
  const again=busy('Three');releases.at(-1)(new Response(JSON.stringify({found:0,data:[]})));assert.equal((await again).status,'not_found');
});
test('rota autenticada encaminha filtros e rejeita página inválida sem acessar o catálogo',async t=>{
  const http=require('node:http');let received;
  const room={code:'search-filters',members:new Set([{id:'a',uploadToken:'token'}]),playlist:[]};
  const music=require('../music-service')({rooms:new Map([[room.code,room]]),broadcast(){},catalogProvider:{search:async(q,raw)=>{const parsed=options(raw);received={q,...parsed};return{status:'not_found',results:[]};}}});
  const server=http.createServer((req,res)=>music.handle(req,res,new URL(req.url,'http://localhost')));
  await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
  const request=(params,token='token')=>fetch('http://127.0.0.1:'+server.address().port+'/api/charts/search?room='+room.code+'&q=Queen&'+params,{headers:{'X-Jam-Token':token}});
  assert.equal((await request('page=2&instrument=bateria&difficulty=easy&artist=Queen&title=Killer&sort=length')).status,200);
  assert.deepEqual(received,{q:'Queen',page:2,instrument:'bateria',difficulty:'easy',artist:'Queen',title:'Killer',sort:'length'});
  assert.equal((await request('page=0')).status,400);assert.equal((await request('page=2','invalid')).status,403);
});
