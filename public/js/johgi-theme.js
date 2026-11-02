/* Apresentação local da Johgi (ID de rede preservado: gio). */
(function(){
  'use strict';
  const original=window.JamTheme,stage=window.JamJohgiStage;
  if(!original||!stage)return;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const assets={};let selected=false;
  const mast=document.createElement('section');mast.id='johgiRoomMast';mast.setAttribute('aria-label','Tema Johgi');
  mast.innerHTML='<div class="johgi-mast-portrait" aria-hidden="true"></div><div class="johgi-mast-copy"><span class="johgi-kicker">LADO SOL / SESSÃO TROPICAL</span><h2>Johgi<span aria-hidden="true">✳</span></h2><p>Gelo, limão e uma boa música.</p></div><div class="johgi-mast-stamp" aria-hidden="true"><span>AO VIVO</span><strong>ATÉ O<br>ÚLTIMO SOL</strong><i>♪</i></div>';
  document.querySelector('#lobby').before(mast);
  function setCharacter(id){
    original.setCharacter(id);
    selected=id==='gio';document.body.classList.toggle('theme-johgi',selected);
    if(selected&&!assets.beach){const image=new Image();image.src='/assets/johgi/sunset-beach.jpg';assets.beach=image;}
  }
  // Delega integralmente ao tema existente quando a Johgi não está selecionada.
  // Os mesmos dados de desenho são encaminhados sem alterar jogador, notas ou relógio.
  const api={get active(){return selected||original.active;},setCharacter,
    backdrop:(...args)=>selected?stage.backdrop(...args.slice(0,4),assets,motion.matches):original.backdrop(...args),
    gem:(...args)=>selected?stage.gem(...args):original.gem(...args)};
  for(const name of ['highway','rails','note','sustain','receptor','hud','judgement','player','particle']){
    api[name]=(...args)=>selected?stage[name](...args,motion.matches):original[name](...args);
  }
  window.JamTheme=api;
})();
