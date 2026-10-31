/* IA local; o servidor recebe somente o resultado. Cache limitado a três músicas. */
(function () {
  'use strict';
  const CACHE_VERSION='fft6s-basicpitch-pcm8-v2';
  async function database() {
    return new Promise((resolve,reject)=>{
      const request=indexedDB.open('guitaband-prepared',1);
      request.onupgradeneeded=()=>request.result.createObjectStore('songs',{keyPath:'id'});
      request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
    });
  }
  async function cached(id,value) {
    let db;
    try {
      db=await database();
      if(!value)return await new Promise((resolve,reject)=>{const request=db.transaction('songs').objectStore('songs').get(id);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
      await new Promise((resolve,reject)=>{const tx=db.transaction('songs','readwrite');tx.objectStore('songs').put({id,...value,savedAt:Date.now()});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
      const keys=await new Promise((resolve,reject)=>{const r=db.transaction('songs').objectStore('songs').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
      const old=keys.sort((a,b)=>b.savedAt-a.savedAt).slice(3);
      if(old.length)await new Promise(resolve=>{const tx=db.transaction('songs','readwrite');old.forEach(item=>tx.objectStore('songs').delete(item.id));tx.oncomplete=resolve;tx.onerror=resolve;});
    } catch {return null;} finally {db?.close();}
  }
  window.JamAI=class {
    constructor({room,getContext,onState,onReady,onBackground=()=>{},onQueue=()=>{},canProcess=null,gpu=false}) {
      Object.assign(this,{room,getContext,onReady,onBackground,onQueue,canProcess,gpu});this.key=null;this.task=null;this.worker=null;this.selection=0;this.states=new Map();this.queue={revision:-1,jobs:[]};
      this.onState=state=>{this.lastState=state;onState(state);};
      room.on('analysis',state=>{
        this.states.set(state.key,state);
        if(state.key===this.key){this.onState(state);if(state.status==='ready')this.ready(state.key).catch(error=>{if(state.key===this.key)this.onState({status:'error',message:error.message});});}
        else this.onBackground({...state,name:this.nameOf(state.key)});
      });
      room.on('analysisQueue',queue=>this.receiveQueue(queue));
      room.on('playlist',list=>{if(this.task&&!list.songs.some(song=>song.key===this.task.key))this.stopTask();this.refreshQueue();});
      room.on('closed',()=>{this.closed=true;clearInterval(this.poll);this.stopTask();});
      if(canProcess){this.refreshQueue();this.poll=setInterval(()=>this.refreshQueue(),15000);}
    }
    async refreshQueue() {
      if(this.closed)return;
      try{this.receiveQueue(await this.room.request('/api/analysis/queue'));}catch{}
    }
    receiveQueue(queue) {
      if(!Array.isArray(queue?.jobs)||(queue.revision??0)<this.queue.revision)return;
      this.queue=queue;
      queue.jobs.forEach(job=>this.states.set(job.key,job));
      if(this.task?.lease){
        const job=queue.jobs.find(j=>j.key===this.task.key);
        if(!job||job.status==='queued'||job.status==='error')this.stopTask();
      }
      this.onQueue(queue);this.schedule();
    }
    schedule() {
      if(this.scheduled||this.closed||Date.now()<(this.retryAfter||0)||!this.canProcess||!(this.useThisDevice||this.canProcess())||this.task||this.queue.jobs.some(j=>j.status==='running'))return;
      const next=this.queue.jobs.find(j=>j.status==='queued');if(!next)return;
      const meta=this.room.playlist?.songs.find(s=>s.key===next.key);if(!meta)return;
      this.scheduled=true;
      Promise.resolve().then(async()=>{
        this.scheduled=false;
        if(this.task||this.closed||this.queue.jobs.some(j=>j.status==='running')||this.queue.jobs.find(j=>j.status==='queued')?.key!==meta.key)return;
        const song=this.song?.key===meta.key?this.song:{key:meta.key,name:this.nameOf(meta.key)};
        try{await this.run(song);}catch{}
      });
    }
    async prioritize(key) {
      this.receiveQueue(await this.room.request('/api/analysis/prioritize',{key,method:'POST',body:{}}));
    }
    processHere() {
      this.useThisDevice=true;this.schedule();
    }
    stopTask() {
      const task=this.task;if(!task)return;
      this.task=null;this.worker=null;task.cancelled=true;task.worker?.terminate();clearInterval(task.heartbeat);task.reject?.(Error('A preparação mudou de lugar na fila.'));
    }
    nameOf(key) {
      if(this.task?.key===key)return this.task.song.name;
      const name=this.room.playlist?.songs.find(song=>song.key===key)?.name;
      try{return decodeURIComponent(name||'Música');}catch{return name||'Música';}
    }
    detach() {
      this.selection++;this.key=null;this.song=null;
      if(this.task)this.onBackground({...this.task.state,key:this.task.key,name:this.task.song.name});
    }
    async follow(song) {
      const selection=++this.selection;
      this.key=song.key;this.song=song;
      if(this.task&&this.task.key!==song.key)this.onBackground({...this.task.state,key:this.task.key,name:this.task.song.name});
      const state=await this.room.request('/api/analysis',{key:song.key});
      if(this.selection!==selection)return;
      this.states.set(song.key,state);
      this.onState(state);if(state.status==='ready')await this.ready(song.key);
    }
    async ready(key) {
      const selection=this.selection;
      const manifest=await this.room.request('/api/analysis/manifest',{key});
      if(this.task?.key===key)this.task.song.analysis=manifest;
      if(this.selection===selection&&this.key===key&&this.song?.key===key){this.song.analysis=manifest;this.onReady(manifest);}
    }
    async cancel() {
      const task=this.task;if(!task)return;
      this.stopTask();
      if(task.lease)await this.room.request('/api/analysis/cancel',{key:task.key,method:'POST',lease:task.lease,body:{}}).catch(()=>{});
      const state={status:'error',progress:0,message:'Preparação cancelada.'};this.states.set(task.key,state);
      this.onBackground({...state,key:task.key,name:task.song.name});
      if(this.key===task.key)this.onState(state);
      await this.refreshQueue();
    }
    async run(song=this.song) {
      if(!song||this.task)return;
      const task={key:song.key,song,cancelled:false,files:{},last:{p:0,text:'Preparando áudio…'},state:{status:'running',progress:0,message:'Preparando áudio…'}};this.task=task;
      const isCurrent=()=>!task.cancelled&&this.task===task;
      const update=state=>{if(isCurrent()){
        if(state.status==='running')task.last={p:state.progress||0,text:state.message||'Analisando…'};
        task.state=state;this.states.set(task.key,state);
        if(this.key===task.key)this.onState(state);
        this.onBackground({...state,key:task.key,name:task.song.name});
      }};
      try {
        const claim=await this.room.request('/api/analysis/claim',{key:task.key,method:'POST',body:{}});
        if(claim.status==='ready'){await this.ready(task.key);return;}
        task.lease=claim.lease;
        // Uma prioridade pode ter mudado enquanto a resposta de claim estava na rede.
        if(this.queue.revision>(claim.queueRevision??Infinity)&&this.queue.jobs.find(j=>j.key===task.key)?.status!=='running'){
          this.stopTask();return;
        }
        if(!isCurrent()){await this.room.request('/api/analysis/cancel',{key:task.key,method:'POST',lease:task.lease,body:{}}).catch(()=>{});return;}
        update(claim);
        task.heartbeat=setInterval(()=>this.room.request('/api/analysis/progress',{key:task.key,method:'POST',lease:task.lease,body:{progress:task.last.p,message:task.last.text}}).catch(()=>{}),3000);
        const cacheId=CACHE_VERSION+':'+task.key;
        const previous=await cached(cacheId);
        let manifest;
        if(previous?.manifest&&previous.files){
          manifest=previous.manifest;task.files=previous.files;
          update({status:'running',progress:.94,message:'Reutilizando a preparação salva neste aparelho…'});
          for(const instrument of manifest.instruments){if(!isCurrent())return;await this.room.uploadStem(task.key,instrument,task.files[instrument],task.lease);}
        } else {
          if(!task.song.buffer){
            const buffer=await this.getContext().decodeAudioData(await this.room.download(task.key));
            if(!isCurrent())return;
            task.song={...task.song,buffer,duration:buffer.duration};
          }
          if(task.song.duration>900)throw Error('O áudio deve ter até 15 minutos.');
          const offline=new OfflineAudioContext(2,Math.ceil(task.song.duration*44100),44100),source=offline.createBufferSource();
          source.buffer=task.song.buffer;source.connect(offline.destination);source.start();
          const audio=await offline.startRendering();if(!isCurrent())return;
          const runWorker=async compatibility=>{
          const left=audio.getChannelData(0).slice(),right=audio.getChannelData(1).slice();
          const worker=new Worker((this.gpu&&!compatibility?'/ai-worker-gpu.js':'/ai-worker.js')+'?v=1.3.1');task.worker=worker;this.worker=worker;
          let uploads=Promise.resolve();
          try{return await new Promise((resolve,reject)=>{
            task.reject=reject;
            worker.onerror=error=>reject(Object.assign(Error(error.message||'Este aparelho não conseguiu iniciar a preparação.'),{fromWorker:true}));
            worker.onmessage=({data})=>{
              if(!isCurrent())return;
              if(data.type==='progress'){task.last=data;update({status:'running',progress:data.p,message:data.text});}
              if(data.type==='stem'){
                const blob=new Blob([data.bytes],{type:'audio/wav'});task.files[data.key]=blob;
                uploads=uploads.then(()=>{if(!isCurrent())throw Error('Preparação cancelada.');update({status:'running',progress:.97,message:'Compartilhando o resultado…'});return this.room.uploadStem(task.key,data.key,blob,task.lease);});
                uploads.catch(reject);
              }
              if(data.type==='error')reject(Object.assign(Error(data.message),{fromWorker:true}));
              if(data.type==='done')uploads.then(()=>resolve(data.manifest),reject);
            };
            worker.postMessage({type:'analyze',left,right,compatibility},[left.buffer,right.buffer]);
          });}finally{worker.terminate();if(task.worker===worker){task.worker=null;this.worker=null;}}
          };
          try{manifest=await runWorker(false);}catch(first){
            const compatible=first.fromWorker&&/backend|wasm|webassembly|worker|thread|sharedarraybuffer|bad_alloc|out of memory|allocation|cannot allocate/i.test(first.message);
            if(!isCurrent()||!compatible||Object.keys(task.files).length)throw first;
            update({status:'running',progress:0,message:'O motor falhou. Tentando modo compatível com um núcleo…'});
            try{manifest=await runWorker(true);}catch(second){
              const error=Error('Tentativa normal: '+first.message+'\nModo compatível: '+second.message);
              throw error;
            }
          }
        }
        if(!isCurrent())return;
        await this.room.request('/api/analysis/complete',{key:task.key,method:'POST',lease:task.lease,body:manifest});
        task.lease=null;task.song.analysis=manifest;await this.ready(task.key);
        await cached(cacheId,{manifest,files:task.files});
        update({status:'ready',progress:1});
      } catch(error) {
        if(isCurrent()){
          this.retryAfter=Date.now()+5000;
          const details=error.message||String(error),message=/bad_alloc|out of memory|allocation failed|cannot allocate/i.test(details)?'A análise ficou sem memória neste aparelho. Tente novamente ou use outro computador.':details;
          const diagnostic={message,details,stage:task.last.text,at:Date.now()};
          // Erro é diferente de cancelamento: preserva a causa na fila para todos da sala.
          if(task.lease)await this.room.request('/api/analysis/fail',{key:task.key,method:'POST',lease:task.lease,body:diagnostic}).catch(()=>this.room.request('/api/analysis/cancel',{key:task.key,method:'POST',lease:task.lease,body:{}}).catch(()=>{}));
          update({status:'error',progress:0,message,error:diagnostic});
        }
        if(!task.cancelled)throw error;
      } finally {
        task.worker?.terminate();clearInterval(task.heartbeat);
        if(this.task===task){
          this.task=null;this.worker=null;
          if(this.song)this.onState(this.song.analysis?{status:'ready',progress:1}:this.states.get(this.key)||{status:'idle',progress:0});
        }
        if(this.canProcess)await this.refreshQueue();
      }
    }
    async stem(instrument) {return this.getContext().decodeAudioData(await this.room.downloadStem(this.key,instrument));}
  };
})();
