/* Olhos no breu do pub; somente apresentação. */
(function(root){
  'use strict';
  const clamp=x=>Math.max(0,Math.min(1,x));
  const smooth=x=>{const t=clamp(x);return t*t*(3-2*t);};
  const eyeAssets=Object.freeze([
    ['eyes','eyes.jpg',[.15,.4,.72,.22],1.75,1.1],
    ['eyesRedRings','eyes-red-rings.jpg',[.03,.28,.94,.26],1.1,1.1],
    ['eyesWall','eyes-wall.jpg',[.31,.40,.38,.10],1.05,1.05],
    ['eyesHeavy','eyes-heavy.jpg',[.21,.29,.56,.14],1.5,1.12],
    ['eyesRedGlints','eyes-red-glints.jpg',[.26,.56,.42,.14],1.2,1.6],
    ['eyesHollow','eyes-hollow.jpg',[.32,.34,.32,.13],4,1.02],
    ['eyesRedRim','eyes-red-rim.jpg',[.29,.19,.44,.16],1.2,1.1]
  ].map(([key,file,crop,brightness,contrast])=>Object.freeze({key,file,crop:Object.freeze(crop),brightness,contrast})));
  const eyePositions=[
    [.674,.30,.060,.95,0],
    [.230,.26,.045,.84,.110],
    [.795,.35,.052,.90,.170],
    [.100,.58,.044,.78,.220],
    [.900,.62,.044,.82,.270],
    [.340,.45,.040,.74,.310],
    [.060,.33,.012,.48,.140],
    [.910,.23,.014,.52,.260],
    [.850,.48,.010,.42,.340],
    [.170,.74,.013,.46,.380]
  ];
  function state(time,duration,{enabled=true,reduced=false}={}){
    if(!enabled||reduced||!Number.isFinite(time)||!Number.isFinite(duration)||duration<10)return{active:false,darkness:0,eyes:0,progress:0};
    const start=duration*.45,length=Math.min(100,duration*.45),end=start+length;
    if(time<=start||time>=end)return{active:false,darkness:0,eyes:0,progress:0,start,end};
    const progress=(time-start)/length,lightsOutAt=start+Math.min(1.2,length*.10),appearAt=lightsOutAt+Math.min(.35,length*.035),lightsOnAt=end-Math.min(1.5,length*.12),hideAt=lightsOnAt-Math.min(.8,length*.10),effectProgress=(time-appearAt)/(hideAt-appearAt);
    return{active:true,progress,effectProgress,darkness:smooth((time-start)/(lightsOutAt-start))*(1-smooth((time-lightsOnAt)/(end-lightsOnAt))),eyes:smooth(effectProgress/.06)*(1-smooth((effectProgress-.94)/.06)),apparitions:time>appearAt&&time<hideAt,start,end,lightsOutAt,appearAt,hideAt,lightsOnAt};
  }
  function eyeAppearances(time,duration,options={}){
    const phase=state(time,duration,options);if(!phase.apparitions)return[];
    const progress=phase.effectProgress;
    return eyePositions.map((entry,index)=>{
      // A troca de par acontece no preto, com saída e entrada suaves.
      const swapAt=.56+(index%3)*.035,next=progress>=swapAt,swapFade=next?smooth((progress-swapAt)/.045):1-smooth((progress-(swapAt-.045))/.045);
      const alpha=smooth((progress-entry[4])/.07)*(1-smooth((progress-.94)/.06))*phase.darkness*(.9+.1*Math.sin(time*.35+index)**2)*swapFade;
      return{index,key:eyeAssets[(index+(next?3:0))%eyeAssets.length].key,alpha};
    }).filter(eye=>eye.alpha>.001);
  }
  function photograph(g,image,x,y,width,alpha,angle=0,blend='source-over'){
    const iw=image?.naturalWidth||image?.width,ih=image?.naturalHeight||image?.height;
    if(alpha<=0||!iw||!ih||image.complete===false)return;
    g.save();g.translate(x,y);g.rotate(angle);g.globalAlpha*=clamp(alpha);g.globalCompositeOperation=blend;
    g.drawImage(image,-width/2,-width*ih/iw/2,width,width*ih/iw);g.restore();
  }
  function protectLane(g,W,H,player){
    const cx=Number.isFinite(player?.cx)?player.cx:W/2,hw=Number.isFinite(player?.hw)?player.hw:Math.min(460,W-14),top=Number.isFinite(player?.yTop)?player.yTop:152,hit=Number.isFinite(player?.yHit)?player.yHit:H-106;
    g.beginPath();g.rect(0,0,W,H);g.moveTo(cx-hw/6-22,top-12);g.lineTo(cx+hw/6+22,top-12);g.lineTo(cx+hw/2+22,hit+65);g.lineTo(cx-hw/2-22,hit+65);g.closePath();g.clip('evenodd');
  }
  function draw(g,W,H,time,duration,player,options={}){
    const phase=state(time,duration,options);if(!phase.active)return phase;
    g.save();
    // No auge o preto é opaco: nenhuma luz, moldura ou mobília fica aparecendo.
    g.fillStyle='rgba(0,0,0,'+phase.darkness+')';g.fillRect(0,0,W,H);
    const eyes=eyeAppearances(time,duration,options);
    if(eyes.length){
      const room=options.room,iw=room?.naturalWidth||room?.width||1672,ih=room?.naturalHeight||room?.height||941;
      const scale=Math.max(W/iw,H/ih),offsetX=(W-iw*scale)/2,offsetY=(H-ih*scale)/2,visibleWidth=W/scale;
      const view={compact:visibleWidth/iw<.65,left:-offsetX/scale,visibleWidth};
      protectLane(g,W,H,player);g.translate(offsetX,offsetY);g.scale(scale,scale);
      for(const eye of eyes){
        if(view.compact&&eye.index>=4&&eye.index!==6&&eye.index!==7)continue;
        let [x,y,width,opacity]=eyePositions[eye.index];
        if(view.compact){
          const compactPosition={0:[.85,.27],1:[.15,.24],2:[.91,.40],3:[.09,.52],6:[.04,.31],7:[.96,.34]}[eye.index];
          x=(view.left+visibleWidth*compactPosition[0])/iw;y=compactPosition[1];width=visibleWidth*(eye.index>=6?.037:.105)/iw;
        }
        photograph(g,options.assets?.[eye.key]||options.assets?.eyes,x*iw,y*ih,width*iw,eye.alpha*opacity,(eye.index%2?-.025:.02),'screen');
      }
    }
    g.restore();return phase;
  }
  const api={state,eyeAssets,eyeAppearances,draw};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.JamChapolaHaunting=api;
})(typeof window!=='undefined'?window:null);
