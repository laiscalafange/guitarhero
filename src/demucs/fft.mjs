// Copyright (c) 2026 Hamidreza Sadeghi
// SPDX-License-Identifier: MIT

/**
 * Radix-2 real FFT.
 *
 * Conventions match numpy's `rfft` / `irfft`: the forward transform is unnormalised and the
 * inverse carries the 1/n. A length-n real transform runs as a length-n/2 complex transform plus
 * a recombination step, which is the usual factor-of-two saving.
 *
 * An instance holds nothing but immutable twiddle tables, so one can be shared freely; every call
 * takes its scratch from the caller.
 */
export class RealFft {
  #size;
  #half;
  #cos;
  #sin;
  #cosN;
  #sinN;
  #reverse;

  /** @param {number} size a power of two, at least 4 */
  constructor(size) {
    if (size < 4 || (size & (size - 1)) !== 0) {
      throw new RangeError('FFT size must be a power of two >= 4');
    }
    this.#size = size;
    this.#half = size / 2;

    const half = this.#half;
    this.#cos = new Float32Array(half / 2);
    this.#sin = new Float32Array(half / 2);
    for (let i = 0; i < half / 2; i++) {
      const angle = (-2 * Math.PI * i) / half;
      this.#cos[i] = Math.cos(angle);
      this.#sin[i] = Math.sin(angle);
    }

    this.#cosN = new Float32Array(half);
    this.#sinN = new Float32Array(half);
    for (let k = 0; k < half; k++) {
      const angle = (-2 * Math.PI * k) / size;
      this.#cosN[k] = Math.cos(angle);
      this.#sinN[k] = Math.sin(angle);
    }

    const bits = Math.round(Math.log2(half));
    this.#reverse = new Int32Array(half);
    for (let i = 0; i < half; i++) {
      let value = 0;
      for (let bit = 0; bit < bits; bit++) {
        value = (value << 1) | ((i >> bit) & 1);
      }
      this.#reverse[i] = value;
    }
  }

  get size() {
    return this.#size;
  }

  /** Number of output bins, n/2 + 1. */
  get bins() {
    return this.#half + 1;
  }

  /** Floats the caller has to provide as scratch. */
  get scratchLength() {
    return this.#half * 2;
  }

  /**
   * Transforms n real samples into n/2+1 bins.
   *
   * @param {Float32Array} input n samples
   * @param {Float32Array} re n/2+1 real parts
   * @param {Float32Array} im n/2+1 imaginary parts
   * @param {Float32Array} scratch at least {@link scratchLength} floats
   */
  forward(input, re, im, scratch) {
    const half = this.#half;
    for (let k = 0; k < half; k++) {
      scratch[k] = input[2 * k];
      scratch[half + k] = input[2 * k + 1];
    }
    this.#transform(scratch, false);

    const mask = half - 1;
    for (let k = 0; k < half; k++) {
      const j = (half - k) & mask;
      const ar = scratch[k];
      const ai = scratch[half + k];
      const br = scratch[j];
      const bi = -scratch[half + j]; // conj(Z[m - k])
      const evenR = 0.5 * (ar + br);
      const evenI = 0.5 * (ai + bi);
      const oddR = 0.5 * (ai - bi);
      const oddI = -0.5 * (ar - br);
      const wr = this.#cosN[k];
      const wi = this.#sinN[k];
      re[k] = evenR + (oddR * wr - oddI * wi);
      im[k] = evenI + (oddR * wi + oddI * wr);
    }
    re[half] = scratch[0] - scratch[half];
    im[half] = 0;
  }

  /**
   * Transforms n/2+1 bins back into n real samples, 1/n included.
   *
   * @param {Float32Array} re n/2+1 real parts
   * @param {Float32Array} im n/2+1 imaginary parts
   * @param {Float32Array} output n samples
   * @param {Float32Array} scratch at least {@link scratchLength} floats
   */
  inverse(re, im, output, scratch) {
    const half = this.#half;
    for (let k = 0; k < half; k++) {
      // DC and Nyquist are taken as purely real, as numpy and torch do. A predicted
      // (non-physical) spectrum can carry a spurious imaginary part there, and keeping it
      // injects broadband noise.
      const xr = re[k];
      const xi = k === 0 ? 0 : im[k];
      const yr = re[half - k];
      const yi = k === 0 ? 0 : -im[half - k];
      const evenR = 0.5 * (xr + yr);
      const evenI = 0.5 * (xi + yi);
      const diffR = 0.5 * (xr - yr);
      const diffI = 0.5 * (xi - yi);
      const wr = this.#cosN[k];
      const wi = -this.#sinN[k]; // e^{+2 pi i k / n}
      const oddR = diffR * wr - diffI * wi;
      const oddI = diffR * wi + diffI * wr;
      scratch[k] = evenR - oddI;
      scratch[half + k] = evenI + oddR;
    }
    this.#transform(scratch, true);

    const scale = 1 / half;
    for (let k = 0; k < half; k++) {
      output[2 * k] = scratch[k] * scale;
      output[2 * k + 1] = scratch[half + k] * scale;
    }
  }

  /**
   * In-place iterative radix-2 decimation-in-time complex FFT, unscaled. `work` holds the real
   * parts in [0, half) and the imaginary parts in [half, 2*half).
   */
  #transform(work, inverse) {
    const half = this.#half;

    for (let i = 0; i < half; i++) {
      const j = this.#reverse[i];
      if (j > i) {
        let swap = work[i];
        work[i] = work[j];
        work[j] = swap;
        swap = work[half + i];
        work[half + i] = work[half + j];
        work[half + j] = swap;
      }
    }

    for (let len = 2; len <= half; len <<= 1) {
      const span = len >> 1;
      const step = half / len;
      for (let start = 0; start < half; start += len) {
        for (let k = 0, t = 0; k < span; k++, t += step) {
          const wr = this.#cos[t];
          const wi = inverse ? -this.#sin[t] : this.#sin[t];
          const a = start + k;
          const b = a + span;
          const ur = work[a];
          const ui = work[half + a];
          const vr = work[b] * wr - work[half + b] * wi;
          const vi = work[b] * wi + work[half + b] * wr;
          work[a] = ur + vr;
          work[half + a] = ui + vi;
          work[b] = ur - vr;
          work[half + b] = ui - vi;
        }
      }
    }
  }
}
