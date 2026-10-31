/* Exemplos gerados localmente (sem direitos de músicas comerciais). */
(function () {
'use strict';
// ====== SINTETIZADOR: músicas de exemplo geradas por código ======
function makeRng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

const DEMO_SONGS = {
  rock: { name: 'Garagem 120', style: 'Rock, 120 BPM' },
  funk: { name: 'Ladeira 96', style: 'Funk, 96 BPM' },
  voz: {name:'Ensaio vocal',style:'Voz sintetizada, baixo e bateria · 100 BPM'}
};

function synthSong(kind, sr) {
  sr = sr || 44100;
  if(kind==='voz')return synthVocalSong(sr);
  const rock = kind === 'rock';
  const bpm = rock ? 120 : 96, bars = rock ? 34 : 28;
  const spb = 60 / bpm, step = spb / 4;
  const len = Math.ceil((bars * 4 * spb + 2.5) * sr);
  const out = new Float32Array(len);
  const outs = { drums: new Float32Array(len), bass: new Float32Array(len), guitar: new Float32Array(len), keys: new Float32Array(len) };
  let W = 'drums';
  const rnd = makeRng(rock ? 1234 : 987);
  const chartEvents = {guitarra:[],baixo:[],bateria:[],teclado:[],vocal:[]};
  const truth = { kick: [], snare: [], hat: [], crash: [], bass: [], guitar: [], keys: [] };
  const bassRoot = [55, 43.65, 65.41, 49.0];
  const gtrRoot = [110, 87.31, 130.81, 98.0];
  const chords = [[220, 261.63, 329.63], [174.61, 220, 261.63], [261.63, 329.63, 392], [196, 246.94, 293.66]];
  let nPrev = 0;
  const noise = () => rnd() * 2 - 1;

  function voice(t0, dur, fn) {
    const i0 = Math.floor(t0 * sr), n = Math.floor(dur * sr);
    for (let i = 0; i < n && i0 + i < len; i++) outs[W][i0 + i] += fn(i / sr);
  }
  function kick(t0, v) {
    W = 'drums';
    let ph = 0;
    chartEvents.bateria.push({t:t0,lane:0,pitch:36,dur:0,s:1}); truth.kick.push(t0);
    voice(t0, 0.32, t => {
      const f = 48 + 120 * Math.exp(-t / 0.035);
      ph += 2 * Math.PI * f / sr;
      return (Math.sin(ph) * Math.exp(-t / 0.11) * 0.95 + noise() * Math.exp(-t / 0.002) * 0.25) * v;
    });
  }
  function snare(t0, v) {
    W = 'drums';
    chartEvents.bateria.push({t:t0,lane:1,pitch:38,dur:0,s:v}); truth.snare.push(t0);
    voice(t0, 0.22, t => {
      const nn = noise(), hp = nn - nPrev * 0.7; nPrev = nn;
      return (hp * 0.55 * Math.exp(-t / 0.06) + Math.sin(2 * Math.PI * 190 * t) * 0.45 * Math.exp(-t / 0.05)) * v * 0.8;
    });
  }
  function hat(t0, open, v) {
    W = 'drums';
    chartEvents.bateria.push({t:t0,lane:2,pitch:42,dur:0,s:v}); truth.hat.push(t0);
    const dec = open ? 0.07 : 0.012;
    voice(t0, open ? 0.3 : 0.06, t => {
      const nn = noise(), hp = nn - nPrev; nPrev = nn;
      return hp * 0.2 * Math.exp(-t / dec) * v;
    });
  }
  function crash(t0) {
    W = 'drums';
    chartEvents.bateria.push({t:t0,lane:3,pitch:49,dur:0,s:1}); truth.crash.push(t0);
    voice(t0, 1.3, t => {
      const nn = noise(), hp = nn - nPrev; nPrev = nn;
      return hp * 0.28 * Math.exp(-t / 0.4);
    });
  }
  function bass(t0, f, l, v) {
    W = 'bass';
    chartEvents.baixo.push({t:t0,pitch:Math.round(69+12*Math.log2(f/440)),dur:l,s:v}); truth.bass.push(t0);
    voice(t0, l + 0.1, t => {
      const env = Math.min(1, t / 0.004) * Math.exp(-t / 0.3) * (t < l ? 1 : Math.max(0, 1 - (t - l) / 0.1));
      return (Math.sin(2 * Math.PI * f * t) + 0.45 * Math.sin(4 * Math.PI * f * t) + 0.2 * Math.sin(6 * Math.PI * f * t)) * 0.35 * env * v;
    });
  }
  function guitar(t0, f, v) {
    W = 'guitar';
    chartEvents.guitarra.push({t:t0,pitch:Math.round(69+12*Math.log2(f/440)),dur:.25,s:v}); truth.guitar.push(t0);
    const fs = [f, f * 1.4983, f * 2];
    voice(t0, 0.3, t => {
      let x = 0;
      for (const ff of fs) for (let h = 1; h <= 5; h++) x += Math.sin(2 * Math.PI * ff * h * t) / h;
      return Math.tanh(x * 0.5) * 0.3 * Math.min(1, t / 0.002) * Math.exp(-t / 0.22) * v;
    });
  }
  function keys(t0, fl, l) {
    W = 'keys';
    fl.forEach(f=>chartEvents.teclado.push({t:t0,pitch:Math.round(69+12*Math.log2(f/440)),dur:l,s:.8})); truth.keys.push(t0);
    voice(t0, l + 0.15, t => {
      let x = 0;
      for (const f of fl) x += Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t);
      const env = Math.min(1, t / 0.01) * Math.exp(-t / 0.5) * (t < l ? 1 : Math.max(0, 1 - (t - l) / 0.15));
      return x * 0.1 * env;
    });
  }

  for (let b = 0; b < bars; b++) {
    const c = b % 4;
    for (let s = 0; s < 16; s++) {
      const t = (b * 16 + s) * step;
      if (rock) {
        const drums = b >= 2, full = b >= 4;
        if (drums) {
          if (s === 0 || s === 8 || s === (b % 2 ? 6 : 10)) kick(t, 1);
          const fill = b % 8 === 7 && s >= 12;
          if (s === 4 || s === 12 || fill) snare(t, fill ? 0.7 : 1);
        }
        if (s % 2 === 0) hat(t, s === 14 && b % 2 === 1, s % 4 === 0 ? 1 : 0.7);
        if (full && b % 4 === 0 && s === 0) crash(t);
        if (s % 2 === 0) bass(t, bassRoot[c] * (s === 6 || s === 14 ? 2 : 1), step * 1.8, 1);
        if (full && [0, 3, 6, 8, 11, 14].includes(s)) guitar(t, gtrRoot[c], 1);
        if (b >= 8 && (s === 0 || s === 8)) keys(t, chords[c], 0.5);
      } else {
        const drums = b >= 2, full = b >= 4;
        if (drums) {
          if (s === 0 || s === 3 || s === 10 || (b % 2 && s === 7)) kick(t, 1);
          if (s === 4 || s === 12) snare(t, 1);
        }
        hat(t, s === 14 && b % 2 === 0, [1, 0.5, 0.8, 0.5][s % 4]);
        if (full && b % 8 === 0 && s === 0) crash(t);
        if ([0, 3, 6, 10, 13].includes(s)) bass(t, bassRoot[c] * (s === 6 ? 2 : 1), step * 1.6, 1);
        if (full && [2, 5, 9, 12, 15].includes(s)) guitar(t, gtrRoot[c] * 2, 0.9);
        if (b >= 6 && [3, 7, 11].includes(s)) keys(t, chords[c], 0.22);
      }
    }
  }
  for (let i = 0; i < len; i++) out[i] = outs.drums[i] + outs.bass[i] + outs.guitar[i] + outs.keys[i];
  let peak = 0;
  for (let i = 0; i < len; i++) { const a = Math.abs(out[i]); if (a > peak) peak = a; }
  const g = peak > 0 ? 0.9 / peak : 1;
  for (let i = 0; i < len; i++) { out[i] *= g; outs.drums[i] *= g; outs.bass[i] *= g; outs.guitar[i] *= g; outs.keys[i] *= g; }
  return { events: chartEvents, samples: out, stems: { bateria: outs.drums, baixo: outs.bass, guitarra: outs.guitar, teclado: outs.keys }, sr, truth, bpm, name: DEMO_SONGS[kind].name };
}


function synthVocalSong(sr) {
  const duration=25,n=Math.ceil(duration*sr),stems={vocal:new Float32Array(n),baixo:new Float32Array(n),bateria:new Float32Array(n)};
  const events={vocal:[],baixo:[],bateria:[],guitarra:[],teclado:[]};
  for(let beat=0;beat<40;beat++) {
    const t=beat*.6;
    events.baixo.push({t,pitch:40+(beat%4)*2,dur:.42,s:.8});events.bateria.push({t,pitch:beat%2?38:36,lane:beat%2,dur:0,s:.9});
    for(let j=0;j<sr*.45&&Math.floor(t*sr)+j<n;j++) {const at=Math.floor(t*sr)+j,sec=j/sr;stems.baixo[at]+=.12*Math.sin(2*Math.PI*82.4*Math.pow(2,(beat%4)*2/12)*sec)*Math.exp(-sec*6);stems.bateria[at]+=.12*Math.sin(2*Math.PI*(beat%2?190:60)*sec)*Math.exp(-sec*35);}
    if(beat>3&&beat%4!==3) {const pitch=[60,62,64,67,65][Math.floor(beat/2)%5],dur=.46,f=440*Math.pow(2,(pitch-69)/12);events.vocal.push({t,pitch,dur,s:.8});for(let j=0;j<dur*sr&&Math.floor(t*sr)+j<n;j++){const sec=j/sr;let wave=0;for(let h=1;h<=8;h++)wave+=Math.sin(2*Math.PI*f*h*sec)/h;stems.vocal[Math.floor(t*sr)+j]+=.12*wave*Math.min(1,sec/.03)*Math.min(1,(dur-sec)/.04);}}
  }
  const samples=new Float32Array(n);for(let j=0;j<n;j++)for(const k in stems)samples[j]+=stems[k][j];
  return {samples,stems,events,sr,bpm:100,name:'Ensaio vocal'};
}

window.JamDemos = Object.freeze({ DEMO_SONGS, synthSong, makeRng });
})();
