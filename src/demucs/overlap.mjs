// Copyright (c) 2026 Hamidreza Sadeghi
// SPDX-License-Identifier: MIT

/**
 * Weighted overlap-add over a window that slides with the input.
 *
 * Chunks are added at absolute sample offsets; once a sample can no longer be touched by a future
 * chunk it is normalised by the accumulated weight and handed back. Only `capacity` samples are
 * ever held, so memory does not grow with track length.
 */
export class OverlapAdd {
  #planes;
  #capacity;
  #accumulator;
  #weight;
  #base = 0;

  /**
   * @param {number} planes independent rows accumulated in lockstep
   * @param {number} capacity samples held at once
   */
  constructor(planes, capacity) {
    this.#planes = planes;
    this.#capacity = capacity;
    this.#accumulator = new Float32Array(planes * capacity);
    this.#weight = new Float32Array(capacity);
  }

  /** Samples held at once. */
  get capacity() {
    return this.#capacity;
  }

  /** Absolute index of the first sample still held. */
  get base() {
    return this.#base;
  }

  /**
   * Adds one row per plane of `count` samples, `stride` apart in `block` starting at
   * `blockOffset`, at absolute sample `offset`, under the first `count` values of `weights`.
   *
   * @param {number} offset absolute position of the first sample
   * @param {Float32Array} block planar source
   * @param {number} blockOffset index of the first sample of plane 0 in `block`
   * @param {number} stride distance between planes in `block`
   * @param {number} count samples per plane
   * @param {Float32Array} weights cross-fade window, at least `count` long
   */
  add(offset, block, blockOffset, stride, count, weights) {
    const start = offset - this.#base;
    if (start < 0 || start + count > this.#capacity) {
      throw new RangeError(`chunk at ${offset} does not fit the overlap-add window`);
    }

    for (let plane = 0; plane < this.#planes; plane++) {
      const source = blockOffset + plane * stride;
      const destination = plane * this.#capacity + start;
      for (let i = 0; i < count; i++) {
        this.#accumulator[destination + i] += block[source + i] * weights[i];
      }
    }
    for (let i = 0; i < count; i++) {
      this.#weight[start + i] += weights[i];
    }
  }

  /**
   * Finalises everything before absolute sample `upto` into `output`, laid out as one row per
   * plane of the returned length.
   *
   * @param {number} upto absolute sample to finalise up to, exclusive
   * @param {Float32Array} output at least `planes * (upto - base)` long
   * @returns {number} samples written per plane, 0 if nothing was ready
   */
  flush(upto, output) {
    if (upto <= this.#base) {
      return 0;
    }
    const count = upto - this.#base;

    for (let plane = 0; plane < this.#planes; plane++) {
      const source = plane * this.#capacity;
      const destination = plane * count;
      for (let i = 0; i < count; i++) {
        output[destination + i] = this.#accumulator[source + i] / this.#weight[i];
      }
    }

    const keep = this.#capacity - count;
    for (let plane = 0; plane < this.#planes; plane++) {
      const row = plane * this.#capacity;
      this.#accumulator.copyWithin(row, row + count, row + this.#capacity);
      this.#accumulator.fill(0, row + keep, row + this.#capacity);
    }
    this.#weight.copyWithin(0, count, this.#capacity);
    this.#weight.fill(0, keep, this.#capacity);

    this.#base = upto;
    return count;
  }
}

/**
 * demucs' triangular cross-fade: up over the first half, down over the second. Chunk boundaries
 * then land exactly where upstream puts them.
 *
 * @param {number} segment samples per chunk
 * @param {number} [power] shapes the ramp; 1 is the default demucs uses
 * @returns {Float32Array}
 */
export function transitionWeight(segment, power = 1) {
  const weight = new Float32Array(segment);
  let peak = 0;
  for (let i = 0; i < segment; i++) {
    weight[i] = i < Math.floor(segment / 2) ? i + 1 : segment - i;
    peak = Math.max(peak, weight[i]);
  }
  for (let i = 0; i < segment; i++) {
    weight[i] /= peak;
    if (power !== 1) {
      weight[i] = weight[i] ** power;
    }
  }
  return weight;
}
