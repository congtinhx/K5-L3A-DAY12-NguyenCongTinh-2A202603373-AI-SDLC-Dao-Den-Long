/** mulberry32 — RNG tất định, nhỏ, đủ cho game. Mọi ngẫu nhiên trong core đi qua đây. */
export class Rng {
  state: number;
  constructor(seed: number) {
    this.state = (Math.trunc(seed) >>> 0) ^ 0x9e3779b9;
  }
  /** Số thực trong [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}
