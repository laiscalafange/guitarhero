// Copyright (c) 2026 Hamidreza Sadeghi
// SPDX-License-Identifier: MIT

const DEFAULT_SOURCES = ['drums', 'bass', 'other', 'vocals'];

/**
 * Model geometry, resolved from the ONNX graph itself.
 *
 * Tensor shapes come from the graph, which cannot disagree with itself; the human-readable parts
 * -- stem names, sample rate -- come from the sidecar JSON written by `tools/export_onnx.py`.
 */
export class ModelConfig {
  /**
   * @param {object} fields see the property list; every one is required except `extra`
   */
  constructor(fields) {
    /** @type {string} */
    this.name = fields.name;
    /** @type {string[]} */
    this.sources = [...fields.sources];
    /** @type {number} */
    this.sampleRate = fields.sampleRate;
    /** @type {number} */
    this.channels = fields.channels;
    /** samples per chunk fed to the network @type {number} */
    this.segment = fields.segment;
    /** @type {number} */
    this.nfft = fields.nfft;
    /** @type {number} */
    this.hop = fields.hop;
    /** nfft / 2; the Nyquist bin is dropped @type {number} */
    this.freqBins = fields.freqBins;
    /** @type {number} */
    this.frames = fields.frames;
    /** whether the graph accepts more than one chunk per call @type {boolean} */
    this.dynamicBatch = fields.dynamicBatch;
    /** @type {[string, string]} */
    this.inputNames = fields.inputNames;
    /** @type {[string, string]} */
    this.outputNames = fields.outputNames;
    /** the raw sidecar, for anything this class does not model @type {object} */
    this.extra = fields.extra ?? {};
    Object.freeze(this);
  }

  get sourceCount() {
    return this.sources.length;
  }

  get segmentSeconds() {
    return this.segment / this.sampleRate;
  }

  /**
   * Reads the geometry of an open session, filling in names from its sidecar.
   *
   * @param {import('onnxruntime-common').InferenceSession} session an open session
   * @param {{sidecar?: object, name?: string}} [options] parsed sidecar and a fallback model name
   * @returns {ModelConfig}
   */
  static fromSession(session, options = {}) {
    const sidecar = options.sidecar ?? {};
    const inputNames = [...session.inputNames];
    const outputNames = [...session.outputNames];
    if (inputNames.length !== 2 || outputNames.length !== 2) {
      throw new Error(
        `expected a 2-in/2-out graph, got ${inputNames.length}/${outputNames.length}`,
      );
    }

    const mix = shapeOf(session.inputMetadata, 0, 'mix');
    const mag = shapeOf(session.inputMetadata, 1, 'mag');
    const spec = shapeOf(session.outputMetadata, 0, 'spec');
    if (mix.length !== 3 || mag.length !== 4 || spec.length !== 5) {
      throw new Error(
        `unexpected tensor ranks: mix ${mix.length}, mag ${mag.length}, spec ${spec.length}`,
      );
    }

    const channels = dimension(mix[1], sidecar.audio_channels, 'mix channels');
    const segment = dimension(mix[2], sidecar.segment_samples, 'mix length');
    const freqBins = dimension(mag[2], sidecar.freq_bins, 'frequency bins');
    const frames = dimension(mag[3], sidecar.frames, 'frames');

    // torch.onnx.export cannot prove the output shapes, so it leaves every one of their
    // dimensions symbolic. The stem count therefore comes from the sidecar, and the graph is
    // only consulted when it does state a number.
    const declared = typeof spec[1] === 'number' ? spec[1] : null;
    const sources = sidecar.sources ?? DEFAULT_SOURCES.slice(0, declared ?? DEFAULT_SOURCES.length);
    if (declared !== null && sources.length !== declared) {
      throw new Error(
        `the sidecar lists ${sources.length} stems but the graph produces ${declared}`,
      );
    }

    return new ModelConfig({
      name: sidecar.name ?? options.name ?? 'htdemucs',
      sources,
      sampleRate: sidecar.samplerate ?? 44100,
      channels,
      segment,
      nfft: sidecar.nfft ?? freqBins * 2,
      // htdemucs uses 75 % frame overlap unless the sidecar says otherwise.
      hop: sidecar.hop ?? freqBins / 2,
      freqBins,
      frames,
      // A symbolic dimension comes back as a string; a fixed one as a number.
      dynamicBatch: typeof mix[0] !== 'number',
      inputNames,
      outputNames,
      extra: sidecar,
    });
  }

