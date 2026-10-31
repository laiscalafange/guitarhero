// Copyright (c) 2026 Hamidreza Sadeghi
// SPDX-License-Identifier: MIT

import { RealFft } from './fft.mjs';

/**
 * The complex half of HTDemucs, which ONNX cannot express.
 *
 * `torch.stft` / `torch.istft` have no ONNX equivalent -- there is no ISTFT operator at all -- so
 * the exported graph is cut at the complex boundary and the spectrogram lives here. This
 * reproduces `HTDemucs._spec` and `HTDemucs._ispec`, padding quirks included: reflect-pad by
 * 3*hop/2, STFT with a periodic Hann window (normalised, centred), drop the Nyquist bin, drop two
 * frames at each end -- and the exact inverse of all that.
 *
 * Spectrograms use the "channels as complex" layout the model was trained with: plane 2c is the
 * real part of channel c, plane 2c+1 the imaginary part.
 *
 * Working buffers are kept on the instance and reused, so one instance serves one caller at a
 * time. That is what the separator wants anyway, and it keeps the per-chunk cost to the FFT.
 */
export class Spectrogram {
  #nfft;
  #hop;
  #channels;
  #length;
  #freqBins;
  #frames;
  #pad;
  #rightPad;
  #padded;
  #centred;
  #totalSamples;
  #trim;
  #forwardScale;
  #inverseScale;
  #window;
  #envelope;
  #fft;
  #scratch;
  #padding = new Float32Array(0);

