(function(){
  'use strict';
  const characters=[
    {id:'chapola',name:'Chapola',color:'#bb3c42',description:'Namorado da Bia bem legal.',music:'Eu quero todos.',instruments:'Guitarra y baixo.',artists:'Crystal Castles, Deftones y Pantera.'},
    {id:'irisu',name:'Irisu',color:'#4d67be',description:'Integrante da banda. Sarcástica, intensa e obcecada por jogos, símbolos e caos.',music:'Metal, música gótica, funk eletrônico, techno.',instruments:'Guitarra, teclado.',artists:'Six Sex, FTSHSM, Rammstein, Linkin Park, Fei-Fei, Alice in Chains.'},
    {id:'roberto',name:'Roberto Montanna',color:'#a85b38',description:'Após perder toda a sua família em um trágico acidente, Roberto Carneiro criou seu alter ego artístico para expressar suas emoções e visões de mundo através da música. Chocando o cenário musical com uma sonoridade inexplicável, Roberto Montanna surge como uma das figuras mais enigmáticas da música brasileira.',extra:'Inspirado por Negro Leo, MC Zói de Gato, Crème brûlée e outras receitas, Roberto Montanna vem explorando os limites da música Indie Experimental Brasileira, sem medo de misturar referências, gêneros e instrumentos inusitados.',music:'MPBs psicotrópicas pauleiras, músicas de viúvas e coisa e tal.',instruments:'Triângulo, violão e reco-reco.',artists:'Oruam, Caetano Veloso & arrigo barnabé.'},
    {id:'ratazana',name:'Ratazana',color:'#d66691',description:'Integrante da banda. Caótica, criativa e difícil de acompanhar.',music:'Metal, música gótica, funk eletrônico, techno.',instruments:'Guitarra, teclado e berimbau.',artists:'Six Sex, FTSHSM, Rammstein, Linkin Park, Fei-Fei, Alice in Chains.'},
    {id:'lizzi',name:'lizzi / Raul Ameixas',short:'Lizzi',color:'#ae74bd',description:'adoro carregar livros.',music:'MPB e Taylor Swift.',instruments:'teclas.',artists:'Marisa Monte.'},
    {id:'gio',name:'Johgi',color:'#c27a3f',description:'curte um clima tropical com direito a coca com gelo e limão e uma música boa de fundo.',music:'Afrobeat, rap e trap brasileiro e forro eletrônico.',instruments:'violão e bateria',artists:'nanda tsunami, calcinha preta e puma pjl.'},
    {id:'tatsugiri',name:'Tatsugiri',color:'#609f84',description:'Péssima em jogos de ritmo.',music:'Vocaloid e músicas sobre obsessão.',instruments:'Teclado ou bateria, e às vezes guitarra.',artists:'Teto.'}
  ];
  const $=s=>document.querySelector(s),dialog=$('#avatarDialog'),picker=$('#characterPicker');
  function showEntrance(){
    $('#titleScreen').hidden=true;$('#entranceLayout').hidden=false;$('#backToStart').hidden=false;
    document.body.classList.remove('has-start');$('#nick').focus();
  }
  function showStart(){
    $('#entranceLayout').hidden=true;$('#titleScreen').hidden=false;$('#backToStart').hidden=true;
    document.body.classList.add('has-start');$('#startGame').focus();
  }
  $('#startGame').addEventListener('click',showEntrance);
  $('#backToStart').addEventListener('click',showStart);
  $('#openCredits').addEventListener('click',()=>$('#creditsDialog').showModal());
  $('#closeCredits').addEventListener('click',()=>$('#creditsDialog').close());
  const store='guitaband-avatar-v1';let selected=null,index=0,afterSelection=null;
  try{const saved=localStorage.getItem(store);if(characters.some(c=>c.id===saved))selected=saved;}catch{}
  const portrait=c=>c.id==='gio'?'/assets/avatars/johgi-face-v2.png':'/assets/avatars/'+c.id+'-face.jpg';
  function loadCharacterImage(image,url){
    if(image.getAttribute('src')===url&&image.complete&&image.naturalWidth)return;
    image.style.visibility='hidden';
    image.onload=()=>{image.style.visibility='visible';};
    image.onerror=()=>{image.style.visibility='visible';image.alt='Imagem indisponível';};
    image.src=url;
  }
  function showCharacter(next,focus=false){
    index=(next+characters.length)%characters.length;const c=characters[index];
    dialog.style.setProperty('--character-color',c.color);
    dialog.dataset.character=c.id;
    $('#characterName').textContent=c.name;$('#characterArtName').textContent=c.short||c.name;
    $('#characterDescription').textContent=c.description||'A imagem enviada apresenta o visual de Gio, sem uma ficha de descrição.';
    $('#characterIssue').textContent='Nº '+String(index+1).padStart(2,'0')+' / 07';
    const image=$('#characterImage');loadCharacterImage(image,c.id==='gio'?'/assets/avatars/johgi.png?v=1.5.1':c.id==='chapola'?'/assets/chapola/chapola-cutout.png':'/assets/avatars/'+c.id+'.jpg');image.alt='Personagem '+c.name;
    const details=$('#characterDetails');details.replaceChildren();
    for(const [label,value]of [['Gosto musical',c.music],['Instrumentos favoritos',c.instruments],['Bandas / artistas favoritos',c.artists]]){
      if(!value)continue;const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;details.append(dt,dd);
    }
    if(c.extra){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent='Mais sobre o personagem';dd.textContent=c.extra;details.append(dt,dd);}
    [...picker.children].forEach((button,i)=>{button.setAttribute('aria-pressed',String(i===index));button.classList.toggle('is-current',i===index);});
    if(focus)picker.children[index].focus();
  }
  function renderSelected(){if(!selected)return;window.JamTheme?.setCharacter(selected);const c=characters.find(c=>c.id===selected);$('#chosenAvatarName').textContent=c.short||c.name;$('#chosenAvatarImage').src=portrait(c);$('.avatar-teaser-sub').textContent='Seu personagem · toque para trocar';}
  function open(callback){afterSelection=typeof callback==='function'?callback:null;showCharacter(Math.max(0,characters.findIndex(c=>c.id===selected)));if(!dialog.open)dialog.showModal();}
  for(const [i,c]of characters.entries()){
    const button=document.createElement('button');button.type='button';button.className='character-option';button.style.setProperty('--character-color',c.color);button.setAttribute('aria-label','Ver personagem '+c.name);
    const img=document.createElement('img');img.src=portrait(c);img.alt='';img.loading='lazy';
    const label=document.createElement('span');label.textContent=c.short||c.name;button.append(img,label);button.addEventListener('click',()=>showCharacter(i));picker.append(button);
  }
  $('#chooseAvatar').addEventListener('click',()=>open());
  $('#closeAvatars').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{afterSelection=null;});
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  dialog.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();showCharacter(index+(event.key==='ArrowRight'?1:-1),true);}});
  $('#confirmAvatar').addEventListener('click',()=>{
    selected=characters[index].id;try{localStorage.setItem(store,selected);}catch{}
    renderSelected();const callback=afterSelection;afterSelection=null;dialog.close();if(callback)callback();
  });
  window.JamAvatars={getId:()=>selected,requestSelection:open,portrait:id=>{const c=characters.find(c=>c.id===id);return c?portrait(c):null;},name:id=>characters.find(c=>c.id===id)?.name||''};
  showCharacter(0);renderSelected();
})();
