'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {state,eyeAssets,eyeAppearances,draw}=require('../public/js/chapola-haunting');
const timeline=duration=>state(duration*.45+.01,duration);
const compactEye=eye=>eye.index<4||eye.index===6||eye.index===7;
function recorder(){
  const commands=[],saved=[],g=new Proxy({globalAlpha:1,save(){saved.push({globalAlpha:this.globalAlpha,globalCompositeOperation:this.globalCompositeOperation});},restore(){Object.assign(this,saved.pop());}},{get:(object,key)=>key in object?object[key]:(...args)=>{for(const value of args)if(typeof value==='number')assert.ok(Number.isFinite(value),key+' finito');const command=[key,...args];command.alpha=object.globalAlpha;commands.push(command);},set:(object,key,value)=>{object[key]=value;return true;}});
  return{g,commands};
}
const makeAssets=()=>Object.freeze(Object.fromEntries(eyeAssets.map(profile=>[profile.key,Object.freeze({width:400,height:100,key:profile.key})])));

test('catálogo contém os seis olhos novos e o original, sem fotos de outras figuras',()=>{
  assert.deepEqual(eyeAssets.map(profile=>profile.file),['eyes.jpg','eyes-red-rings.jpg','eyes-wall.jpg','eyes-heavy.jpg','eyes-red-glints.jpg','eyes-hollow.jpg','eyes-red-rim.jpg']);
  assert.ok(Object.isFrozen(eyeAssets));
  for(const profile of eyeAssets){
    assert.ok(fs.existsSync(path.join(__dirname,'../public/assets/chapola',profile.file)));
    const [x,y,w,h]=profile.crop;assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=1&&y+h<=1);
    assert.ok(profile.brightness>0&&profile.contrast>0);assert.ok(Object.isFrozen(profile));
  }
  const hollow=eyeAssets.find(profile=>profile.key==='eyesHollow');assert.ok(hollow.crop[1]+hollow.crop[3]<.5,'a boca da referência fica fora do recorte');
});

test('o breu começa perto da metade da música, seguido de olhos após uma pausa curta',()=>{
  for(const duration of [10,25,70,180,900]){
    const phase=timeline(duration);let first=phase.appearAt;
    while(first<phase.appearAt+.3&&!eyeAppearances(first,duration).length)first+=.01;
    assert.equal(state(duration*.4,duration).active,false);assert.deepEqual(eyeAppearances(duration*.4,duration),[]);
    assert.ok(phase.start>=duration*.4&&phase.start<=duration*.5);
    assert.ok(eyeAppearances(first,duration).length);assert.ok(first>=duration*.45&&first<duration*.56);
    assert.ok(phase.appearAt-phase.lightsOutAt>=.15&&phase.appearAt-phase.lightsOutAt<=.36);
  }
});

test('as sete variedades têm sua vez no computador e no celular, com trocas graduais',()=>{
  assert.ok(timeline(25).hideAt-timeline(25).appearAt>7,'o exemplo curto ainda mantém os olhos por vários segundos');
  assert.ok(timeline(180).hideAt-timeline(180).appearAt>75,'período prolongado nas músicas de três minutos');
  for(const duration of [10,25,70,180,900]){
    const {appearAt,hideAt}=timeline(duration),span=hideAt-appearAt,desktop=new Set(),mobile=new Set();
    assert.equal(eyeAppearances(appearAt+span*.5,duration).length,10);
    for(let progress=.005;progress<.99;progress+=.005){
      for(const eye of eyeAppearances(appearAt+span*progress,duration)){
        assert.ok(eye.alpha>0&&eye.alpha<=1);assert.ok(eyeAssets.some(profile=>profile.key===eye.key));
        desktop.add(eye.key);if(compactEye(eye))mobile.add(eye.key);
      }
    }
    const expected=eyeAssets.map(profile=>profile.key).sort();assert.deepEqual([...desktop].sort(),expected);assert.deepEqual([...mobile].sort(),expected);
    for(const progress of [.85,.92,.97])assert.equal(eyeAppearances(appearAt+span*progress,duration).length,10,'os pares permanecem até perto da saída');
    for(const progress of [.2,.4,.7,.85])assert.ok(eyeAppearances(appearAt+span*progress,duration).some(eye=>eye.index===0),'o olhar principal permanece por mais tempo');
  }
});