  /**
   * @param {number} nfft FFT size, a multiple of `hop`
   * @param {number} hop samples between frames
   * @param {number} channels audio channels per batch item
   * @param {number} length samples per chunk
   */
  constructor(nfft, hop, channels, length) {
    if (nfft % hop !== 0) {
      throw new RangeError('nfft must be a multiple of hop');
    }
    this.#nfft = nfft;
    this.#hop = hop;
    this.#channels = channels;
    this.#length = length;

    this.#freqBins = nfft / 2; // the Nyquist bin is dropped
    this.#frames = Math.ceil(length / hop); // demucs' `le`
    this.#pad = Math.floor(hop / 2) * 3;
    this.#rightPad = this.#pad + this.#frames * hop - length;
    this.#padded = length + this.#pad + this.#rightPad;
    this.#centred = this.#padded + nfft;
    this.#trim = nfft / 2 + this.#pad;
    this.#forwardScale = 1 / Math.sqrt(nfft);
    this.#inverseScale = Math.sqrt(nfft);
    this.#fft = new RealFft(nfft);

    const totalFrames = 1 + this.#padded / hop; // == frames + 4
    this.#totalSamples = nfft + hop * (totalFrames - 1);

    this.#window = hannPeriodic(nfft);
    this.#envelope = new Float32Array(this.#totalSamples);
    for (let t = 0; t < totalFrames; t++) {
      for (let j = 0; j < nfft; j++) {
        this.#envelope[t * hop + j] += this.#window[j] * this.#window[j];
      }
    }

    this.#scratch = {
      windowed: new Float32Array(nfft),
      re: new Float32Array(this.#freqBins + 1),
      im: new Float32Array(this.#freqBins + 1),
      fft: new Float32Array(this.#fft.scratchLength),
      accumulator: new Float32Array(this.#totalSamples),
    };
  }

  /** Frequency bins kept, nfft / 2. */
  get freqBins() {
    return this.#freqBins;
  }

  /** STFT frames produced for one chunk. */
  get frames() {
    return this.#frames;
  }

  /** Floats one batch item occupies in a spectrogram tensor. */
  get itemSize() {
    return 2 * this.#channels * this.#freqBins * this.#frames;
  }

  /**
   * `[batch][channels][length]` -> `[batch][2*channels][freqBins][frames]`.
   *
   * @param {Float32Array} mix planar input
   * @param {number} batch items in `mix`
   * @param {Float32Array} output planar CaC spectrogram
   */
  forward(mix, batch, output) {
    const nfft = this.#nfft;
    const hop = this.#hop;
    const channels = this.#channels;
    const planes = batch * channels;
    const planeSize = this.#freqBins * this.#frames;
    const scratch = this.#scratch;

    if (this.#padding.length < planes * this.#centred) {
      this.#padding = new Float32Array(planes * this.#centred);
    }
    const padding = this.#padding;
    const inner = new Float32Array(this.#padded);

    for (let plane = 0; plane < planes; plane++) {
      reflectPad(mix, plane * this.#length, this.#length, this.#pad, this.#rightPad, inner, 0);
      reflectPad(inner, 0, this.#padded, nfft / 2, nfft / 2, padding, plane * this.#centred);
    }

    for (let plane = 0; plane < planes; plane++) {
      const item = Math.floor(plane / channels);
      const channel = plane % channels;
      const base = plane * this.#centred;
      const reBase = (item * 2 * channels + 2 * channel) * planeSize;
      const imBase = reBase + planeSize;

      for (let frame = 0; frame < this.#frames; frame++) {
        // Frames 0 and 1 are dropped by demucs, so the window starts two hops in.
        const at = base + (frame + 2) * hop;
        for (let j = 0; j < nfft; j++) {
          scratch.windowed[j] = padding[at + j] * this.#window[j];
        }
        this.#fft.forward(scratch.windowed, scratch.re, scratch.im, scratch.fft);

        for (let f = 0; f < this.#freqBins; f++) {
          output[reBase + f * this.#frames + frame] = scratch.re[f] * this.#forwardScale;
          output[imBase + f * this.#frames + frame] = scratch.im[f] * this.#forwardScale;
        }
      }
    }
  }

  /**
   * `[items][2*channels][freqBins][frames]` -> `[items][channels][length]`.
   *
   * `spec` is read in place, so an ONNX Runtime output tensor's own data can be passed straight
   * in: the transform does random access anyway and there is nothing to gain from a copy.
   *
   * @param {Float32Array} spec planar CaC spectrogram
   * @param {number} items batch items in `spec`
   * @param {Float32Array} output planar waveform
   */
  inverse(spec, items, output) {
    const nfft = this.#nfft;
    const hop = this.#hop;
    const channels = this.#channels;
    const planes = items * channels;
    const planeSize = this.#freqBins * this.#frames;
    const scratch = this.#scratch;

    // The dropped Nyquist bin stays zero for every frame.
    scratch.re[this.#freqBins] = 0;
    scratch.im[this.#freqBins] = 0;

    for (let plane = 0; plane < planes; plane++) {
      scratch.accumulator.fill(0);

      const item = Math.floor(plane / channels);
      const channel = plane % channels;
      const reBase = (item * 2 * channels + 2 * channel) * planeSize;
      const imBase = reBase + planeSize;

      for (let frame = 0; frame < this.#frames; frame++) {
        for (let f = 0; f < this.#freqBins; f++) {
          scratch.re[f] = spec[reBase + f * this.#frames + frame];
          scratch.im[f] = spec[imBase + f * this.#frames + frame];
        }
        this.#fft.inverse(scratch.re, scratch.im, scratch.windowed, scratch.fft);

        const at = (frame + 2) * hop; // two empty frames were prepended
        for (let j = 0; j < nfft; j++) {
          scratch.accumulator[at + j] += scratch.windowed[j] * this.#inverseScale * this.#window[j];
        }
      }

      const outBase = plane * this.#length;
      for (let i = 0; i < this.#length; i++) {
        output[outBase + i] = scratch.accumulator[this.#trim + i] / this.#envelope[this.#trim + i];
      }
    }
  }
}

/** `torch.hann_window(n)` -- periodic, not the symmetric variant. */
export function hannPeriodic(n) {
  const window = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / n));
  }
  return window;
}

/**
 * numpy/torch `reflect` padding: `out[-1] === in[1]`, `out[len] === in[len - 2]`.
 *
 * @param {Float32Array} input source
 * @param {number} from first sample to copy
 * @param {number} n samples to copy
 * @param {number} left samples of reflection to prepend
 * @param {number} right samples of reflection to append
 * @param {Float32Array} output destination
 * @param {number} at where in `output` the padded run starts
 */
export function reflectPad(input, from, n, left, right, output, at) {
  for (let i = 0; i < left; i++) {
    output[at + i] = input[from + left - i];
  }
  output.set(input.subarray(from, from + n), at + left);
  for (let i = 0; i < right; i++) {
    output[at + left + n + i] = input[from + n - 2 - i];
  }
}