  /**
   * Why two graphs cannot be blended into one bag, or `null` if they can.
   *
   * @param {ModelConfig} other
   * @returns {string|null}
   */
  matches(other) {
    const checks = [
      ['stems', this.sources.join(', '), other.sources.join(', ')],
      ['sample rate', this.sampleRate, other.sampleRate],
      ['channels', this.channels, other.channels],
      ['segment length', this.segment, other.segment],
      ['frames', this.frames, other.frames],
      ['FFT size', this.nfft, other.nfft],
      // The members are fed and read back by name, so those have to line up too.
      ['input names', this.inputNames.join(', '), other.inputNames.join(', ')],
      ['output names', this.outputNames.join(', '), other.outputNames.join(', ')],
    ];
    for (const [label, mine, theirs] of checks) {
      if (mine !== theirs) {
        return `${label} differ: ${mine} vs ${theirs}`;
      }
    }
    return null;
  }

  toString() {
    const batch = this.dynamicBatch ? 'dynamic' : 'fixed at 1';
    return (
      `${this.name}: ${this.sourceCount} stems [${this.sources.join(', ')}], ` +
      `${this.sampleRate} Hz, ${this.channels} ch, ` +
      `segment ${this.segment} samples (${this.segmentSeconds.toFixed(2)} s), ` +
      `nfft ${this.nfft}/hop ${this.hop} -> ${this.freqBins}x${this.frames}, batch ${batch}`
    );
  }
}

/**
 * Normalised `[model][source]` weights, or `null` for a single graph.
 *
 * `htdemucs_ft`, `mdx`, `mdx_extra` and the quantised pair are *bags* -- several independently
 * trained networks whose stems are averaged with per-stem weights. Upstream sums
 * `weight * estimate` over the bag and divides each stem by the total weight it received; folding
 * that division in here makes the per-chunk blend a plain weighted sum.
 *
 * @param {(number[]|null|undefined)[]} weights one row per model; a missing row means an equal
 *   share of every stem
 * @param {number} sourceCount
 * @returns {number[][]|null}
 */
export function mixingMatrix(weights, sourceCount) {
  if (weights.length < 2) {
    return null;
  }

  const matrix = weights.map((row) => {
    if (!row) {
      return new Array(sourceCount).fill(1);
    }
    if (row.length !== sourceCount) {
      throw new Error(`bag weights have ${row.length} entries, model has ${sourceCount} stems`);
    }
    return [...row];
  });

  for (let s = 0; s < sourceCount; s++) {
    const total = matrix.reduce((sum, row) => sum + row[s], 0);
    if (total <= 0) {
      throw new Error(`no model in the bag contributes to stem ${s}`);
    }
    for (const row of matrix) {
      row[s] /= total;
    }
  }
  return matrix;
}

/** A concrete dimension from the graph, or the sidecar's word for it if the graph is symbolic. */
function dimension(value, fallback, label) {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof fallback === 'number') {
    return fallback;
  }
  throw new Error(`the graph leaves ${label} symbolic ('${value}') and the sidecar does not say`);
}

/**
 * ONNX Runtime exposes shapes as a mix of numbers and symbolic names; anything before 1.20 does
 * not expose them at all, which is worth saying plainly rather than failing on `undefined`.
 */
function shapeOf(metadata, index, label) {
  const entry = metadata?.[index];
  if (!entry) {
    throw new Error(
      'this ONNX Runtime build does not report tensor shapes; ' +
        'demucs-onnx needs onnxruntime >= 1.20',
    );
  }
  if (entry.isTensor === false) {
    throw new Error(`'${label}' is not a tensor`);
  }
  return [...entry.shape];
}
