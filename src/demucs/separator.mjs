// Copyright (c) 2026 Hamidreza Sadeghi
// SPDX-License-Identifier: MIT

import { mixingMatrix } from './config.mjs';
import { OverlapAdd, transitionWeight } from './overlap.mjs';
import { Spectrogram } from './spectrogram.mjs';

/**
 * @typedef {object} Backend
 * @property {object} ort the ONNX Runtime namespace (`onnxruntime-node` or `onnxruntime-web`)
 * @property {object} [session] an open `InferenceSession`
 * @property {object[]} [sessions] several of them, to be blended; see `weights`
 * @property {(number[]|null)[]} [weights] per-stem mixing weights, one row per session
 * @property {import('./config.mjs').ModelConfig} config the graph's geometry
 * @property {string} [device] the provider that ended up in charge, for reporting
 */

/**
 * @typedef {object} SeparatorOptions
 * @property {number} [batch] chunks per inference call; 0 means 1 on CPU and 4 on an accelerator
 * @property {number} [overlap] chunk overlap; demucs' default is 0.25
 * @property {number} [transitionPower] shapes the cross-fade ramp
 * @property {boolean} [pipeline] build the next batch while the current one is in the network
 */

/**
 * Chunked separation on top of the exported graph.
 *
 * The chunk offsets, the triangular cross-fade and the global normalisation are demucs' own, so
 * the output matches `apply_model(split=True, shifts=0)`. What differs is the scheduling:
 * consecutive chunks are batched into one inference call (upstream feeds them one at a time,
 * which leaves a GPU idle), the next batch's spectrogram is built while the current one is in the
 * network, and output is streamed out as it is finalised.
 *
 * Bags of models (`htdemucs_ft`, `mdx`, `mdx_extra`, ...) are handled here too: every member sees
 * the same chunk, and their `spec` and `wav` outputs are blended with the manifest's per-stem
 * weights before the single ISTFT. Upstream instead runs each member over the whole track and adds
 * up the finished stems; the results agree because the ISTFT, the cross-fade and the
 * denormalisation are all linear, and this way the expensive half is done once.
 */
export class Separator {
  #ort;
  #sessions;
  #config;
  #device;
  #options;
  #spectrogram;
  #batch;
  #weight;
  #busy = false;
  #checkedFinite = false;
  /** Row-major `[model][source]` blend weights; null unless this is a bag. */
  #mixing = null;
  /** Indices of the members that own at least one stem, in the order they are run. */
  #active;
  /** Where the members are summed before the single ISTFT; empty for a lone graph. */
  #partSpec = null;
  #partWav = null;

  /**
   * @param {Backend} backend a runtime, an open session and its geometry
   * @param {SeparatorOptions} [options]
   */
  constructor(backend, options = {}) {
    this.#ort = backend.ort;
    this.#sessions = backend.sessions ?? [backend.session];
    this.#config = backend.config;
    this.#device = backend.device ?? 'cpu';
    this.#options = {
      batch: 0,
      overlap: 0.25,
      transitionPower: 1,
      pipeline: true,
      ...options,
    };

    const config = this.#config;
    this.#batch = this.#options.batch || (this.#device === 'cpu' ? 1 : 4);
    if (this.#batch > 1 && !config.dynamicBatch) {
      throw new Error(
        'this graph has a fixed batch of 1; re-export it with tools/export_onnx.py, ' +
          'which enables a dynamic batch axis',
      );
    }

    this.#spectrogram = new Spectrogram(config.nfft, config.hop, config.channels, config.segment);
    if (this.#spectrogram.frames !== config.frames) {
      throw new Error(
        `the STFT produces ${this.#spectrogram.frames} frames ` +
          `but the graph expects ${config.frames}`,
      );
    }

