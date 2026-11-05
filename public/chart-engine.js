/* Regras próprias de chart: ataques reais, sustentações reais e dificuldade sem deslocar o áudio. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.JamCharts = factory();
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';
  const CONFIG = { facil: { lanes: 3, gap: .30, chord: 1 }, medio: { lanes: 4, gap: .19, chord: 1 }, dificil: { lanes: 5, gap: .115, chord: 2 }, expert: { lanes: 5, gap: .075, chord: 3 } };
  const INSTRUMENTS = ['guitarra', 'baixo', 'bateria', 'teclado', 'vocal'];
  const strength = event => Number.isFinite(event.s) ? Math.max(0, Math.min(1, event.s)) : .5;
  function tonalVoices(events) {
    const pitches = new Map();
    for (const event of events) {
      const pitch = Math.round(event.pitch), previous = pitches.get(pitch);
      if (!previous || strength(event) > strength(previous)) pitches.set(pitch, { ...event, pitch });
    }
    const voices = [...pitches.values()].sort((a, b) => a.pitch - b.pitch);
    const peak = Math.max(0, ...voices.map(strength));
    // A quieter overtone must not turn every strum into a different chord.
    return voices.filter(event => strength(event) > 0 && strength(event) >= peak * .35);
  }
  function pitchHistogram(groups) {
    const histogram = new Map();
    for (const group of groups) {
      const sum = group.voices.reduce((total, event) => total + strength(event), 0);
      const peak = Math.max(0, ...group.voices.map(strength));
      for (const event of group.voices) {
        const weight = sum ? strength(event) / sum * peak : 0;
        histogram.set(event.pitch, (histogram.get(event.pitch) || 0) + weight);
      }
    }
    return [...histogram].sort((a, b) => a[0] - b[0]);
  }
  function settleOctaves(groups, instrument) {
    const histogram = pitchHistogram(groups), total = histogram.reduce((sum, entry) => sum + entry[1], 0);
    let accumulated = 0, register = 60;
    for (const [pitch, weight] of histogram) { accumulated += weight; if (accumulated >= total / 2) { register = pitch; break; } }
    for (const group of groups) {
      const classes = new Map();
      for (const voice of group.voices) {
        const key = voice.pitch % 12, previous = classes.get(key);
        // Keep a detected voice in the usual register instead of jumping to an octave double.
        if (!previous || (instrument !== 'baixo' && Math.abs(voice.pitch - register) < Math.abs(previous.pitch - register))) classes.set(key, voice);
      }
      group.voices = [...classes.values()].sort((a, b) => a.pitch - b.pitch);
    }
  }
  function pitchMapper(groups, lanes) {
    const pitches = pitchHistogram(groups);
    if (!pitches.length) return () => 0;
    const total = pitches.reduce((sum, entry) => sum + entry[1], 0);
    function quantile(fraction) {
      let sum = 0;
      for (const [pitch, weight] of pitches) { sum += weight; if (sum >= total * fraction) return pitch; }
      return pitches.at(-1)[0];
    }
    // Rare extremes may still be played, but do not squeeze the main riff into one key.
    const low = quantile(.04), high = quantile(.96);
    const core = pitches.filter(([pitch]) => pitch >= low && pitch <= high);
    const count = core.length, clusters = Math.min(lanes, count);
    const weights = [0], sums = [0], squares = [0];
    for (const [pitch, weight] of core) {
      weights.push(weights.at(-1) + weight);
      sums.push(sums.at(-1) + pitch * weight);
      squares.push(squares.at(-1) + pitch * pitch * weight);
    }
    function cost(start, end) {
      const weight = weights[end] - weights[start], sum = sums[end] - sums[start];
      return weight > 0 ? Math.max(0, squares[end] - squares[start] - sum * sum / weight) : 0;
    }
    // At most 128 MIDI pitches: contiguous, weighted clusters keep the mapping monotone.
    const costs = Array.from({ length: clusters + 1 }, () => Array(count + 1).fill(Infinity));
    const cuts = Array.from({ length: clusters + 1 }, () => Array(count + 1).fill(0));
    costs[0][0] = 0;
    for (let k = 1; k <= clusters; k++) for (let end = k; end <= count; end++) {
      for (let start = k - 1; start < end; start++) {
        const candidate = costs[k - 1][start] + cost(start, end);
        if (candidate < costs[k][end]) { costs[k][end] = candidate; cuts[k][end] = start; }
      }
    }
    const centers = [];
    let end = count;
    for (let k = clusters; k > 0; k--) {
      const start = cuts[k][end];
      const weight = weights[end] - weights[start];
      centers.unshift(weight > 0 ? (sums[end] - sums[start]) / weight : core[start][0]);
      end = start;
    }
    const offset = Math.floor((lanes - clusters) / 2);
    return pitch => {
      if (centers.length === 1) {
        const direction = pitch < centers[0] - .5 ? -1 : pitch > centers[0] + .5 ? 1 : 0;
        return Math.max(0, Math.min(lanes - 1, offset + direction));
      }
      let nearest = 0;
      for (let i = 1; i < centers.length; i++) if (Math.abs(pitch - centers[i]) < Math.abs(pitch - centers[nearest])) nearest = i;
      return offset + nearest;
    };
  }
  function build(events, instrument, difficulty, duration) {
    const cfg = CONFIG[difficulty] || CONFIG.medio;
    const lanes = Math.min(cfg.lanes, ['baixo', 'bateria'].includes(instrument) ? 4 : 5);
    const drums = instrument === 'bateria';
    const source = (events || []).filter(e => Number.isFinite(e.t) && e.t >= 0 && e.t < duration &&
      (drums ? Number.isFinite(e.pitch ?? e.lane) : Number.isFinite(e.pitch) && e.pitch >= 0 && e.pitch <= 127))
      .slice().sort((a, b) => a.t - b.t || (b.s || .5) - (a.s || .5));
    const groups = [];
    for (const e of source) {
      const g = groups.at(-1);
      if (g && Math.abs(e.t - g.t) < .025) g.events.push(e);
      else groups.push({ t: e.t, events: [e] });
    }
    const selected = [];
    for (const g of groups) {
      const prev = selected.at(-1);
      const power = Math.max(...g.events.map(e => drums ? e.s || .5 : strength(e)));
      if (!drums && power <= 0) continue;
      if (prev && g.t - prev.t < cfg.gap) {
        if (power > prev.strength * 1.4) selected[selected.length - 1] = { ...g, strength: power };
      } else selected.push({ ...g, strength: power });
    }
    if (!drums) {
      for (const group of selected) group.voices = tonalVoices(group.events);
      settleOctaves(selected, instrument);
    }
    const pitchLane = drums ? null : pitchMapper(selected, lanes);
    const notes = [];
    for (let index = 0; index < selected.length; index++) {
      const g = selected[index];
      const used = new Set();
      let candidates = drums ? g.events.slice().sort((a, b) => (b.s || .5) - (a.s || .5)) : g.voices;
      if (instrument === 'vocal') candidates = candidates.slice().sort((a, b) => strength(b) - strength(a) || a.pitch - b.pitch);
      let maxChord = ['vocal', 'baixo'].includes(instrument) ? 1 : cfg.chord;
      const nextTime = selected[index + 1]?.t ?? duration;
      // Three-key chords are for clear held voicings, not fast stacks of harmonics.
      if (!drums && maxChord > 2 && (nextTime - g.t < .32 || candidates.filter(event => event.dur >= .32).length < 3)) maxChord = 2;
      const pitchClasses = new Set();
      for (const e of candidates) {
        if (used.size >= maxChord) break;
        const lane = drums ? Math.min(lanes - 1, Math.max(0, Number.isFinite(e.lane) ? Math.trunc(e.lane) : 0)) : pitchLane(e.pitch);
        const pitchClass = e.pitch % 12;
        if (used.has(lane) || (!drums && pitchClasses.has(pitchClass))) continue;
        used.add(lane);
        pitchClasses.add(pitchClass);
        let dur = !drums && Number.isFinite(e.dur) && e.dur >= .32 ? Math.min(e.dur, duration - e.t) : 0;
        if (dur && ['facil', 'medio'].includes(difficulty)) dur = Math.max(0, Math.min(dur, nextTime - e.t - .07));
        if (dur < .30) dur = 0;
        notes.push({ t: +e.t.toFixed(4), lane, dur: +dur.toFixed(4), s: e.s || .5 });
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
