/* Desenho da Johgi. Nenhuma leitura de áudio, escrita em notas ou regra de pontuação. */
(function(root){
  'use strict';
  const INK='#3b1d32',PAPER='#fff0c8',PINK='#ef6b85',GOLD='#ffbd58',TAU=Math.PI*2;
  const mix=(a,b,t)=>a+(b-a)*t;
  function rgba(hex,a){const n=parseInt(hex.slice(1),16);return'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')';}
  function line(g,x1,y1,x2,y2,color,w=1){g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.strokeStyle=color;g.lineWidth=w;g.stroke();}
  function poly(g,points,fill,stroke,w=1){g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();paint(g,fill,stroke,w);}
  function paint(g,fill,stroke,w=1){if(fill){g.fillStyle=fill;g.fill();}if(stroke){g.strokeStyle=stroke;g.lineWidth=w;g.stroke();}}
  function ellipse(g,x,y,rx,ry,fill,stroke,w=1){g.beginPath();g.ellipse(x,y,rx,ry,0,0,TAU);paint(g,fill,stroke,w);}
  function star(g,x,y,r,fill,stroke){
    const points=[];for(let k=0;k<10;k++){const a=-Math.PI/2+k*Math.PI/5,s=k%2?.46:1;points.push([x+Math.cos(a)*r*s,y+Math.sin(a)*r*s]);}
    poly(g,points,fill,stroke,1);
  }
  function flower(g,x,y,r,opacity=1){
    g.save();g.globalAlpha*=opacity;
    for(let k=0;k<5;k++){const a=k*TAU/5;g.save();g.translate(x+Math.cos(a)*r*.43,y+Math.sin(a)*r*.43);g.rotate(a);ellipse(g,0,0,r*.56,r*.38,PINK,INK,Math.max(1,r*.045));line(g,-r*.2,0,r*.35,0,'#ffc18d',Math.max(1,r*.045));g.restore();}
    ellipse(g,x,y,r*.15,r*.15,'#c13c60',INK,1);line(g,x,y,x+r*.44,y-r*.57,PAPER,Math.max(1,r*.07));ellipse(g,x+r*.44,y-r*.57,r*.09,r*.09,GOLD,INK,1);g.restore();
  }
  function pick(g,x,y,r,fill,stroke,w=1){
    g.beginPath();g.moveTo(x-r*.78,y-r*.55);g.quadraticCurveTo(x,y-r*.94,x+r*.78,y-r*.55);
    g.quadraticCurveTo(x+r*1.02,y-r*.08,x,y+r*.78);g.quadraticCurveTo(x-r*1.02,y-r*.08,x-r*.78,y-r*.55);g.closePath();paint(g,fill,stroke,w);
  }
  function card(g,x,y,w,h,fill,stroke){poly(g,[[x+7,y],[x+w-7,y],[x+w,y+7],[x+w,y+h-7],[x+w-7,y+h],[x+7,y+h],[x,y+h-7],[x,y+7]],fill,stroke,1.5);}

  function backdrop(g,W,H,tv,assets,reduced){
    g.save();g.fillStyle='#6e3548';g.fillRect(0,0,W,H);
    const image=assets?.beach;
    if(image?.complete&&image.naturalWidth){const s=Math.max(W/image.naturalWidth,H/image.naturalHeight);g.drawImage(image,(W-image.naturalWidth*s)/2,(H-image.naturalHeight*s)/2,image.naturalWidth*s,image.naturalHeight*s);}
    const shade=g.createLinearGradient(0,0,0,H);shade.addColorStop(0,'rgba(53,24,49,.68)');shade.addColorStop(.42,'rgba(67,28,50,.25)');shade.addColorStop(1,'rgba(48,23,41,.75)');g.fillStyle=shade;g.fillRect(0,0,W,H);
    if(W>750){
      g.strokeStyle='rgba(255,221,168,.42)';g.lineWidth=1;g.strokeRect(22,70,W-44,H-94);
      g.font='500 10px "DM Mono",monospace';g.fillStyle='#ffe1ad';g.textAlign='left';g.fillText('JOHGI / LADO SOL',40,H-39);g.textAlign='right';g.fillText('SESSÃO TROPICAL',W-40,H-39);
      flower(g,W*.09,H*.82,Math.min(W*.045,46),.55);flower(g,W*.91,H*.76,Math.min(W*.036,35),.42);
    }
    if(!reduced){
      // Poucos brilhos lentos nas bordas; nunca são notas ou alvos do jogo.
      for(let k=0;k<7;k++){
        const side=k%2?1:-1,x=W*(side>0?.91:.09)+Math.sin(k*3.8+tv*.22)*W*.025,y=H*(.2+(k/7)*.56),a=.18+.12*Math.sin(tv*.65+k);
        g.save();g.globalAlpha*=a;star(g,x,y,3+k%3,PAPER,null);g.restore();
      }
    }
    g.restore();
  }
  function highway(g,P,tv,min,reduced){
    g.save();const x=P.cx,y=P.yTop,b=P.yHit,w=P.hw/2;
    poly(g,[[x-w*min,y],[x+w*min,y],[x+w,b],[x-w,b]],null,INK,1);
    g.save();g.clip();
    const wood=g.createLinearGradient(0,y,0,b);wood.addColorStop(0,'#3b2135');wood.addColorStop(.5,'#422137');wood.addColorStop(1,'#54273d');g.fillStyle=wood;g.fillRect(x-w,y,w*2,b-y);
    for(let k=0;k<P.laneCount;k++){
      const dx=(k+.5-P.laneCount/2)*P.laneW;
      line(g,x+dx*min,y,x+dx,b,k%2?'rgba(255,188,112,.06)':'rgba(255,235,189,.09)',Math.max(1,P.laneW*.13));
    }
    const charge=Math.min(1,P.combo/30),glow=g.createLinearGradient(0,b,0,y);
    glow.addColorStop(0,rgba(GOLD,.05+charge*.13));glow.addColorStop(.8,rgba(GOLD,0));g.fillStyle=glow;g.fillRect(x-w,y,w*2,b-y);
    if(charge&&!reduced)for(let k=0;k<4;k++){
      const t=((tv*.12+k/4)%1+1)%1,s=mix(min,1,t),yy=mix(y,b,t);
      for(const side of [-1,1])star(g,x+side*w*s*.93,yy,2+s*2,rgba(PAPER,charge*.65),null);
    }
    g.restore();g.restore();
  }
  function rails(g,P,tv,min,reduced){
    g.save();const w=P.hw/2;
    for(const side of [-1,1]){
      const x1=P.cx+side*w*min,x2=P.cx+side*w;
      line(g,x1,P.yTop,x2,P.yHit,INK,12);line(g,x1,P.yTop,x2,P.yHit,'#f58365',8);
      line(g,x1-side*2,P.yTop,x2-side*2,P.yHit,'#ffd497',2);
      for(let k=0;k<6;k++){
        const t=(k+.35)/6,s=mix(min,1,t);ellipse(g,P.cx+side*w*s,mix(P.yTop,P.yHit,t),1+t*1.6,1+t*1.6,'#ffe0aa',INK,.7);
      }
      ellipse(g,x2,P.yHit+10,7,7,GOLD,INK,2);
    }
    line(g,P.cx-w-7,P.yHit,P.cx+w+7,P.yHit,INK,8);line(g,P.cx-w-5,P.yHit-1,P.cx+w+5,P.yHit-1,'#ffcf8b',2);g.restore();
  }
  function note(g,P,lane,x,y,s,color){
    g.save();
    if(P.instr==='bateria'&&lane===0){
      const w=P.hw*s*.96,h=Math.max(5,P.laneW*s*.23);
      poly(g,[[P.cx-w/2,y-h*.55],[P.cx+w/2,y-h*.55],[P.cx+w/2+h*.18,y],[P.cx+w/2,y+h*.55],[P.cx-w/2,y+h*.55],[P.cx-w/2-h*.18,y]],color,INK,Math.max(1,s*2.5));
      line(g,P.cx-w*.44,y-h*.22,P.cx+w*.44,y-h*.22,PAPER,Math.max(1,s*1.6));
      star(g,P.cx,y,Math.max(2,h*.42),PAPER,INK);
    }else{
      const r=Math.min(P.laneW*.41,52)*s;
      pick(g,x,y+r*.12,r*1.1,INK,INK,Math.max(.6,r*.055));
      pick(g,x,y,r,color,INK,Math.max(.8,r*.075));
      pick(g,x,y-r*.02,r*.67,null,PAPER,Math.max(.6,r*.055));
      line(g,x-r*.46,y-r*.44,x+r*.35,y-r*.44,'#fff7e3',Math.max(.7,r*.09));
      if(r>10)ellipse(g,x,y+r*.12,r*.1,r*.1,PAPER,null);
    }
    g.restore();
  }
  function sustain(g,data,reduced){
    const {x1,y1,x2,y2,w1,w2,color,held,time}=data;g.save();
    poly(g,[[x1-w1*1.2,y1],[x1+w1*1.2,y1],[x2+w2*1.2,y2],[x2-w2*1.2,y2]],INK,rgba(PAPER,.65),.8);
    poly(g,[[x1-w1*.8,y1],[x1+w1*.8,y1],[x2+w2*.8,y2],[x2-w2*.8,y2]],color,null);
    line(g,x1-w1*.25,y1,x2-w2*.25,y2,held?PAPER:rgba(PAPER,.6),held?2:1);
    if(held&&!reduced)for(let k=0;k<4;k++){
      const t=((time*.5+k/4)%1+1)%1,x=mix(x1,x2,t),y=mix(y1,y2,t);star(g,x,y,Math.max(2,mix(w1,w2,t)*.7),PAPER,null);
    }
    ellipse(g,x2,y2,Math.max(2,w2*.8),Math.max(1.4,w2*.55),PAPER,color,.8);g.restore();
  }
  function receptor(g,P,lane,x,y,r,color,down,age,reduced){
    g.save();
    if(age>=0&&age<.3){const t=age/.3,rr=r*(reduced?1.4:1.2+t*1.1);g.save();g.globalAlpha*=1-t;ellipse(g,x,y,rr,rr*.68,null,PAPER,2);g.restore();}
    ellipse(g,x,y+4,r*1.13,r*.78,INK,null);
    ellipse(g,x,y,r,r*.69,down?color:'#422337',color,Math.max(2,r*.12));
    ellipse(g,x,y,r*.73,r*.49,down?PAPER:'#582c42',down?PAPER:'#e5ad86',1);
    g.font='700 '+Math.round(Math.max(11,r*.6))+'px "Familjen Grotesk",sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillStyle=down?INK:PAPER;g.fillText(P.keyset?.labels?.[lane]||'',x,y+1);
    for(const side of [-1,1])line(g,x+side*r*.94,y-r*.17,x+side*r*1.06,y-r*.24,PAPER,1);
    g.restore();
  }
  function hud(g,P,info){
    g.save();const compact=P.yTop<140,w=Math.min(P.hw*.86,350),x=P.cx-w/2,top=compact?58:61,bottom=compact?116:146,scoreY=compact?94:111,comboY=compact?109:134;
    card(g,x+3,top+4,w,bottom-top,INK,null);card(g,x,top,w,bottom-top,'#ffedc9','#8e4b54');
    line(g,x+10,top+2,x+w-10,top+2,'#ed7180',3);
    g.font='600 '+(compact?9:10)+'px "Familjen Grotesk",sans-serif';g.fillStyle='#8d4c54';g.textAlign='center';g.textBaseline='alphabetic';
    g.fillText((info.name+' · '+info.instrument+' · '+info.difficulty).toUpperCase(),P.cx,top+13,w-20);
    const cy=compact?88:101,cx=x+25;flower(g,cx,cy,compact?10:13,.9);
    g.font=(compact?'30':'39')+'px "Bangers",sans-serif';g.fillStyle=INK;g.fillText(String(P.score),P.cx-12,scoreY,w*.55);
    const bx=P.cx+w*.32,by=compact?87:101,r=compact?15:18;
    for(let k=0;k<10;k++){const a=k*TAU/10;line(g,bx+Math.cos(a)*(r+1),by+Math.sin(a)*(r+1),bx+Math.cos(a)*(r+4),by+Math.sin(a)*(r+4),'#cc704e',1.4);}
    ellipse(g,bx,by,r,r,GOLD,'#8c4a4e',1.5);g.font='700 '+(compact?14:17)+'px "Familjen Grotesk",sans-serif';g.fillStyle='#652a42';g.textBaseline='middle';g.fillText('×'+info.mult,bx,by+1);
    g.font='700 '+(compact?10:12)+'px "Familjen Grotesk",sans-serif';g.textBaseline='alphabetic';g.fillStyle=P.combo>=10?'#b42e58':'#8f5b56';g.fillText('COMBO '+P.combo,P.cx,comboY);
    const my=bottom-3;line(g,x+13,my,x+w-13,my,'#e7b99a',2);if(info.frac>0)line(g,x+13,my,x+13+(w-26)*info.frac,my,'#d34b6e',2);g.restore();
  }
  function judgement(g,P,data,reduced){
    g.save();const {text,x,y,age}=data,t=Math.min(1,age/.6),miss=text==='ERROU',w=Math.min(P.laneW*2.7,166),h=32;
    g.globalAlpha*=1-t;g.translate(x,y);if(!reduced)g.rotate((miss?1:-1)*.045);
    card(g,-w/2+2,-h/2+3,w,h,INK,null);card(g,-w/2,-h/2,w,h,miss?'#f29b9c':PAPER,INK);
    g.font='25px "Bangers",sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillStyle=miss?'#7a2947':'#9f3d58';g.fillText(text,0,1,w-22);
    if(!reduced&&!miss){star(g,-w*.62,-h*.2,6+3*(1-t),GOLD,INK);star(g,w*.6,h*.15,5,PINK,INK);}g.restore();
  }
  function player(g,P,tv,reduced){
    g.save();for(let lane=0;lane<P.laneCount;lane++){
      const age=tv-P.hitFx[lane];if(age<0||age>.35)continue;
      const t=age/.35,x=P.cx+(lane+.5-P.laneCount/2)*P.laneW,y=P.yHit,r=Math.min(P.laneW*.4,27)*(reduced?1.2:1+t*1.4);
      g.save();g.globalAlpha*=1-t;ellipse(g,x,y,r,r*.64,null,PAPER,1.5);
      if(!reduced)for(let k=0;k<5;k++){const a=-Math.PI+(k+.5)*Math.PI/5;star(g,x+Math.cos(a)*r*1.4,y+Math.sin(a)*r*1.15,3+(1-t)*2,k%2?PINK:GOLD,INK);}
      g.restore();
    }g.restore();
  }
  function particle(g,f,reduced){
    if(reduced)return;g.save();const color=f.vx<0?PINK:GOLD;
    if(f.vx<0){g.translate(f.x,f.y);g.rotate(f.t*3);ellipse(g,0,0,4,2,color,INK,.6);}else star(g,f.x,f.y,4,color,INK);g.restore();
  }
  function gem(g,x,y,r,color){g.save();star(g,x,y,Math.max(1,r*.3),PAPER,color);g.restore();}
  const api={backdrop,highway,rails,note,sustain,receptor,hud,judgement,player,particle,gem};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.JamJohgiStage=api;
})(typeof window!=='undefined'?window:null);
