/* Tema local e reversível. Não altera a presença, os instrumentos ou a música. */
(function(){
  'use strict';
  const $=selector=>document.querySelector(selector),base='/assets/chapola/',assets={},motion=matchMedia('(prefers-reduced-motion: reduce)');
  let active=false,haunting=true;
  let hauntAssetsRequested=false;
  const hauntAssets={};
  function prepareEyes(image,profile){
    const area=profile.crop,sw=image.naturalWidth*area[2],sh=image.naturalHeight*area[3],scale=Math.min(1,512/Math.max(sw,sh));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(sw*scale));canvas.height=Math.max(1,Math.round(sh*scale));const g=canvas.getContext('2d');
    // Corrige o ponto de preto antes do ganho para não clarear o fundo junto dos olhos.
    // Os canais escuros viram preto; as cores dos olhos, inclusive o vermelho, permanecem.
    g.filter='contrast(1.3) brightness('+profile.brightness+') contrast('+profile.contrast+')';
    g.drawImage(image,image.naturalWidth*area[0],image.naturalHeight*area[1],sw,sh,0,0,canvas.width,canvas.height);g.filter='none';
    // Máscara de apresentação em memória: os arquivos originais ficam intactos.
    g.globalCompositeOperation='destination-in';g.save();g.translate(canvas.width/2,canvas.height/2);g.scale(canvas.width*.6,canvas.height*.75);
    const mask=g.createRadialGradient(0,0,.25,0,0,1);mask.addColorStop(0,'#fff');mask.addColorStop(.68,'#fff');mask.addColorStop(.88,'rgba(255,255,255,.45)');mask.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=mask;g.fillRect(-2,-2,4,4);g.restore();
    return canvas;
  }
  function loadHauntAssets(){
    if(hauntAssetsRequested||!active||!haunting||motion.matches)return;hauntAssetsRequested=true;
    for(const profile of window.JamChapolaHaunting.eyeAssets){
      const image=new Image();image.onload=()=>{hauntAssets[profile.key]=prepareEyes(image,profile);};image.src=base+profile.file;
    }
  }
  try{haunting=localStorage.getItem('chapola-haunting-v1')!=='off';}catch{}
  const visualOptions=document.createElement('fieldset');visualOptions.className='room-settings-group chapola-stage-option';
  visualOptions.innerHTML='<legend>Visual do Chapola</legend><label class="chapola-haunt-label"><input id="chapolaHauntingEnabled" type="checkbox"> Olhos no breu</label><p class="room-settings-description">O pub apaga; os olhos aparecem no escuro e somem antes de a luz voltar.</p>';
  $('#roomSettings .settings').append(visualOptions);$('#chapolaHauntingEnabled').checked=haunting;
  $('#chapolaHauntingEnabled').addEventListener('change',()=>{haunting=$('#chapolaHauntingEnabled').checked;loadHauntAssets();try{localStorage.setItem('chapola-haunting-v1',haunting?'on':'off');}catch{}});
  motion.addEventListener?.('change',loadHauntAssets);
  const atmosphere=document.createElement('div');atmosphere.id='chapolaAtmosphere';atmosphere.setAttribute('aria-hidden','true');atmosphere.innerHTML='<span class="chapola-wall-poster poster-vortex"></span><span class="chapola-wall-poster poster-skull"></span><span class="chapola-watch"></span>';document.body.prepend(atmosphere);
  const mast=document.createElement('section');mast.id='chapolaRoomMast';mast.setAttribute('aria-label','Tema Chapola');mast.innerHTML='<div class="chapola-mast-portrait" aria-hidden="true"></div><div class="chapola-mast-copy"><span class="chapola-issue">LADO B / EDIÇÃO 01</span><h2>Chapola</h2><p>A noite tem olhos.</p></div><button type="button" class="chapola-secret-button" id="chapolaSecretButton" aria-label="Examinar o símbolo do Chapola" aria-haspopup="dialog"><span aria-hidden="true">B</span><small>olhe de novo</small></button>';$('#lobby').before(mast);
  const secret=document.createElement('dialog');secret.id='chapolaSecret';secret.className='chapola-secret';secret.setAttribute('aria-labelledby','chapolaSecretTitle');
  const references=[['watching.jpg','Olhos na escuridão'],['three-eyes.jpg','Três olhos em vermelho'],['candles.jpg','Velas na penumbra'],['skull-eyes.png','O olhar da caveira'],['vortex.jpg','Retrato no vórtice'],['teeth.jpg','Sorriso em preto e branco'],['red-mask.jpg','Máscara vermelha'],['phantom.jpg','Rosto fantasmagórico'],['velvet-pub.jpg','Pub de veludo vermelho'],['skull-mark.jpg','Símbolo de caveira'],['red-portrait.jpg','Retrato iluminado em vermelho'],['eyes.jpg','Olhos no preto']];
  secret.innerHTML='<button type="button" class="chapola-secret-close" id="closeChapolaSecret" aria-label="Fechar segredo">✕</button><span class="chapola-issue">O OUTRO LADO DO ESPELHO</span><h2 id="chapolaSecretTitle">Você também olha de volta.</h2><p class="chapola-secret-note">B no peito. A noite nos olhos.</p><div class="chapola-reference-grid">'+references.map(([file,alt])=>'<img data-src="'+base+file+'" alt="'+alt+'" loading="lazy">').join('')+'</div><img class="chapola-crystal-motion" data-src="'+base+'crystal-castles.gif" alt="Crystal Castles" loading="lazy"><p class="chapola-crystal-still">CRYSTAL CASTLES</p>';
  $('#setup').append(secret);
  $('#chapolaSecretButton').addEventListener('click',()=>{for(const image of secret.querySelectorAll('[data-src]')){image.src=image.dataset.src;image.removeAttribute('data-src');}secret.showModal();});
  $('#closeChapolaSecret').addEventListener('click',()=>secret.close());
  function setCharacter(id){
    active=id==='chapola';document.body.classList.toggle('theme-chapola',active);
    if(!active){if(secret.open)secret.close();return;}
    if(!$('#chapolaFonts')){const link=document.createElement('link');link.id='chapolaFonts';link.rel='stylesheet';link.href='https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800&family=Pirata+One&display=swap';document.head.append(link);}
    if(!assets.pub){for(const [key,file]of [['pub','pub-night.png'],['eyes','eyes.jpg']]){const image=new Image();image.src=base+file;assets[key]=image;}}
    loadHauntAssets();
  }
  window.JamTheme={get active(){return active;},setCharacter,
    backdrop:(g,W,H,tv,scene={})=>{
      window.JamChapolaRenderer.backdrop(g,W,H,tv,assets,motion.matches);
      window.JamChapolaHaunting.draw(g,W,H,tv,scene.duration,scene.player,{enabled:haunting,reduced:motion.matches,assets:hauntAssets,room:assets.pub});
    },
    gem:(g,x,y,r,color)=>window.JamChapolaRenderer.gem(g,x,y,r,color),
    highway:(g,P,tv,min)=>window.JamChapolaStage.highway(g,P,tv,min,motion.matches),
    rails:(g,P,tv,min)=>window.JamChapolaStage.rails(g,P,tv,min,motion.matches),
    note:(g,P,lane,x,y,s,color)=>window.JamChapolaStage.note(g,P,lane,x,y,s,color),
    sustain:(g,data)=>window.JamChapolaStage.sustain(g,data,motion.matches),
    receptor:(g,P,lane,x,y,r,color,down,age)=>window.JamChapolaStage.receptor(g,P,lane,x,y,r,color,down,age,motion.matches),
    hud:(g,P,info)=>window.JamChapolaStage.hud(g,P,info),
    judgement:(g,P,data)=>window.JamChapolaStage.judgement(g,P,data,motion.matches),
    player:(g,P,tv)=>window.JamChapolaStage.player(g,P,tv,motion.matches),
    particle:(g,f)=>window.JamChapolaStage.particle(g,f,motion.matches)};
})();