test('tudo permanece vazio nas transições de luz e antes de a iluminação voltar',()=>{
  const assets=makeAssets();
  for(const duration of [10,25,70,180,900]){
    const {start,end,lightsOutAt,appearAt,hideAt,lightsOnAt}=timeline(duration);let first=null,last=null;
    for(let time=start;time<end;time+=.02){
      if(!eyeAppearances(time,duration).length)continue;
      assert.equal(state(time,duration).darkness,1);if(first===null)first=time;last=time;
    }
    assert.ok(first-lightsOutAt>=.15);assert.ok(lightsOnAt-last>=.4,'há breu vazio antes da volta da luz, mesmo nas faixas curtas');
    for(const time of [(start+lightsOutAt)/2,(lightsOutAt+appearAt)/2,(hideAt+lightsOnAt)/2,(lightsOnAt+end)/2]){
      const {g,commands}=recorder();draw(g,1280,720,time,duration,null,{assets});
      assert.equal(commands.filter(command=>command[0]==='drawImage').length,0);
      if(time>=lightsOutAt&&time<=lightsOnAt)assert.equal(g.fillStyle,'rgba(0,0,0,1)');
    }
  }
});

test('o pub apaga gradualmente e volta ao normal antes do fim da música',()=>{
  for(const duration of [10,25,70,180,900]){
    const {start,end,lightsOnAt}=timeline(duration);
    assert.ok(end<duration);assert.equal(state(0,duration).active,false);assert.equal(state(start,duration).darkness,0);
    const peak=state((start+end)/2,duration);assert.equal(peak.darkness,1);assert.ok(peak.eyes>.95);
    assert.ok(state(end-(end-lightsOnAt)*.001,duration).darkness<.001);assert.equal(state(end,duration).darkness,0);assert.equal(state(duration,duration).active,false);
    for(let time=start-.1;time<=end+.1;time+=.05){const frame=state(time,duration);assert.ok(frame.darkness>=0&&frame.darkness<=1);assert.ok(frame.eyes>=0&&frame.eyes<=1);}
  }
});

test('opção desligada, movimento reduzido e tempos inválidos não desenham os olhos',()=>{
  const g=new Proxy({},{get:()=>()=>{throw Error('Não deveria desenhar');}});
  for(const options of [{enabled:false},{reduced:true}]){assert.equal(draw(g,1280,720,12,25,null,options).active,false);assert.deepEqual(eyeAppearances(12,25,options),[]);}
  for(const [time,duration]of [[-3,25],[12,0],[NaN,25],[12,Infinity],[3,6],[25,25]])assert.equal(draw(g,1280,720,time,duration).active,false);
});

test('somente olhos pequenos são desenhados, com recorte da pista e sem mudar o jogador',()=>{
  const room=Object.freeze({naturalWidth:1672,naturalHeight:941}),assets=makeAssets(),phase=timeline(25);
  for(const [W,H]of [[390,844],[1280,720],[1920,1080],[900,440]]){
    const scale=Math.max(W/room.naturalWidth,H/room.naturalHeight),offsetX=(W-room.naturalWidth*scale)/2,offsetY=(H-room.naturalHeight*scale)/2,compact=(W/scale)/room.naturalWidth<.65;
    const player=Object.freeze({cx:W/2,hw:Math.min(460,W-14),yTop:152,yHit:H-106}),before=JSON.stringify(player);
    for(const progress of [.25,.5,.57,.72,.85]){
      const time=phase.appearAt+(phase.hideAt-phase.appearAt)*progress,{g,commands}=recorder();draw(g,W,H,time,25,player,{assets,room});
      const photos=commands.filter(command=>command[0]==='drawImage');assert.equal(photos.length,eyeAppearances(time,25).filter(eye=>!compact||compactEye(eye)).length);
      assert.ok(photos.every(command=>eyeAssets.some(profile=>assets[profile.key]===command[1])));assert.ok(photos.every(command=>command[4]*scale<=W*.12));
      assert.equal(g.fillStyle,'rgba(0,0,0,1)');assert.ok(commands.some(command=>command[0]==='clip'&&command[1]==='evenodd'));
      assert.ok(commands.some(command=>command[0]==='scale'&&command[1]===scale&&command[2]===scale));assert.ok(commands.some(command=>command[0]==='translate'&&command[1]===offsetX&&command[2]===offsetY));
      assert.equal(JSON.stringify(player),before);
    }
  }
});

test('rostos e monstros antigos não são acessados pela animação',()=>{
  const assets={...makeAssets()};for(const key of ['demon','face','skull','shadow','watching','redPortrait'])Object.defineProperty(assets,key,{get(){throw Error('Figura antiga: '+key);}});
  const phase=timeline(25);for(let time=phase.start;time<phase.end;time+=.1){const {g}=recorder();assert.doesNotThrow(()=>draw(g,1280,720,time,25,null,{assets}));}
});

test('olhos ausentes ou ainda carregando não interrompem o jogo',()=>{
  for(const assets of [{},{eyes:{width:400,height:100,complete:false}}]){const {g,commands}=recorder();assert.doesNotThrow(()=>draw(g,390,844,12,25,null,{assets}));assert.equal(commands.filter(command=>command[0]==='drawImage').length,0);}
  const {g,commands}=recorder();draw(g,1280,720,24,25);assert.equal(commands.length,0,'a sequência encerrada não modifica o cenário normal');
});
