/* Navegação e composição da sala. Não recria controles nem interrompe tarefas. */
(function(){
  'use strict';
  const $=selector=>document.querySelector(selector),root=$('#lobby');if(!root)return;
  const tabs=[...document.querySelectorAll('[data-room-tab]')],panels=[...root.querySelectorAll('[data-room-panel]')];
  const settingsButton=$('#roomSettingsButton');let lastTab='band';
  const profile=$('#roomProfileDialog'),profileName=$('#roomProfileName'),profileStatus=$('#roomProfileStatus');
  $('#roomProfileButton').addEventListener('click',()=>{
    profileName.value=$('#roomPlayerName').textContent;profileStatus.textContent='';
    profile.showModal();profileName.focus();
  });
  $('#closeRoomProfile').addEventListener('click',()=>profile.close());
  $('#roomProfileForm').addEventListener('submit',async event=>{
    event.preventDefault();const button=$('#saveRoomProfile');button.disabled=true;profileStatus.textContent='';
    try{await window.JamProfile.update({name:profileName.value});profile.close();}
    catch(error){profileStatus.textContent=error.message;}
    finally{button.disabled=false;}
  });
  $('#changeRoomCharacter').addEventListener('click',()=>{
    profile.close();window.JamAvatars.requestSelection(async()=>{
      try{await window.JamProfile.update({avatar:window.JamAvatars.getId()});}
      catch(error){profileStatus.textContent=error.message;profile.showModal();}
    });
  });
  function open(key,{focus=false}={}){
    const target=panels.find(panel=>panel.dataset.roomPanel===key);if(!target)return;
    if(key!=='settings')lastTab=key;
    for(const tab of tabs){const active=tab.dataset.roomTab===key;tab.setAttribute('aria-selected',String(active));tab.tabIndex=tab.dataset.roomTab===lastTab?0:-1;}
    settingsButton.setAttribute('aria-expanded',String(key==='settings'));
    for(const panel of panels)panel.hidden=panel!==target;
    root.dataset.view=key;if(focus)target.focus();
  }
  settingsButton.addEventListener('click',()=>open(root.dataset.view==='settings'?lastTab:'settings',{focus:true}));
  for(const panel of panels)panel.tabIndex=0;
  for(const tab of tabs)tab.addEventListener('click',()=>open(tab.dataset.roomTab));
  $('.room-tabs').addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    const current=tabs.indexOf(event.target);if(current<0)return;event.preventDefault();
    const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(current+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
    tabs[next].focus();open(tabs[next].dataset.roomTab);
  });
  document.addEventListener('click',event=>{const route=event.target.closest('[data-room-route]');if(route)open(route.dataset.roomRoute,{focus:true});});
  const settings=$('#roomSettings .settings');
  const groups=[
    ['controls','Teclado e controles','Escolha as teclas e a quantidade de pistas.',['#keyBindings','#laneCount']],
    ['audio','Áudio','Ajuste os volumes de forma independente.',['#musicVolume','#keyVolume']],
    ['timing','Ritmo e sincronização','Configure a leitura da pista e o atraso do aparelho.',['#look','#lat']]
  ];
  const fieldsets=groups.map(([id,title,description,selectors])=>{
    const fieldset=document.createElement('fieldset');fieldset.className='room-settings-group';fieldset.dataset.group=id;
    const legend=document.createElement('legend');legend.textContent=title;
    const copy=document.createElement('p');copy.className='room-settings-description';copy.textContent=description;
    const fields=document.createElement('div');fields.className='room-settings-fields';
    for(const selector of selectors){const field=settings.querySelector(selector)?.closest('.field');if(field)fields.append(field);}
    fieldset.append(legend,copy,fields);return fieldset;
  });
  settings.replaceChildren(...fieldsets);
  function updateSession({name,portrait,character,code,solo}){
    $('#roomPlayerName').textContent=name||'Jogador';
    const image=$('#roomPlayerAvatar');image.hidden=!portrait;
    if(portrait){if(image.getAttribute('src')!==portrait)image.src=portrait;image.alt=character||'';}
    $('#roomSessionIdentity').textContent=solo?'Ensaio solo':code?'Sala '+code:'Sala da banda';
  }
  function updateQueue(ready,pending){
    const count=$('#roomQueueCount');count.textContent=ready+pending;count.title=ready+' prontas · '+pending+' em preparação';
    $('#room-tab-queue').dataset.pending=String(pending>0);
  }
  window.JamRoomUI={open,updateSession,updateQueue};open('band');
})();