    this.#mixing = mixingMatrix(
      backend.weights ?? this.#sessions.map(() => null),
      config.sourceCount,
    );
    this.#active = this.#mixing
      ? this.#mixing.flatMap((row, index) => (row.some((w) => w !== 0) ? [index] : []))
      : [0];
    if (this.#mixing) {
      const stems = this.#batch * config.sourceCount;
      this.#partSpec = new Float32Array(stems * this.#spectrogram.itemSize);
      this.#partWav = new Float32Array(stems * config.channels * config.segment);
    }

    this.#weight = transitionWeight(config.segment, this.#options.transitionPower);
  }

  /** @returns {import('./config.mjs').ModelConfig} */
  get config() {
    return this.#config;
  }

  /** The execution provider in charge. */
  get device() {
    return this.#device;
  }

  /** Chunks per inference call. */
  get batch() {
    return this.#batch;
  }

  /** How many networks each chunk goes through. */
  get models() {
    return this.#sessions.length;
  }

  /** @returns {string[]} */
  get sources() {
    return this.#config.sources;
  }

  get sampleRate() {
    return this.#config.sampleRate;
  }

  get channels() {
    return this.#config.channels;
  }

  /**
   * Separates planar `[channels][samples]` audio, handing finalised spans to `sink`.
   *
   * Spans arrive in order, are contiguous and never overlap. `block` is
   * `[sources][channels][count]`, planar, and is reused between calls -- copy it if you need to
   * keep it. A sink may return a promise, which is awaited before the next batch starts.
   *
   * @param {Float32Array} mix planar input
   * @param {number} samples samples per channel
   * @param {(offset: number, count: number, block: Float32Array) => void|Promise<void>} sink
   * @param {(done: number, total: number) => void} [progress] chunk counts
   */
  async separate(mix, samples, sink, progress) {
    if (samples <= 0) {
      return;
    }
    if (this.#busy) {
      throw new Error('this separator is already running; open one per concurrent track');
    }
    this.#busy = true;
    try {
      await this.#separate(mix, samples, sink, progress);
    } finally {
      this.#busy = false;
    }
  }

  /**
   * Convenience wrapper that keeps the whole result in memory, laid out as
   * `[sources][channels][samples]`.
   *
   * @param {Float32Array} mix planar input
   * @param {number} samples samples per channel
   * @returns {Promise<Float32Array>}
   */
  async separateToArray(mix, samples) {
    const planes = this.#config.sourceCount * this.#config.channels;
    const output = new Float32Array(planes * samples);
    await this.separate(mix, samples, (offset, count, block) => {
      for (let plane = 0; plane < planes; plane++) {
        output.set(block.subarray(plane * count, (plane + 1) * count), plane * samples + offset);
      }
    });
    return output;
  }

  /**
   * Times the full pipeline on synthetic audio.
   *
   * A run shorter than one chunk is rounded up to one: the v3 models are 44 s per chunk unless
   * they were exported smaller, and half a chunk is not a thing this can time. `audioSeconds`
   * says what was actually run.
   *
   * @param {number} [seconds] audio to generate
   * @returns {Promise<{device: string, batch: number, models: number, audioSeconds: number,
   *                    elapsed: number, realtimeFactor: number}>}
   */
  async benchmark(seconds = 30) {
    const config = this.#config;
    const frames = Math.max(Math.round(seconds * config.sampleRate), config.segment);
    const noise = new Float32Array(config.channels * frames);
    let state = 0x9e3779b9;
    for (let i = 0; i < noise.length; i++) {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      noise[i] = (state / 0x80000000) * 0.05;
    }

    // One warm-up chunk so the measured run is not paying for lazy kernel selection.
    await this.separate(noise, config.segment, () => {});

    const started = performance.now();
    await this.separate(noise, frames, () => {});
    const elapsed = (performance.now() - started) / 1000;

    const audioSeconds = frames / config.sampleRate;
    return {
      device: this.#device,
      batch: this.#batch,
      models: this.#sessions.length,
      audioSeconds,
      elapsed,
      realtimeFactor: audioSeconds / elapsed,
    };
  }

  /** Releases every session. The separator is unusable afterwards. */
  async close() {
    for (const session of this.#sessions) {
      await session.release?.();
    }
  }

  // --------------------------------------------------------------------------------- internal

  async #separate(mix, samples, sink, progress) {
    const config = this.#config;
    const { channels, segment } = config;
    const sources = config.sourceCount;
    const planes = sources * channels;

    const { mean, gain } = referenceStats(mix, samples, channels);
    const stride = Math.max(1, Math.floor((1 - this.#options.overlap) * segment));
    const chunkCount = Math.ceil(samples / stride);
    const groups = Math.ceil(chunkCount / this.#batch);

    const capacity = segment + (this.#batch - 1) * stride;
    const frames = [this.#newFrame(), this.#newFrame()];
    const accumulator = new OverlapAdd(planes, capacity);
    const stems = new Float32Array(this.#batch * planes * segment);
    const ready = new Float32Array(planes * capacity);

    this.#fillFrame(frames[0], 0, stride, mix, samples, mean, gain);

    for (let group = 0; group < groups; group++) {
      const current = frames[group % 2];
      const next = frames[(group + 1) % 2];
      const count = current.count;

      // Hand the batch to the network first. `run` does its work on a background thread inside
      // the native binding, so building the next batch's spectrogram below genuinely overlaps
      // with the inference rather than queueing behind it.
      const pending = this.#startInference(this.#active[0], current, count);
      const hasNext = group + 1 < groups;
      if (hasNext && this.#options.pipeline) {
        this.#fillFrame(next, group + 1, stride, mix, samples, mean, gain);
      }

      const outputs = await this.#blend(await pending, current, count);
      try { this.#finishInference(outputs, count, stems); } finally { for(const tensor of Object.values(outputs))tensor.dispose?.(); }

      if (hasNext && !this.#options.pipeline) {
        this.#fillFrame(next, group + 1, stride, mix, samples, mean, gain);
      }

      for (let slot = 0; slot < count; slot++) {
        const chunk = current.chunks[slot];
        const at = slot * planes * segment + chunk.trim;
        accumulator.add(chunk.offset, stems, at, segment, chunk.length, this.#weight);
      }

      const last = current.chunks[count - 1];
      const flushed = accumulator.flush(Math.min(samples, last.offset + stride), ready);
      if (flushed > 0 && sink) {
        // Undo the global normalisation only on the samples that are actually leaving.
        const total = planes * flushed;
        for (let i = 0; i < total; i++) {
          ready[i] = ready[i] * gain + mean;
        }
        await sink(accumulator.base - flushed, flushed, ready.subarray(0, total));
      }

      if (progress) {
        progress(Math.min(chunkCount, (group + 1) * this.#batch), chunkCount);
      }
    }
  }

  #newFrame() {
    const config = this.#config;
    return {
      mix: new Float32Array(this.#batch * config.channels * config.segment),
      mag: new Float32Array(this.#batch * this.#spectrogram.itemSize),
      chunks: [],
      count: 0,
    };
  }

  /** Cuts, pads, normalises and transforms one batch of chunks. */
  #fillFrame(frame, group, stride, mix, samples, mean, gain) {
    const { channels, segment } = this.#config;

    frame.mix.fill(0);
    frame.chunks.length = 0;

    for (let slot = 0; slot < this.#batch; slot++) {
      const offset = (group * this.#batch + slot) * stride;
      if (offset >= samples) {
        break;
      }

      const length = Math.min(samples - offset, segment);
      const delta = segment - length;
      // Short chunks are centred, exactly as demucs does it, so `start` may fall before the
      // track begins and `at` shifts the copy to compensate.
      const trim = Math.floor(delta / 2);
      const start = offset - trim;
      const from = Math.max(0, start);
      const to = Math.min(samples, start + segment);
      const at = from - start;

      for (let c = 0; c < channels; c++) {
        const destination = (slot * channels + c) * segment + at;
        const source = c * samples + from;
        for (let i = 0; i < to - from; i++) {
          frame.mix[destination + i] = (mix[source + i] - mean) / gain;
        }
      }
      frame.chunks.push({ offset, length, trim });
    }

    frame.count = frame.chunks.length;
    this.#spectrogram.forward(frame.mix, frame.count, frame.mag);
  }

  /**
   * Runs the members that were not pipelined and folds them all together.
   *
   * Members run one after another rather than all at once: they share a device, and on the CPU
   * they share the machine, so overlapping them would only make them contend.
   */
  async #blend(first, frame, count) {
    if (!this.#mixing) {
      return first;
    }

    const config = this.#config;
    const [specName, wavName] = config.outputNames;
    const sources = config.sourceCount;
    const specPlane = this.#spectrogram.itemSize;
    const wavPlane = config.channels * config.segment;

    let outputs = first;
    for (let index = 0; index < this.#active.length; index++) {
      if (index > 0) {
        outputs = await this.#startInference(this.#active[index], frame, count);
      }
      // Every member is checked in its own right: the blend below reads each of them at the
      // full stem count, and a short one would be read past its end rather than reported.
      const spec = outputs[specName].data;
      this.#checkSpec(spec, count);
      this.#checkFinite(spec);

      const weights = this.#mixing[this.#active[index]];
      accumulate(this.#partSpec, spec, weights, count, specPlane, index === 0);
      accumulate(this.#partWav, outputs[wavName].data, weights, count, wavPlane, index === 0);
    }
    this.#checkedFinite = true;

    // The buffers are sized for a full batch; the last group is usually shorter.
    return {
      [specName]: { data: this.#partSpec.subarray(0, count * sources * specPlane) },
      [wavName]: { data: this.#partWav.subarray(0, count * sources * wavPlane) },
    };
  }

  /** Wraps one batch's inputs and starts the inference on one member. */
  #startInference(model, frame, count) {
    const config = this.#config;
    const { channels, segment, freqBins, frames } = config;
    const Tensor = this.#ort.Tensor;

    const mixSize = count * channels * segment;
    const magSize = count * 2 * channels * freqBins * frames;
    const feeds = {
      [config.inputNames[0]]: new Tensor('float32', frame.mix.subarray(0, mixSize), [
        count,
        channels,
        segment,
      ]),
      [config.inputNames[1]]: new Tensor('float32', frame.mag.subarray(0, magSize), [
        count,
        2 * channels,
        freqBins,
        frames,
      ]),
    };
    return this.#sessions[model].run(feeds);
  }

  /**
   * A provider that overflows -- TensorRT asked for fp16 on this model is the known case --
   * returns NaN for every sample, and the only symptom downstream is a file full of silence.
   * Checked on the first batch only.
   */
  #checkFinite(spec) {
    if (this.#checkedFinite) {
      return;
    }
    for (let i = 0; i < spec.length; i++) {
      if (!Number.isFinite(spec[i])) {
        throw new Error(
          `the network returned a non-finite '${this.#config.outputNames[0]}'. Half precision ` +
            'overflows on this model with some providers; use the fp32 graph, or the fp16 ' +
            'one from export_onnx.py --fp16 rather than asking the provider to convert',
        );
      }
    }
  }

  /**
   * The graph declares its outputs symbolically, so this is the first point at which the stem
   * count can actually be checked against what the network produced.
   */
  #checkSpec(spec, count) {
    const config = this.#config;
    const expected = count * config.sourceCount * this.#spectrogram.itemSize;
    if (spec.length !== expected) {
      throw new Error(
        `'${config.outputNames[0]}' holds ${spec.length} values, expected ${expected} for ` +
          `${config.sourceCount} stems; the sidecar and the graph disagree`,
      );
    }
  }

  /** ISTFT of the spectral branch, plus the waveform branch. */
  #finishInference(outputs, count, stems) {
    const config = this.#config;
    const spec = outputs[config.outputNames[0]].data;
    const wav = outputs[config.outputNames[1]].data;

    this.#checkSpec(spec, count);
    this.#checkFinite(spec);
    this.#checkedFinite = true;

    this.#spectrogram.inverse(spec, count * config.sourceCount, stems);

    // The network splits its prediction between a spectral and a waveform branch; the stem is
    // the sum of the two.
    const used = count * config.sourceCount * config.channels * config.segment;
    for (let i = 0; i < used; i++) {
      stems[i] += wav[i];
    }
  }
}

/** `out[b][s] = weight[s] * part[b][s]` for the first member, `+=` for the rest. */
function accumulate(out, part, weights, count, plane, overwrite) {
  const sources = weights.length;
  for (let slot = 0; slot < count * sources; slot++) {
    const weight = weights[slot % sources];
    const at = slot * plane;
    if (overwrite) {
      for (let i = 0; i < plane; i++) {
        out[at + i] = weight * part[at + i];
      }
    } else if (weight !== 0) {
      for (let i = 0; i < plane; i++) {
        out[at + i] += weight * part[at + i];
      }
    }
  }
}

/** demucs normalises by the mean and standard deviation of the mono downmix of the whole track. */
function referenceStats(mix, samples, channels) {
  let sum = 0;
  let sumSquares = 0;
  for (let i = 0; i < samples; i++) {
    let value = 0;
    for (let c = 0; c < channels; c++) {
      value += mix[c * samples + i];
    }
    value /= channels;
    sum += value;
    sumSquares += value * value;
  }
  const mean = sum / samples;
  const variance = Math.max(0, sumSquares / samples - mean * mean);
  return { mean, gain: Math.sqrt(variance) + 1e-8 };
}
