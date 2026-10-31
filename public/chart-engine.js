/* Regras próprias de chart: ataques reais, sustentações reais e dificuldade sem deslocar o áudio. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.JamCharts = factory();
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';
  const CONFIG = { facil: { lanes: 3, gap: .30, chord: 1 }, medio: { lanes: 4, gap: .19, chord: 1 }, dificil: { lanes: 5, gap: .115, chord: 2 }, expert: { lanes: 5, gap: .075, chord: 3 } };
  const INSTRUMENTS = ['guitarra', 'baixo', 'bateria', 'teclado', 'vocal'];
  function build(events, instrument, difficulty, duration) {
    const cfg = CONFIG[difficulty] || CONFIG.medio;
    const lanes = Math.min(cfg.lanes, ['baixo', 'bateria'].includes(instrument) ? 4 : 5);
    const source = (events || []).filter(e => Number.isFinite(e.t) && e.t >= 0 && e.t < duration && Number.isFinite(e.pitch ?? e.lane))
      .slice().sort((a, b) => a.t - b.t || (b.s || .5) - (a.s || .5));
    const pitches = [...new Set(source.map(e => e.pitch))].filter(Number.isFinite).sort((a, b) => a - b);
    const pitchLane = pitch => Math.min(lanes - 1, Math.floor(pitches.indexOf(pitch) / Math.max(1, pitches.length) * lanes));
    const groups = [];
    for (const e of source) {
      const g = groups.at(-1);
      if (g && Math.abs(e.t - g.t) < .025) g.events.push(e);
      else groups.push({ t: e.t, events: [e] });
    }
    const selected = [];
    for (const g of groups) {
      const prev = selected.at(-1);
      const strength = Math.max(...g.events.map(e => e.s || .5));
      if (prev && g.t - prev.t < cfg.gap) {
        if (strength > prev.strength * 1.4) selected[selected.length - 1] = { ...g, strength };
      } else selected.push({ ...g, strength });
    }
    const notes = [];
    let previousLane = -1, previousTime = -1;
    for (const g of selected) {
      const used = new Set();
      const candidates = g.events.slice().sort((a, b) => (b.s || .5) - (a.s || .5));
      const maxChord = instrument === 'vocal' ? 1 : cfg.chord;
      for (const e of candidates) {
        if (used.size >= maxChord) break;
        let lane = instrument === 'bateria' ? Math.min(lanes - 1, Math.max(0, e.lane || 0)) : pitchLane(e.pitch);
        if (difficulty === 'facil' && previousLane >= 0 && g.t - previousTime < .45 && Math.abs(lane - previousLane) > 1) lane = previousLane + Math.sign(lane - previousLane);
        if (used.has(lane)) continue;
        used.add(lane);
        const dur = instrument !== 'bateria' && e.dur >= .32 ? Math.min(e.dur, duration - e.t) : 0;
        notes.push({ t: +e.t.toFixed(4), lane, dur: +dur.toFixed(4), s: e.s || .5 });
        previousLane = lane; previousTime = g.t;
      }
    }
    notes.sort((a, b) => a.t - b.t || a.lane - b.lane);
    // Evita exigir duas teclas iguais sobrepostas. Não inventa sustain no silêncio.
    const nextByLane = new Map();
    for (let i = notes.length-1; i >= 0; i--) {
      const next = nextByLane.get(notes[i].lane);
      if (notes[i].dur) {
      if (next) notes[i].dur = Math.max(0, Math.min(notes[i].dur, next.t - notes[i].t - .04));
      if (notes[i].dur < .30) notes[i].dur = 0;
      }
      nextByLane.set(notes[i].lane,notes[i]);
    }
    return { notes, laneCount: lanes };
  }
  function detect({ ratio, activeSeconds, eventCount, instrument }) {
    const threshold = instrument === 'teclado' ? .105 : instrument === 'vocal' ? .075 : .055;
    return ratio >= threshold && activeSeconds >= .5 && eventCount >= (instrument === 'bateria' ? 3 : 2);
  }
  function fromManifest(manifest,instrument,difficulty,duration){
    if(manifest.source==='chart'){
      const chart=manifest.charts?.[instrument]?.[difficulty];
      if(!chart)throw Error('Esta partitura não inclui essa dificuldade.');
      return{laneCount:chart.laneCount,notes:chart.notes.map(n=>({...n}))};
    }
    return build(manifest.events[instrument],instrument,difficulty,duration);
  }
  return { build, fromManifest, detect, CONFIG, INSTRUMENTS };
});
