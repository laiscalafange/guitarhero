'use strict';
const instruments=['guitarra','baixo','bateria','teclado','vocal'],difficulties=['facil','medio','dificil','expert'];
module.exports=function validateImported(m){
  if(m?.source!=='chart'||!Number.isFinite(m.duration)||m.duration<=0||m.duration>900)throw Error('Partitura ou duração inválida.');
  const result={version:1,source:'chart',audioMode:'mix',engine:'Partitura importada',duration:m.duration,instruments:[],charts:{},events:{},detection:{},title:String(m.title||'Partitura').slice(0,120),artist:String(m.artist||'').slice(0,100),charter:String(m.charter||'').slice(0,100),warnings:Array.isArray(m.warnings)?m.warnings.map(w=>String(w).slice(0,180)).slice(0,8):[]};let count=0;
  for(const i of instruments){const charts={};for(const d of difficulties){const c=m.charts?.[i]?.[d];if(!c)continue;
    if(!Number.isInteger(c.laneCount)||c.laneCount<1||c.laneCount>5||!Array.isArray(c.notes)||!c.notes.length)throw Error('Pista inválida.');
    count+=c.notes.length;if(count>50000)throw Error('A partitura ultrapassa 50 mil notas.');
    if(c.notes.some(n=>!Number.isFinite(n.t)||n.t<0||n.t>=m.duration||!Number.isFinite(n.dur)||n.dur<0||n.dur>m.duration-n.t+.001||!Number.isInteger(n.lane)||n.lane<0||n.lane>=c.laneCount))throw Error('Notas fora da duração ou das faixas.');
    charts[d]={laneCount:c.laneCount,notes:c.notes.map(n=>({t:n.t,dur:Math.min(n.dur,m.duration-n.t),lane:n.lane})).sort((a,b)=>a.t-b.t||a.lane-b.lane)};
  }if(Object.keys(charts).length){result.instruments.push(i);result.charts[i]=charts;result.events[i]=[];}}
  if(!result.instruments.length)throw Error('Nenhum instrumento compatível encontrado na partitura.');return result;
};
