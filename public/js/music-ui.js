/* Apresentação da área de músicas. Rede, áudio e análise continuam no jogo. */
(function(){
  'use strict';
  const $=selector=>document.querySelector(selector),root=$('#musicRoom');
  if(!root)return;
  const sources={
    demo:['Um ensaio para começar','Músicas de exemplo já prontas, sem download nem análise.'],
    file:['Seu arquivo, o som da banda','Envie um áudio do aparelho. Ele entra na fila de preparação da sala.'],
    youtube:['Encontre uma música no YouTube','Pesquise por nome, artista ou link e importe o áudio para a fila.'],
    charts:['Áudio e notas que já vêm juntos','Busque uma partitura pronta ou importe um pacote do computador.']
  };
  const origins={demo:'Exemplo pronto',chart:'Partitura pronta',youtube:'YouTube',file:'Arquivo de áudio'};
  const statuses={running:'Em análise',queued:'Na fila de análise',error:'Preparação falhou',importing:'Importando',idle:'Em preparação'};
  function setSource(source){
    const copy=sources[source];if(!copy)return;
    $('#musicSourceTitle').textContent=copy[0];$('#musicSourceHint').textContent=copy[1];
    root.querySelectorAll('[role="tab"]').forEach(tab=>tab.tabIndex=tab.dataset.tab===source?0:-1);
  }
  function duration(value){if(!Number.isFinite(value)||value<=0)return '';const seconds=Math.floor(value);return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');}
  let previousInstruments='';
  function updateCurrent(song){
    const present=!!song.title,ready=present&&song.ready,state=!present?'empty':ready?'ready':song.state==='error'?'error':'pending';
    $('.music-current').dataset.state=state;
    $('#musicCurrentTitle').textContent=song.title||'Escolha uma música';
    $('#musicCurrentMeta').textContent=present?[origins[song.source]||origins.file,duration(song.duration)].filter(Boolean).join(' · '):'Use um exemplo ou adicione uma música à sala.';
    $('#musicCurrentStatus').textContent=!present?'Nenhuma selecionada':ready?'Pronta para tocar':statuses[song.state]||'Em preparação';
    $('#musicCurrentHint').textContent=!present?'As músicas prontas podem ser escolhidas na playlist.':ready?'Escolha seu instrumento abaixo e marque quando estiver pronto.':state==='error'?'Veja o motivo da falha na fila e tente novamente.':'Acompanhe a preparação na fila. Você pode escolher outra música pronta.';
    const instruments=ready?(song.instruments||[]):[],key=JSON.stringify(instruments);
    if(key!==previousInstruments){
      previousInstruments=key;const tags=$('#musicCurrentInstruments');tags.replaceChildren();
      for(const name of instruments){const tag=document.createElement('span');tag.textContent=name;tags.append(tag);}
    }
  }
  root.querySelector('[role="tablist"]').addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    const tabs=[...root.querySelectorAll('[role="tab"]')],index=tabs.indexOf(event.target);if(index<0)return;
    event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
    tabs[next].focus();tabs[next].click();
  });
  root.querySelectorAll('label[for="chartFiles"],label[for="chartFolder"]').forEach(label=>label.addEventListener('keydown',event=>{
    if(event.key==='Enter'||event.key===' '){event.preventDefault();document.getElementById(label.htmlFor).click();}
  }));
  window.JamMusicUI={setSource,updateCurrent};setSource('demo');
})();
