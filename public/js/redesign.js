/* Jam na Garagem: camada de apresentação, sem substituir os controladores do jogo. */
(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const setup = $('#setup'), mast = $('.mast'), room = $('#roomPanel'), lobby = $('#lobby');
  if (!setup || !mast || !room || !lobby) return;
  document.body.classList.add('jam-redesign');
  const home = document.createElement('section');
  home.className = 'jam-home';
  home.innerHTML = `<div class="jam-sky" aria-hidden="true"><span class="jam-moon"></span><span class="jam-buildings"></span></div><div class="jam-garage" aria-hidden="true"><div class="jam-roof"></div><div class="jam-door"><span>♫</span><span>⚡</span></div><div class="jam-amp"></div></div><div class="jam-hero-content"><div class="jam-kicker">ONLINE · ATÉ 8 JOGADORES</div><h1>JAM NA <em>GARAGEM</em></h1><p>Monte sua banda. Escolha a música. Toque com seus amigos.</p><button type="button" class="jam-primary jam-start" id="jamStart">▶ START</button></div><button type="button" class="jam-credits" id="jamCredits">Créditos</button><div class="jam-credits-text" id="jamCreditsText" hidden>Jam na Garagem — jogo desenvolvido pela equipe do projeto. Créditos das bibliotecas e licenças disponíveis em THIRD-PARTY-NOTICES.md.</div>`;
  setup.prepend(home);
  mast.hidden = true;
  room.classList.add('jam-entry');
  room.hidden = true;
  const closeEntry = document.createElement('button');
  closeEntry.type = 'button'; closeEntry.className = 'jam-close'; closeEntry.textContent = '×'; closeEntry.setAttribute('aria-label', 'Fechar entrada');
  room.prepend(closeEntry);
  const showEntry = () => { room.hidden = false; home.hidden = true; $('#nick')?.focus(); };
  const closeEntryModal = () => { if (!lobby.hidden) return; room.hidden = true; home.hidden = false; $('#jamStart')?.focus(); };
  $('#jamStart').addEventListener('click', showEntry);
  closeEntry.addEventListener('click', closeEntryModal);
  $('#jamCredits').addEventListener('click', () => { const el = $('#jamCreditsText'); el.hidden = !el.hidden; });
  const nav = document.createElement('header');
  nav.className = 'jam-nav';
  nav.innerHTML = `<div class="jam-brand">JAM NA <b>GARAGEM</b></div><nav aria-label="Seções da sala"><button class="jam-nav-btn active" data-jam-view="band" aria-current="page">♬ Banda</button><button class="jam-nav-btn" data-jam-view="music">♫ Músicas</button><button class="jam-nav-btn" data-jam-view="queue">☷ Fila</button></nav><div class="jam-nav-tools"><button type="button" id="jamSettings" title="Configurações" aria-label="Abrir configurações">⚙</button><button type="button" id="jamAvatar" title="Avatar" aria-label="Escolher avatar"><span class="jam-avatar-fallback-icon" aria-hidden="true">👤</span></button></div>`;
  const views = document.createElement('div'); views.className = 'jam-views';
  const band = document.createElement('section'); band.className = 'jam-view'; band.id = 'jam-band';
  const music = document.createElement('section'); music.className = 'jam-view'; music.id = 'jam-music';
  const queue = document.createElement('section'); queue.className = 'jam-view'; queue.id = 'jam-queue';
  views.append(band, music, queue);
  lobby.prepend(nav, views);
  const musicPanel = $('#h-musica')?.closest('.panel');
  const settingsPanel = $('#h-ajustes')?.closest('.panel');
  const bandPanel = $('#h-banda')?.closest('.panel');
  const historyPanel = $('#historyTitle')?.closest('.panel');
  const startbar = $('.startbar');
  const library = $('.library');
  const backgroundPreparation = $('#backgroundPreparation');
  if (musicPanel) music.append(musicPanel);
  if (library) queue.append(library);
  if (backgroundPreparation) queue.append(backgroundPreparation);
  if (bandPanel) band.append(bandPanel);
  if (startbar) band.append(startbar);
  if (historyPanel) { historyPanel.classList.add('jam-history'); band.append(historyPanel); }
  const oldCol = lobby.querySelector(':scope > .col');
  // Não deixe blocos legados aparecendo abaixo das abas novas.
  if (oldCol) {
    const leftovers=[...oldCol.children];
    for(const child of leftovers) {
      if (child===settingsPanel) continue;
      if (!child.hidden && child.id==='musicPreparation') music.append(child);
    }
    if(!oldCol.children.length)oldCol.remove(); else oldCol.hidden=true;
  }
  const switchTo = (view) => {
    const selected = ['band','music','queue'].includes(view) ? view : 'band';
    for (const [name,node] of [['band',band],['music',music],['queue',queue]]) {
      const active = name === selected;
      node.hidden = !active;
      // Protege a navegação das regras CSS legadas com display:grid !important.
      node.style.setProperty('display',active ? (name === 'band' || name === 'queue' ? 'grid' : 'block') : 'none','important');
      node.setAttribute('aria-hidden',String(!active));
      if (!active) node.setAttribute('inert',''); else node.removeAttribute('inert');
    }
    nav.querySelectorAll('[data-jam-view]').forEach(b => {
      const active=b.dataset.jamView===selected;
      b.classList.toggle('active',active);
      b.setAttribute('aria-selected',String(active));
      if(active) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current');
    });
    // Impede que a rolagem da tela anterior aparente que as duas páginas são uma só.
    const prefersReduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const anchor=nav.getBoundingClientRect().top + window.scrollY - 8;
    if(window.scrollY>anchor+100) window.scrollTo({top:Math.max(0,anchor),behavior:prefersReduced?'instant':'smooth'});
  };
  nav.addEventListener('click',e=> { const b=e.target.closest('[data-jam-view]'); if(b) switchTo(b.dataset.jamView); });
  switchTo('band');
  function createModal(id,title) {
    const overlay=document.createElement('div'); overlay.className='jam-overlay'; overlay.id=id; overlay.hidden=true;
    overlay.innerHTML=`<div class="jam-dialog" role="dialog" aria-modal="true" aria-label="${title}"><header class="jam-dialog-head"><h2>${title}</h2><button type="button" class="jam-close" aria-label="Fechar">×</button></header><div class="jam-dialog-body"></div></div>`;
    setup.append(overlay);
    overlay.querySelector('.jam-close').addEventListener('click',()=>closeModal(overlay));
    overlay.addEventListener('click',e=>{if(e.target===overlay)closeModal(overlay);});
    return overlay;
  }
  let lastFocus = null;
  function openModal(m) { lastFocus=document.activeElement; m.hidden=false; m.querySelector('.jam-close')?.focus(); }
  function closeModal(m) {m.hidden=true; lastFocus?.focus?.();}
  const settings = createModal('jamSettingsModal','Configurações');
  const settingsBody=settings.querySelector('.jam-dialog-body');
  const tabs=document.createElement('div'); tabs.className='jam-setting-tabs';
  tabs.innerHTML='<button data-setting="game" class="active">Jogabilidade</button><button data-setting="audio">Áudio</button><button data-setting="room">Sala</button><button data-setting="visual">Visual</button>';
  const settingsContent=document.createElement('div'); settingsContent.className='jam-setting-content';
  settingsBody.append(tabs,settingsContent);
  if(settingsPanel)settingsContent.append(settingsPanel);
  const fields=Array.from(settingsPanel?.querySelectorAll('.field')||[]);
  const gameFields=[0,1,2,5],audioFields=[3,4];
  const roomInfo=document.createElement('div'); roomInfo.className='jam-info'; roomInfo.innerHTML='<h3>Sala compartilhada</h3><p>O anfitrião controla o início da partida. Qualquer participante pode adicionar músicas à playlist. Os ajustes de teclas, áudio e latência são individuais.</p><p>Copiar convite e trocar sala estão na aba Banda.</p>';
  const visualInfo=document.createElement('div');visualInfo.className='jam-info';visualInfo.innerHTML='<h3>Visual</h3><p>Estilo noturno rock/arcade ativo. As preferências gráficas avançadas serão adicionadas quando houver controles reais para elas.</p>';
  settingsContent.append(roomInfo,visualInfo);
  const settingView = (s) => { fields.forEach((f,i)=>{f.hidden= !(s==='game'?gameFields.includes(i):s==='audio'?audioFields.includes(i):false);}); if(settingsPanel)settingsPanel.hidden=!(s==='game'||s==='audio');roomInfo.hidden=s!=='room';visualInfo.hidden=s!=='visual';tabs.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.setting===s)); };
  tabs.addEventListener('click',e=>{const b=e.target.closest('[data-setting]');if(b)settingView(b.dataset.setting);}); settingView('game');
  $('#jamSettings').addEventListener('click',()=>openModal(settings));
  const avatar=createModal('jamAvatarModal','Escolher jogador');
  const avatarBody=avatar.querySelector('.jam-dialog-body');
  // Sete personagens oficiais e uma vaga reservada. Vana permanece com sua identidade visual.
  const profiles = [
    {name:'Vana',tag:'A praiana do grupo',bio:'Para Vana, não existe programa melhor do que uma praia no fim de semana, uma Coca-Cola geladinha com gelo e limão e boa música. Entre afrobeat, trap e forró eletrônico, ela sabe que a vida fica melhor com uma trilha sonora.',genre:'Afrobeat, rap, trap brasileiro e forró eletrônico',instruments:'Violão e bateria',artists:'Nanda Tsunami, Calcinha Preta e Puma PJL',color:'#d65a39',portrait:'/assets/avatars/vana-perfil.png',art:'/assets/avatars/vana.png',theme:{accent:'#d65a39',accent2:'#8b2b35',gold:'#f0bf74',border:'#e38b63',panel:'#532334',panel2:'#241428',panel3:'#150f1e',text:'#fde8d5',soft:'#ffc685',shadow:'#7f2c36',bio:'#321a26'}},
    {name:'Chapola',tag:'O playboy de condomínio',bio:'Gente boa, cheio de marra e presença frequente nas batalhas de rima da Zona Norte. Chapola tem estilo de sobra, um coração reservado para Bia e uma playlist que vai de rock pesado à música eletrônica.',genre:'De tudo um pouco, sem restrições',instruments:'Guitarra e baixo',artists:'Crystal Castles, Deftones e Pantera',color:'#b83940',art:'/assets/avatars/chapola.png',portrait:'/assets/avatars/chapola-perfil.png',theme:{accent:'#b83940',accent2:'#74252f',gold:'#d9a47c',border:'#dc765e',panel:'#47212d',panel2:'#24151e',panel3:'#160e18',text:'#fff0e5',soft:'#eeb89c',shadow:'#52202a',bio:'#2b1822'}},
    {name:'Lizz',tag:'A romântica literária',bio:'Lizz nunca sai sem um livro na bolsa — ou três, por precaução. Fã de romances clichês e melodias delicadas, vive entre páginas, teclas e canções que poderiam ser a trilha sonora de uma história de amor.',genre:'MPB e Taylor Swift',instruments:'Teclado',artists:'Marisa Monte',color:'#ae65c4',art:'/assets/avatars/lizz.png',portrait:'/assets/avatars/lizz-perfil.png',theme:{accent:'#ad64c5',accent2:'#663178',gold:'#e0b4ed',border:'#c88bdf',panel:'#402348',panel2:'#27162e',panel3:'#161020',text:'#f9eafe',soft:'#e4bbed',shadow:'#51245e',bio:'#2d1c37'}},
    {name:'Tatsugiri',tag:'A enciclopédia nerd ambulante',bio:'Pode errar uma sequência inteira de notas, mas jamais uma curiosidade sobre Pokémon. Nerd até o último pixel, coleciona fatos improváveis e playlists com uma energia tão intensa quanto seus hiperfocos.',genre:'Vocaloid e músicas sobre obsessão',instruments:'Teclado, bateria e, às vezes, guitarra',artists:'Teto',color:'#4b947e',art:'/assets/avatars/tatsugiri.png',portrait:'/assets/avatars/tatsugiri-perfil.png',theme:{accent:'#4b947e',accent2:'#245d51',gold:'#b4d9a9',border:'#77b69d',panel:'#1e3c35',panel2:'#142922',panel3:'#0d1a18',text:'#e9f9ef',soft:'#a9d6c2',shadow:'#204b3d',bio:'#142c27'}},
    {name:'Roberto Montanna',tag:'O enigma da música experimental',bio:'Após uma tragédia familiar, Roberto transformou o luto em arte. Entre melodias imprevisíveis, instrumentos improváveis e até referências culinárias, segue explorando uma música que não aceita rótulos.',genre:'MPBs psicotrópicas e pauleiras, músicas de viúvas e outras experiências sonoras',instruments:'Triângulo, violão e reco-reco',artists:'Oruam, Caetano Veloso e Arrigo Barnabé',color:'#8a9562',art:'/assets/avatars/roberto-montanna.png',portrait:'/assets/avatars/roberto-montanna-perfil.png',theme:{accent:'#879765',accent2:'#55633d',gold:'#e2ac75',border:'#9b9a6a',panel:'#33352c',panel2:'#23251e',panel3:'#151710',text:'#f5e8d5',soft:'#d5c8a5',shadow:'#3f4530',bio:'#272821'}},
    {name:'Irisu',tag:'A colecionadora de caos',bio:'Sarcástica, intensa e fascinada por jogos, símbolos e tudo o que desafia explicações simples. Irisu mistura ironia, energia gótica e uma trilha sonora que oscila entre distorção, eletrônica e obsessões inesperadas.',genre:'Quase tudo',instruments:'Guitarra, violino e piano',artists:'Yungexu, Yeule, Shaarksz, Lupe de Lupe, Jack Off Jill e Panchiko',color:'#496ab5',art:'/assets/avatars/irisu.png',portrait:'/assets/avatars/irisu-perfil.png',theme:{accent:'#4f74c8',accent2:'#2e3b86',gold:'#e8c783',border:'#7791e1',panel:'#242e57',panel2:'#171b37',panel3:'#0f1125',text:'#edf1ff',soft:'#b6c4f9',shadow:'#263a83',bio:'#1a2240'}},
    {name:'Ratazana',tag:'A caótica de laços e ratinhos',bio:'Entre laços, brilhos e acessórios de ratinhos, Ratazana mistura uma estética adorável com uma personalidade criativa e impossível de acompanhar. Na banda, transforma qualquer momento em uma surpresa.',genre:'A definir',instruments:'A definir',artists:'A definir',color:'#e985a9',art:'/assets/avatars/ratazana.png',portrait:'/assets/avatars/ratazana-perfil.png',theme:{accent:'#e778a1',accent2:'#9a4768',gold:'#f3c88d',border:'#ffa0be',panel:'#64304c',panel2:'#361f35',panel3:'#201323',text:'#fff0f6',soft:'#ffd0df',shadow:'#8b365f',bio:'#412638'}},
    {name:'Em breve',tag:'Integrante em criação',bio:'Mais um personagem está chegando ao Jam na Garagem.',genre:'A definir',instruments:'A definir',artists:'A definir',color:'#a894cd',locked:true,theme:{accent:'#a894cd',accent2:'#66528e',gold:'#d8c6f0',border:'#baabda',panel:'#33294f',panel2:'#1c1b31',panel3:'#131220',text:'#f4eeff',soft:'#dbd0f1',shadow:'#564177',bio:'#25203b'}}
  ];
  let avatarIndex=0;
  try {avatarIndex=Math.min(7,Math.max(0,Number(localStorage.getItem('jam-avatar-index')||0)));}catch{}
  avatarBody.innerHTML='<div class="jam-avatar-layout"><div class="jam-avatar-art"><button class="jam-avatar-arrow" type="button" id="jamAvatarPrev" aria-label="Personagem anterior">❮</button><div class="jam-avatar-placeholder" id="jamAvatarArt"><span class="jam-avatar-symbol">♫</span><small class="jam-avatar-coming">ILUSTRAÇÃO EM BREVE</small></div><button class="jam-avatar-arrow" type="button" id="jamAvatarNext" aria-label="Próximo personagem">❯</button></div><div class="jam-avatar-profile"><span class="jam-avatar-count" id="jamAvatarCount"></span><h3 id="jamAvatarName"></h3><div class="jam-avatar-tag" id="jamAvatarTag"></div><p class="jam-avatar-bio" id="jamAvatarBio"></p><dl id="jamAvatarDetails"></dl><button type="button" class="jam-primary" id="jamAvatarPick">SELECIONAR JOGADOR</button><p class="jam-info-note">A escolha é salva neste navegador. Ainda não altera o avatar dos outros jogadores no multiplayer.</p></div></div>';
  function renderAvatar(){
    const p=profiles[avatarIndex];
    const theme=p.theme||{};
    const vars={
      '--character-accent':theme.accent||p.color||'#a894cd',
      '--character-accent-2':theme.accent2||'#5b3b87',
      '--character-gold':theme.gold||'#f0bf74',
      '--character-border':theme.border||p.color||'#a894cd',
      '--character-panel':theme.panel||'#35294e',
      '--character-panel-2':theme.panel2||'#1d1830',
      '--character-panel-3':theme.panel3||'#131221',
      '--character-text':theme.text||'#f5efff',
      '--character-soft':theme.soft||'#dbcff0',
      '--character-shadow':theme.shadow||'#563e80',
      '--character-bio':theme.bio||'#251f3bcc'
    };
    $('#jamAvatarCount').textContent=`PERSONAGEM ${avatarIndex+1} / 8`;
    $('#jamAvatarName').textContent=p.name;
    $('#jamAvatarTag').textContent=p.tag;
    $('#jamAvatarBio').textContent=p.bio;
    $('#jamAvatarDetails').replaceChildren();
    [['Gosto musical',p.genre],['Instrumentos favoritos',p.instruments],['Artistas favoritos',p.artists]].forEach(([label,value])=>{
      const dt=document.createElement('dt'),dd=document.createElement('dd');
      dt.textContent=label;dd.textContent=value;$('#jamAvatarDetails').append(dt,dd);
    });
    const art=$('#jamAvatarArt');
    const coming=art.querySelector('.jam-avatar-coming');
    const symbol=art.querySelector('.jam-avatar-symbol');
    art.dataset.avatar=String(avatarIndex);
    art.dataset.character=p.name.toLowerCase().replace(/[^a-z0-9]+/g,'-');
    const modalCard=avatar.querySelector('.jam-dialog');
    const modalBody=avatar.querySelector('.jam-dialog-body');
    [avatar,modalCard,modalBody,art].forEach(el=>{ if(!el) return; Object.entries(vars).forEach(([k,v])=>el.style.setProperty(k,v)); });
    modalCard.dataset.character=art.dataset.character;
    avatar.style.setProperty('background',`radial-gradient(circle at 25% 15%, ${theme.accent2 || p.color}55, rgba(8,7,18,.9) 65%)`);
    $('#jamAvatarPick').disabled=!!p.locked;
    $('#jamAvatarPick').textContent=p.locked?'PERSONAGEM EM BREVE':'SELECIONAR JOGADOR';
    art.querySelectorAll('.jam-avatar-official, .jam-avatar-sprite').forEach(node=>node.remove());
    art.classList.remove('has-official-art','is-locked');
    if(symbol) symbol.hidden=false;
    if(coming) coming.hidden=false;
    const imgPath=p.art;
    if(imgPath && !p.locked){
      const img=document.createElement('img');
      img.className='jam-avatar-official';
      img.alt=`Ilustração de ${p.name}`;
      img.decoding='async';
      img.onload=()=>{art.querySelectorAll('.jam-avatar-sprite').forEach(node=>node.remove());art.classList.add('has-official-art'); if(coming) coming.hidden=true; if(symbol) symbol.hidden=true;};
      img.onerror=()=>{img.remove(); art.classList.remove('has-official-art'); if(coming) coming.hidden=false; if(symbol) symbol.hidden=false;};
      img.src=imgPath + (imgPath.includes('?') ? '&' : '?') + 'v=elenco7-20261101';
      art.append(img);
    }else{
      art.classList.add('is-locked');
    }
  }
  $('#jamAvatarPrev').addEventListener('click',()=>{avatarIndex=(avatarIndex+7)%8;renderAvatar();});
  $('#jamAvatarNext').addEventListener('click',()=>{avatarIndex=(avatarIndex+1)%8;renderAvatar();});
  $('#jamAvatarPick').addEventListener('click',()=>{if(profiles[avatarIndex].locked)return;try{localStorage.setItem('jam-avatar-index',String(avatarIndex));}catch{}updateChosenAvatar();closeModal(avatar);});
  function updateChosenAvatar(){
    let selected=0; try{selected=Number(localStorage.getItem('jam-avatar-index')||0);}catch{}
    const p=profiles[selected]||profiles[0], button=$('#jamAvatar');
    button.style.setProperty('--avatar-accent',p.color);
    button.setAttribute('aria-label',`Personagem selecionado: ${p.name}. Trocar avatar`);
    button.setAttribute('title',`Trocar personagem (${p.name})`);
    button.querySelectorAll('.jam-nav-portrait').forEach(el=>el.remove());
    button.classList.toggle('jam-has-portrait',!!p.portrait);
    if(p.portrait){
      const photo=document.createElement('img');photo.className='jam-nav-portrait';photo.src=p.portrait;photo.alt='';
      photo.onerror=()=>{photo.remove();button.classList.remove('jam-has-portrait');};
      button.append(photo);
    }
    document.dispatchEvent(new CustomEvent('jam:avatar-selected',{detail:{index:selected,name:p.name}}));
  }
  $('#jamAvatar').addEventListener('click',()=>{renderAvatar();openModal(avatar);});renderAvatar();updateChosenAvatar();
  // CSS isolado para não substituir o tema completo nem o código da jogabilidade.
  if(!document.querySelector('#jam-avatar-characters-style')){
    const style=document.createElement('link');style.id='jam-avatar-characters-style';style.rel='stylesheet';style.href='/css/jam-avatars.css?v=elenco7-uniforme-perfil-2';document.head.append(style);
  }
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!avatar.hidden){closeModal(avatar);return;}if(!settings.hidden){closeModal(settings);return;}if(!room.hidden && lobby.hidden)closeEntryModal();}});
  // Mantém disponível a primeira faixa de música para participantes que acabaram de entrar.
  const h=document.createElement('div');h.className='jam-queue-intro';h.innerHTML='<h2>Fila da banda</h2><p>Organize a playlist e acompanhe a preparação automática das músicas.</p>';queue.prepend(h);
  const hMusic=document.createElement('p');hMusic.className='jam-section-hint';hMusic.textContent='Escolha entre exemplos, áudio próprio, YouTube ou partituras prontas. As músicas importadas podem precisar de análise.';musicPanel?.querySelector('.ph')?.after(hMusic);
})();
