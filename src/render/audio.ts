// Âm thanh tổng hợp bằng WebAudio (không file asset): nhạc nền đêm + hiệu ứng.
export type Sfx = 'pickup' | 'lit' | 'pulse' | 'hit' | 'jump' | 'dash' | 'win' | 'lose' | 'shade' | 'tick';

export class Audio {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  volume = 0.6;
  private musicTimer = 0;

  ensure(): void {
    if (this.ctx) { if (this.ctx.state === 'suspended') void this.ctx.resume(); return; }
    try {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
      this.startMusic();
    } catch { this.ctx = null; }
  }
  setVolume(v: number): void { this.volume = v; if (this.master) this.master.gain.value = v; }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, delay = 0, slideTo?: number): void {
    const c = this.ctx, m = this.master;
    if (!c || !m) return;
    const t0 = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(m); o.start(t0); o.stop(t0 + dur + 0.05);
  }

  play(s: Sfx): void {
    switch (s) {
      case 'pickup': this.tone(1320, 0.12, 'sine', 0.25); this.tone(1760, 0.1, 'sine', 0.15, 0.05); break;
      case 'lit': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.5, 'triangle', 0.25, i * 0.08)); break;
      case 'pulse': this.tone(300, 0.45, 'sine', 0.35, 0, 900); break;
      case 'hit': this.tone(160, 0.35, 'sawtooth', 0.3, 0, 60); break;
      case 'jump': this.tone(440, 0.15, 'square', 0.12, 0, 880); break;
      case 'dash': this.tone(900, 0.18, 'sawtooth', 0.1, 0, 300); break;
      case 'win': [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.6, 'triangle', 0.25, i * 0.12)); break;
      case 'lose': [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.6, 'sine', 0.25, i * 0.18)); break;
      case 'shade': this.tone(110, 0.7, 'sawtooth', 0.15, 0, 70); break;
      case 'tick': this.tone(880, 0.08, 'square', 0.12); break;
    }
  }

  /** Nhạc nền đêm: hợp âm pad trầm + giai điệu ngũ cung chậm. */
  private startMusic(): void {
    const notes = [262, 294, 330, 392, 440, 523];
    let i = 0;
    const loop = () => {
      if (!this.ctx) return;
      if (i % 8 === 0) { this.tone(131, 3.8, 'sine', 0.06); this.tone(196, 3.8, 'sine', 0.04); }
      this.tone(notes[(i * 7 + (i >> 2)) % notes.length], 0.9, 'triangle', 0.05);
      i++;
      this.musicTimer = window.setTimeout(loop, 500);
    };
    loop();
  }
}
