/* Arte do palco do Chapola. Recebe dados somente para leitura; não altera o jogo. */
(function(root){
  'use strict';
  const INK='#050306',RED='#df304d',CREAM='#f6dfc7';
  function rgba(color,alpha){const n=parseInt(color.slice(1),16);return'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+alpha+')';}
  function polygon(g,points,fill,stroke,width=1){g.beginPath();points.forEach(([x,y],index)=>index?g.lineTo(x,y):g.moveTo(x,y));g.closePath();if(fill){g.fillStyle=fill;g.fill();}if(stroke){g.strokeStyle=stroke;g.lineWidth=width;g.stroke();}}
  function hex(g,x,y,rx,ry,fill,stroke,width=1){polygon(g,[[x-rx*.76,y-ry],[x+rx*.76,y-ry],[x+rx,y],[x+rx*.76,y+ry],[x-rx*.76,y+ry],[x-rx,y]],fill,stroke,width);}
  function line(g,x1,y1,x2,y2,color,width=1){g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.strokeStyle=color;g.lineWidth=width;g.stroke();}
  function mix(a,b,t){return a+(b-a)*t;}
  function point(P,side,t,min){return{x:P.cx+side*P.hw*.5*mix(min,1,t),y:mix(P.yTop,P.yHit,t)};}

  function highway(g,P,tv,min,reduced){
    g.save();
    const x=P.cx,y=P.yTop,b=P.yHit,w=P.hw*.5,charge=Math.min(1,P.combo/30);
    polygon(g,[[x-w*min,y],[x+w*min,y],[x+w,b],[x-w,b]],null,'#11080e',2);
    g.save();g.clip();
    const lacquer=g.createLinearGradient(x-w,0,x+w,0);
    lacquer.addColorStop(0,'#250a15');lacquer.addColorStop(.12,'#0a060b');lacquer.addColorStop(.48,'#08060a');lacquer.addColorStop(.52,'#1c0a13');lacquer.addColorStop(.88,'#0a060b');lacquer.addColorStop(1,'#250a15');
    g.fillStyle=lacquer;g.fillRect(x-w,y,w*2,b-y);
    // Filetes e pequenas marcas de desgaste acompanham a perspectiva da pista.
    for(let lane=0;lane<P.laneCount;lane++){
      const dx=(lane+.5-P.laneCount/2)*P.laneW;
      line(g,x+dx*min,y,x+dx,b,'rgba(191,110,126,.12)',1);
      line(g,x+(dx+P.laneW*.035)*min,y,x+dx+P.laneW*.035,b,'rgba(0,0,0,.5)',1);
    }
    for(let i=0;i<12;i++){
      const t=(i+.7)/13,scale=mix(min,1,t),yy=mix(y,b,t),side=i%2?1:-1,xx=x+side*w*scale*.88;
      line(g,xx,yy,xx-side*9*scale,yy+4*scale,'rgba(184,96,115,.14)',1);
    }
    if(charge>0){
      const light=g.createLinearGradient(0,b,0,y);light.addColorStop(0,rgba(RED,.10+charge*.09));light.addColorStop(.7,'rgba(223,48,77,0)');g.fillStyle=light;g.fillRect(x-w,y,w*2,b-y);
      if(!reduced)for(let i=0;i<5;i++){
        const t=((tv*.17+i/5)%1+1)%1,yy=mix(y,b,t),scale=mix(min,1,t);
        for(const side of [-1,1])line(g,x+side*w*scale*.93,yy,x+side*w*scale*.93,yy-10*scale,rgba(RED,charge*.65),2*scale);
      }
    }
    g.restore();g.restore();
  }

  function rails(g,P,tv,min,reduced){
    g.save();
    const charge=Math.min(1,P.combo/30);
    for(const side of [-1,1]){
      const a=point(P,side,0,min),b=point(P,side,1,min);
      line(g,a.x,a.y,b.x,b.y,'#030204',12);
      line(g,a.x,a.y,b.x,b.y,'#6f263c',8);
      line(g,a.x-side*2,a.y,b.x-side*3,b.y,'#1c0b14',5);
      line(g,a.x-side*3,a.y,b.x-side*4,b.y,charge>.3?'#f15770':'#bb3a54',1.5);
      line(g,a.x+side*3,a.y,b.x+side*4,b.y,'#dfa99b',.8);
      for(let i=0;i<6;i++){
        const t=(i+.35)/6,p=point(P,side,t,min),r=1.2+t*1.6;
        hex(g,p.x,p.y,r,r*.8,'#150911','#b67a7b',.6);
      }
      const y=P.yHit+9,x=P.cx+side*P.hw*.5;
      polygon(g,[[x-side*3,y-18],[x+side*14,y-7],[x+side*9,y+20],[x-side*2,y+9]],'#190812','#8b3048',1);
    }
    line(g,P.cx-P.hw*.5-8,P.yHit,P.cx+P.hw*.5+8,P.yHit,'#080306',8);
    line(g,P.cx-P.hw*.5-5,P.yHit,P.cx+P.hw*.5+5,P.yHit,'#b34b61',2);
    line(g,P.cx-P.hw*.5-4,P.yHit-2,P.cx+P.hw*.5+4,P.yHit-2,'#efc2b0',.7);
    g.restore();
  }

  function note(g,P,lane,x,y,s,color){
    g.save();
    if(P.instr==='bateria'&&lane===0){
      const w=P.hw*s*.96,h=Math.max(5,P.laneW*s*.24),edge=Math.min(h,w*.12);
      polygon(g,[[P.cx-w/2-edge*.3,y],[P.cx-w/2,y-h*.65],[P.cx+w/2,y-h*.65],[P.cx+w/2+edge*.3,y],[P.cx+w/2,y+h*.65],[P.cx-w/2,y+h*.65]],INK,'#ad7480',Math.max(.7,s));
      polygon(g,[[P.cx-w/2+edge,y-h*.28],[P.cx+w/2-edge,y-h*.28],[P.cx+w/2-edge*.7,y+h*.28],[P.cx-w/2+edge*.7,y+h*.28]],color,null);
      line(g,P.cx-w*.37,y-h*.14,P.cx+w*.37,y-h*.14,CREAM,Math.max(.7,s));
      for(const side of [-1,1])line(g,P.cx+side*w*.45,y-h*.3,P.cx+side*w*.43,y+h*.3,'#edb89b',Math.max(.7,s));
    }else{
      const r=P.laneW*s*.41,h=r*.63;
      hex(g,x,y+h*.22,r*1.14,h*1.18,'#020103','#32131e',Math.max(.7,r*.055));
      const metal=g.createLinearGradient(x-r,y-h,x+r,y+h);metal.addColorStop(0,CREAM);metal.addColorStop(.22,color);metal.addColorStop(.58,'#33111d');metal.addColorStop(1,color);
      hex(g,x,y,r,h,metal,'#16070e',Math.max(.7,r*.06));
      hex(g,x,y,r*.73,h*.70,'#10070d',CREAM,Math.max(.6,r*.027));
      polygon(g,[[x,y-h*.53],[x+r*.48,y],[x,y+h*.53],[x-r*.48,y]],color,null);
      line(g,x-r*.72,y-h*.66,x+r*.36,y-h*.66,'rgba(255,238,216,.85)',Math.max(.8,r*.065));
      if(r>9){line(g,x-r*.46,y+h*.77,x+r*.58,y+h*.77,rgba(color,.8),Math.max(.7,r*.04));line(g,x-r*.16,y-h*.24,x+r*.12,y-h*.24,'#fff8e8',Math.max(.8,r*.06));}
    }
    g.restore();
  }

  function sustain(g,data,reduced){
    const {x1,y1,x2,y2,w1,w2,color,held,time}=data;g.save();
    polygon(g,[[x1-w1*1.18,y1],[x1+w1*1.18,y1],[x2+w2*1.18,y2],[x2-w2*1.18,y2]],INK,rgba(color,.50),1);
    const beam=g.createLinearGradient(x1,y1,x2,y2);beam.addColorStop(0,held?CREAM:color);beam.addColorStop(.14,color);beam.addColorStop(1,rgba(color,.5));
    polygon(g,[[x1-w1*.65,y1],[x1+w1*.65,y1],[x2+w2*.65,y2],[x2-w2*.65,y2]],beam,null);
    line(g,x1,y1,x2,y2,held?'#fff3dc':rgba(CREAM,.65),held?2:1);
    if(held&&!reduced)for(let i=0;i<6;i++){
      const t=((time*.7+i/6)%1+1)%1,x=mix(x1,x2,t),y=mix(y1,y2,t),w=mix(w1,w2,t)*.9;
      line(g,x-w,y,x+w,y-2,rgba(CREAM,.65),1);
    }
    hex(g,x2,y2,Math.max(2,w2*.9),Math.max(1.5,w2*.55),CREAM,color,.8);g.restore();
  }

  function receptor(g,P,lane,x,y,r,color,down,age,reduced){
    g.save();
    if(age>=0&&age<.26){
      const t=age/.26,span=r*(reduced?1.5:1.4+t*.9),glow=g.createRadialGradient(x,y,0,x,y,span);
      glow.addColorStop(0,rgba(CREAM,(1-t)*.75));glow.addColorStop(.35,rgba(color,(1-t)*.45));glow.addColorStop(1,rgba(color,0));
      g.fillStyle=glow;g.fillRect(x-span,y-span,span*2,span*2);
    }
    hex(g,x,y+5,r*1.13,r*.77,'#020103','#401623',1);
    hex(g,x,y,r,r*.67,down?'#552136':'#170b14',down?CREAM:color,Math.max(2,r*.10));
    hex(g,x,y,r*.75,r*.47,down?color:'#070509',down?color:'#7f4758',1);
    line(g,x-r*.54,y-r*.47,x+r*.42,y-r*.47,down?'#fff6e7':'#d3a698',1);
    for(const side of [-1,1])line(g,x+side*r*.96,y-r*.11,x+side*r*1.12,y+r*.05,'#c39799',1);
    const label=P.keyset?.labels?.[lane]||'';g.font='800 '+Math.round(Math.max(11,r*.66))+'px "Barlow Condensed",sans-serif';g.textAlign='center';g.textBaseline='middle';g.lineWidth=3;g.strokeStyle=down?'rgba(0,0,0,.35)':'#050306';g.strokeText(label,x,y+1,r*1.5);g.fillStyle=down?'#070409':CREAM;g.fillText(label,x,y+1,r*1.5);
    g.restore();
  }

  function hud(g,P,info){
    g.save();
    const compact=P.yTop<140,w=Math.min(P.hw*.84,350),x=P.cx-w/2,top=compact?57:61,bottom=compact?116:146,scoreY=compact?94:112,comboY=compact?110:134;
    polygon(g,[[x+9,top],[x+w-9,top],[x+w,top+9],[x+w,bottom-6],[x+w-7,bottom],[x+7,bottom],[x,bottom-6],[x,top+9]],'rgba(9,4,10,.93)','#713044',1);
    line(g,x+12,top,x+w-12,top,'#d64c67',2);
    const name=(info.name+' · '+info.instrument+' · '+info.difficulty).toUpperCase();g.fillStyle='#bca2a5';g.font='600 '+(compact?10:12)+'px "Barlow Condensed",sans-serif';g.textAlign='center';g.textBaseline='alphabetic';g.fillText(name,P.cx,top+13,w-22);
    const sealX=x+30,sealY=compact?87:101;hex(g,sealX,sealY,12,compact?12:15,'#180914','#743247',1);g.font=(compact?'18':'23')+'px "Pirata One",serif';g.fillStyle='#d26d80';g.textBaseline='middle';g.fillText('B',sealX,sealY+1);g.textBaseline='alphabetic';
    g.font='900 '+(compact?27:35)+'px "Barlow Condensed",sans-serif';g.fillStyle='#270e19';g.fillText(String(P.score),P.cx-13,scoreY+2,w*.55);g.fillStyle=CREAM;g.fillText(String(P.score),P.cx-15,scoreY,w*.55);
    const bx=P.cx+w*.32,by=compact?86:100,rr=compact?15:18;
    hex(g,bx,by,rr,rr,'#190913','#bd405c',1.5);g.font='800 '+(compact?14:17)+'px "Barlow Condensed",sans-serif';g.textBaseline='middle';g.fillStyle=CREAM;g.fillText('×'+info.mult,bx,by+1);
    g.textBaseline='alphabetic';g.font='700 '+(compact?11:13)+'px "Barlow Condensed",sans-serif';g.fillStyle=P.combo>=10?'#f695a4':'#ad7d8a';g.fillText('COMBO '+P.combo,P.cx,comboY);
    const meterY=bottom-3;line(g,x+16,meterY,x+w-16,meterY,'#34101d',2);
    if(info.frac>0)line(g,x+16,meterY,x+16+(w-32)*info.frac,meterY,'#f05a75',2);
    for(const side of [-1,1])hex(g,P.cx+side*(w*.5-8),top+8,1.4,1.4,'#b9898b',null);
    g.restore();
  }

  function judgement(g,P,data,reduced){
    g.save();const {text,x,y,age}=data,t=Math.min(1,age/.6),miss=text==='ERROU',r=1-t;
    g.globalAlpha*=r;g.font='900 '+Math.round(23+(reduced?0:r*5))+'px "Barlow Condensed",sans-serif';g.textAlign='center';g.textBaseline='middle';g.lineWidth=5;g.strokeStyle='#050205';g.strokeText(text,x,y);g.fillStyle=miss?'#ec5270':CREAM;g.fillText(text,x,y);
    const span=Math.min(P.laneW*1.25,92);line(g,x-span*.7,y+18,x+span*.7,y+18,miss?'#8f223b':'#df3b57',1.4);
    if(!reduced&&!miss){const d=span*(.75+t*.35);line(g,x-d,y-6,x-d+8,y-9,'#da4160',1.5);line(g,x+d-8,y+5,x+d,y+2,'#f4c5b7',1.5);}
    g.restore();
  }

  function player(g,P,tv,reduced){
    g.save();
    for(let lane=0;lane<P.laneCount;lane++){
      const age=tv-P.hitFx[lane];if(age<0||age>.38)continue;
      const x=P.cx+(lane+.5-P.laneCount/2)*P.laneW,y=P.yHit,t=age/.38,r=Math.min(P.laneW*.48,32)*(reduced?1.25:1.1+t*1.45);
      g.globalAlpha*=1-t;hex(g,x,y,r,r*.63,null,'#e95c76',1.8);hex(g,x,y,r*.77,r*.40,null,CREAM,1);
      if(!reduced)for(let i=0;i<7;i++){
        const a=-Math.PI+(i+.5)*Math.PI/7,near=r*1.05,far=r*(1.35+(1-t)*.6);
        line(g,x+Math.cos(a)*near,y+Math.sin(a)*near*.95,x+Math.cos(a)*far,y+Math.sin(a)*far*.95,i%2?CREAM:'#eb4164',1.5);
      }
      g.globalAlpha=1;
    }
    g.restore();
  }
  function particle(g,f,reduced){
    if(reduced)return;g.save();g.fillStyle=f.vx<0?'#e74768':CREAM;
    const length=Math.min(11,4+Math.abs(f.vx)*.035),sign=f.vx<0?-1:1;
    polygon(g,[[f.x,f.y-2],[f.x+sign*length,f.y-3],[f.x+sign*3,f.y+2]],g.fillStyle,null);g.restore();
  }
  const api={highway,rails,note,sustain,receptor,hud,judgement,player,particle};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.JamChapolaStage=api;
})(typeof window!=='undefined'?window:null);
