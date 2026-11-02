/* Desenho somente: não recebe rede, áudio, relógio de jogo ou funções de pontuação. */
(function(root){
  'use strict';
  const TAU=Math.PI*2;
  function backdrop(g,W,H,tv,assets,reduced){
    g.save();g.fillStyle='#050304';g.fillRect(0,0,W,H);
    const image=assets?.pub;
    if(image?.complete&&image.naturalWidth){const scale=Math.max(W/image.naturalWidth,H/image.naturalHeight);g.globalAlpha=.55;g.drawImage(image,(W-image.naturalWidth*scale)/2,(H-image.naturalHeight*scale)/2,image.naturalWidth*scale,image.naturalHeight*scale);g.globalAlpha=1;}
    const shade=g.createLinearGradient(0,0,0,H);shade.addColorStop(0,'rgba(2,1,2,.92)');shade.addColorStop(.38,'rgba(3,1,2,.34)');shade.addColorStop(1,'rgba(5,1,3,.72)');g.fillStyle=shade;g.fillRect(0,0,W,H);
    if(W>850){
      g.strokeStyle='#75313b';g.lineWidth=1;g.strokeRect(22,70,W-44,H-94);
      g.font='10px "DM Mono",monospace';g.fillStyle='#a98180';g.textAlign='left';g.fillText('CHAPOLA / LADO B',40,H-39);g.textAlign='right';g.fillText('A NOITE TEM OLHOS',W-40,H-39);
    }
    g.restore();
  }
  function gem(g,x,y,r,color){
    g.save();g.strokeStyle='#f5dfc4';g.lineWidth=Math.max(.6,r*.055);g.globalAlpha*=.65;
    g.beginPath();g.moveTo(x,y-r*.5);g.lineTo(x+r*.42,y);g.lineTo(x,y+r*.5);g.lineTo(x-r*.42,y);g.closePath();g.stroke();g.restore();
  }
  function player(g,P,tv,reduced){
    g.save();
    const combo=Math.min(4,Math.floor(P.combo/10));
    g.strokeStyle=combo?'#d23a4d':'#4e2530';g.lineWidth=1;
    const span=Math.min(P.hw*.44,150);
    g.beginPath();g.moveTo(P.cx-span,145);g.lineTo(P.cx-22,145);g.moveTo(P.cx+22,145);g.lineTo(P.cx+span,145);g.stroke();
    for(let k=0;k<4;k++){g.fillStyle=k<combo?'#e9465b':'#46202b';g.fillRect(P.cx-15+k*9,142,4,6);}
    if(combo){g.strokeStyle='#d44a60';g.lineWidth=2;g.beginPath();g.moveTo(P.cx-80,120);g.lineTo(P.cx-88,120);g.lineTo(P.cx-83,88);g.moveTo(P.cx+80,84);g.lineTo(P.cx+88,84);g.lineTo(P.cx+83,116);g.stroke();}
    for(let lane=0;lane<P.laneCount;lane++){
      const age=tv-P.hitFx[lane];if(age<0||age>.34)continue;
      const x=P.cx+(lane+.5-P.laneCount/2)*P.laneW,y=P.yHit,t=age/.34,r=Math.min(P.laneW*.5,36)*(1.15+(reduced?0:t*1.5));
      g.globalAlpha=(1-t)*.8;g.strokeStyle='#f0cfb7';g.lineWidth=1.5;
      g.beginPath();g.moveTo(x-r,y);g.lineTo(x,y-r*.7);g.lineTo(x+r,y);g.lineTo(x,y+r*.7);g.closePath();g.stroke();
      g.strokeStyle='#da334c';g.beginPath();g.moveTo(x-r*1.5,y);g.lineTo(x-r*.7,y);g.moveTo(x+r*.7,y);g.lineTo(x+r*1.5,y);g.stroke();
      if(!reduced&&age<.2){g.strokeStyle='#f1d4b4';g.lineWidth=2;for(let k=0;k<6;k++){const a=k*TAU/6;g.beginPath();g.moveTo(x+Math.cos(a)*r*1.25,y+Math.sin(a)*r*.9);g.lineTo(x+Math.cos(a)*r*1.9,y+Math.sin(a)*r*1.3);g.stroke();}}
    }
    g.restore();
  }
  function particle(g,f){g.save();g.fillStyle=f.vx<0?'#e03b51':'#f0d7bc';g.beginPath();g.moveTo(f.x,f.y-4);g.lineTo(f.x+2,f.y);g.lineTo(f.x,f.y+4);g.lineTo(f.x-2,f.y);g.closePath();g.fill();g.restore();}
  const api={backdrop,gem,player,particle};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.JamChapolaRenderer=api;
})(typeof window!=='undefined'?window:null);
