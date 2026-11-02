'use strict';
// Consultas limitadas e download somente do CDN autorizado.
const {clean,createSearch}=require('./catalog-search');
const search=createSearch();
async function download(id,{noVideo=false,signal}={}){
  if(!/^[a-f0-9]{32}$/.test(id))throw Error('Identificador de pacote inválido.');
  let response=await fetch('https://files.enchor.us/'+id+(noVideo?'_novideo':'')+'.sng',{redirect:'error',signal});
  if(noVideo&&response.status===404){await response.body?.cancel();response=await fetch('https://files.enchor.us/'+id+'.sng',{redirect:'error',signal});}
  if(!response.ok||!response.body||/text\/html|application\/json/i.test(response.headers.get('content-type')||'')){await response.body?.cancel();throw Error('Este pacote não está disponível para download direto agora. Tente outra versão.');}
  if(Number(response.headers.get('content-length'))>100*1024*1024){await response.body.cancel();throw Error('O pacote ultrapassa 100 MB. Escolha uma versão menor.');}
  return response;
}
module.exports={search,clean,download};
