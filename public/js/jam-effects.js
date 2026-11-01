/* Jam na Garagem - microinterações opcionais. Sem interferir no game loop. */
(()=>{'use strict';
 const gs=window.gsap;const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const $=s=>document.querySelector(s);
 function iconize(){
  if(!window.lucide)return;
  const map=[['#jamSettings','sliders-horizontal'],['#jamAvatar','user-round'],['[data-jam-view="band"]','users'],['[data-jam-view="music"]','music-2'],['[data-jam-view="queue"]','list-music']];
  for(const [selector,name] of map){
    const target=$(selector);
    if(!target)continue;
    // A interface antiga usava caracteres como ⚙ e ◉. Remover esses glifos
    // antes de inserir os ícones evita a duplicação vista no cabeçalho.
    if(selector==='#jamSettings'||selector==='#jamAvatar'){
      target.replaceChildren();
    }else{
      for(const child of [...target.childNodes]){
        if(child.nodeType===3)child.textContent=child.textContent.replace(/^[\s♬♫☷]+/u,'');
      }
    }
    if(target.querySelector('svg'))continue;
    const icon=document.createElement('i');
    icon.setAttribute('data-lucide',name);
    icon.setAttribute('aria-hidden','true');
    target.prepend(icon);
  }
  try{window.lucide.createIcons()}catch(e){console.warn('Lucide indisponível',e)}
 }
 function enter(node,from={opacity:0,y:16},duration=.55){if(!gs||reduce||!node)return;gs.fromTo(node,from,{opacity:1,x:0,y:0,scale:1,duration,ease:'power2.out',clearProps:'transform,opacity',overwrite:'auto'})}
 function init(){if(!document.body.classList.contains('jam-redesign'))return;iconize();enter($('.jam-hero-content'),{opacity:0,y:24},.8);
  const start=$('#jamStart');if(start&&gs&&!reduce){start.addEventListener('mouseenter',()=>gs.to(start,{scale:1.035,duration:.2,overwrite:'auto'}));start.addEventListener('mouseleave',()=>gs.to(start,{scale:1,duration:.2,overwrite:'auto'}));}
  const observer=new MutationObserver(records=>{for(const rec of records){if(rec.type!=='attributes'||rec.attributeName!=='hidden')continue;const el=rec.target;if(el.hidden)continue;if(el.matches('.jam-view'))enter(el,{opacity:0,y:12},.35);if(el.matches('.jam-overlay'))enter(el.querySelector('.jam-dialog'),{opacity:0,y:18,scale:.985},.3);if(el.matches('.jam-entry'))enter(el,{opacity:0,y:20},.35);}});
  for(const node of document.querySelectorAll('.jam-view,.jam-overlay,.jam-entry'))observer.observe(node,{attributes:true,attributeFilter:['hidden']});
  const avatarArt=$('#jamAvatarArt');if(avatarArt){const avatarObserver=new MutationObserver(()=>{if(!reduce)enter(avatarArt,{opacity:.4,x:12},.25)});avatarObserver.observe(avatarArt,{attributes:true,attributeFilter:['data-avatar']});}
  document.addEventListener('click',e=>{const b=e.target.closest('.jam-nav-btn,[data-setting]');if(!b)return;if(!reduce&&gs)gs.fromTo(b,{scale:.96},{scale:1,duration:.22,ease:'back.out(2)',overwrite:'auto'});});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

/* Sprites provisórios, substituíveis pelas artes definitivas da equipe. */
(()=>{'use strict';
 function init(){
  const holder=document.getElementById('jamAvatarArt');
  if(!holder)return;
  let sprite=holder.querySelector('.jam-avatar-sprite');
  if(!sprite){sprite=document.createElement('div');sprite.className='jam-avatar-sprite';sprite.setAttribute('aria-hidden','true');holder.append(sprite)}
  const paint=()=>{const idx=Math.max(0,Math.min(7,Number(holder.dataset.avatar)||0));sprite.style.backgroundPosition=`${idx*100/7}% 0`};
  paint();new MutationObserver(paint).observe(holder,{attributes:true,attributeFilter:['data-avatar']});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
