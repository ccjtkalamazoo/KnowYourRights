// Know Your Rights · CCJT
// audio.js : the two procedural sound engines.
//
// Everything is synthesized with the Web Audio API. There are no audio files,
// which is why the whole game is still just a handful of text files.
//
//   SfxEngine   : one-shot sounds (clicks, correct/wrong stings, point earns).
//   MusicEngine : the looping backing track. Three "stages" that get faster and
//                 denser as the ladder climbs: Q1-5, Q6-10, Q11-15.
//
// Both take an AudioContext via init(). main.js creates ONE context and hands it
// to both, so they share a clock and an output. Browsers refuse to start audio
// until a user gesture, which is why init() is called on the first click rather
// than at load.

export class SfxEngine {
  constructor() { this.ctx = null; this.muted = false; this.master = null; }
  init(t) {
    if (this.ctx) return;
    this.ctx = t;
    this.master = t.createGain();
    this.master.gain.value = 1;
    this.master.connect(t.destination);
  }
  setMuted(t) { this.muted = t; if (this.master) this.master.gain.value = t ? 0 : 1; }
  duck(t = 0.25, n = 200) {
    if (!this.ctx || !this.master) return;
    const r = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(r);
    this.master.gain.setValueAtTime(this.master.gain.value, r);
    this.master.gain.linearRampToValueAtTime(this.muted ? 0 : t, r + n / 1e3);
  }
  unduck(t = 200) {
    if (!this.ctx || !this.master) return;
    const n = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(n);
    this.master.gain.linearRampToValueAtTime(this.muted ? 0 : 1, n + t / 1e3);
  }
  tone(t, n, r = "sine", o = 0.08, i = 0) {
    if (this.muted || !this.ctx) return;
    try {
      const l = this.ctx.currentTime + i;
      const s = this.ctx.createOscillator();
      const a = this.ctx.createGain();
      s.type = r;
      s.frequency.setValueAtTime(t, l);
      a.gain.setValueAtTime(0, l);
      a.gain.linearRampToValueAtTime(o, l + 0.012);
      a.gain.exponentialRampToValueAtTime(1e-4, l + n);
      s.connect(a); a.connect(this.master);
      s.start(l); s.stop(l + n + 0.05);
    } catch {}
  }
  // pitch glide helper for whooshes
  sweep(from, to, dur, type = "sine", vol = 0.05, delay = 0) {
    if (this.muted || !this.ctx) return;
    try {
      const t0 = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(from, t0);
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(vol, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(1e-4, t0 + dur);
      osc.connect(g); g.connect(this.master);
      osc.start(t0); osc.stop(t0 + dur + 0.05);
    } catch {}
  }
  click() { this.tone(720, 0.05, "triangle", 0.045); }
  select() { this.tone(523, 0.12, "sine", 0.06); this.tone(784, 0.18, "sine", 0.05, 0.05); }
  lockIn(t = 1) {
    this.tone(110, 0.35, "triangle", 0.07);
    this.tone(110 * 1.5, 0.8 + (t - 1) * 0.7, "sine", 0.05, 0.1);
    this.tone(110 * 2, 1.2 + (t - 1) * 1.2, "sine", 0.035, 0.2);
  }
  correct(t = 1) {
    [523, 659, 784, 1046].forEach((r, o) => this.tone(r, 0.3 + t * 0.05, "sine", 0.07 + t * 0.005, o * 0.1));
    if (t >= 2) this.tone(1318, 0.55, "sine", 0.05, 0.45);
    if (t >= 3) this.tone(1568, 0.7, "sine", 0.04, 0.55);
  }
  wrong() {
    this.tone(220, 0.3, "triangle", 0.07);
    this.tone(165, 0.45, "triangle", 0.055, 0.18);
    this.tone(110, 0.65, "triangle", 0.04, 0.36);
  }
  reveal() { this.tone(80, 0.15, "triangle", 0.08); this.tone(130, 0.22, "sine", 0.045, 0.04); }
  win() { [523, 659, 784, 1046, 1318, 1568, 2093].forEach((t, n) => this.tone(t, 0.55, "sine", 0.1, n * 0.15)); }
  lifeline() { this.tone(880, 0.12, "sine", 0.05); this.tone(1175, 0.16, "sine", 0.04, 0.07); }
  modalOpen() { this.tone(660, 0.08, "sine", 0.035); }

  // ---- NEW REVEAL / PUZZLE SOUNDS ----
  // Card rotating on its axis: a short airy whoosh pitched up then settling
  cardFlip() {
    this.sweep(320, 620, 0.16, "sine", 0.04);
    this.sweep(180, 90, 0.18, "triangle", 0.025, 0.02);
  }
  // Neutral tick when returning to a card you've already seen (no reward)
  cardRevisit() { this.tone(440, 0.05, "triangle", 0.03); }
  // First-view point earned: bright ascending blip whose base pitch climbs
  // with each segment (0..3) so the four cards form a rising do-re-mi-fa
  cardPointEarn(seg = 0) {
    const scale = [523.25, 587.33, 659.25, 783.99]; // C D E G
    const base = scale[Math.max(0, Math.min(3, seg))];
    this.tone(base, 0.14, "sine", 0.07);
    this.tone(base * 1.5, 0.18, "sine", 0.05, 0.05);
  }
  // The +1 token landing on the puzzle segment: a little "clink" impact,
  // pitch also rises with the segment so building a piece sounds musical
  segmentClink(seg = 0) {
    const scale = [392, 440, 523.25, 587.33];
    const p = scale[Math.max(0, Math.min(3, seg))];
    this.tone(p, 0.08, "triangle", 0.06);
    this.tone(p * 2, 0.06, "sine", 0.03, 0.01);
  }
  // Piece completes (4th segment) + bonus: triumphant little chord flourish
  pieceComplete() {
    [523.25, 659.25, 783.99].forEach((f) => this.tone(f, 0.4, "sine", 0.07));
    this.tone(1046.5, 0.5, "sine", 0.05, 0.08);
    this.tone(1318.5, 0.6, "sine", 0.035, 0.16);
  }
  // Piece flies in and snaps into the mural slot: a solid chunk/lock
  pieceLock() {
    this.tone(160, 0.09, "square", 0.05);
    this.tone(90, 0.14, "triangle", 0.06, 0.02);
    this.tone(320, 0.06, "sine", 0.03, 0.0);
  }
  // Crossed a lifeline price threshold (can now afford one): subtle unlock chime
  lifelineThreshold() {
    this.tone(988, 0.1, "sine", 0.04);
    this.tone(1319, 0.14, "sine", 0.035, 0.06);
    this.tone(1760, 0.18, "sine", 0.025, 0.12);
  }
  // Spending points to buy a lifeline: a "cha-ching" confirmation
  purchase() {
    this.tone(784, 0.1, "square", 0.045);
    this.tone(1047, 0.14, "square", 0.04, 0.05);
    this.tone(1568, 0.22, "sine", 0.035, 0.1);
  }
  // Whole picture finished at Q15: biggest swell in the game
  finalPuzzle() {
    [392, 523.25, 659.25, 783.99, 1046.5, 1318.5, 1568, 2093].forEach((f, i) =>
      this.tone(f, 0.7, "sine", 0.09, i * 0.12));
  }
}


export class MusicEngine {
  constructor() {
    this.ctx = null; this.muted = false; this.stage = 0; this.savedStage = 0;
    this.master = null; this.padOscs = null; this.lfo = null; this.scheduler = null;
    this.beat = 0; this.bpm = 70; this.bassStep = 0; this.arpStep = 0; this.noiseBuffer = null;
  }
  init(t) {
    if (this.ctx) return;
    this.ctx = t;
    this.master = t.createGain();
    this.master.gain.value = 0;
    this.master.connect(t.destination);
    try {
      const n = t.sampleRate;
      this.noiseBuffer = t.createBuffer(1, n * 0.5, n);
      const r = this.noiseBuffer.getChannelData(0);
      for (let o = 0; o < r.length; o++) r[o] = Math.random() * 2 - 1;
    } catch {}
  }
  setMuted(t) {
    if (t && !this.muted) { this.savedStage = this.stage; this.muted = t; this.stop(); }
    else if (!t && this.muted) {
      this.muted = t;
      const n = this.savedStage || 0;
      this.savedStage = 0;
      if (n > 0 && this.ctx) { this.start(); this.setStage(n); }
    } else this.muted = t;
  }
  start() {
    if (!this.ctx || this.muted || this.padOscs) return;
    const t = this.ctx.currentTime;
    this.createPad();
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(0, t);
    this.master.gain.linearRampToValueAtTime(0.5, t + 2);
    this.startScheduler();
  }
  createPad() {
    const t = this.ctx, n = t.currentTime;
    const r = t.createGain();
    r.gain.setValueAtTime(0, n);
    r.gain.linearRampToValueAtTime(1, n + 2);
    const o = t.createBiquadFilter();
    o.type = "lowpass"; o.frequency.value = 2400; o.Q.value = 0.6;
    r.connect(o); o.connect(this.master);
    const i = t.createOscillator();
    i.type = "sine"; i.frequency.value = 5.8;
    const l = t.createGain(); l.gain.value = 6;
    i.connect(l); i.start(n); this.lfo = i;
    const s = [{ root: 110, mix: 0.9 }, { root: 130.81, mix: 0.6 }, { root: 164.81, mix: 0.55 }, { root: 196, mix: 0.4 }];
    const a = [{ ratio: 0.5, gain: 0.05 }, { ratio: 1, gain: 0.06 }, { ratio: 1.5, gain: 0.025 }, { ratio: 2, gain: 0.035 }];
    this.padOscs = [];
    s.forEach((d) => {
      a.forEach((g) => {
        const y = t.createOscillator();
        y.type = "sine"; y.frequency.value = d.root * g.ratio;
        const m = t.createGain();
        m.gain.value = g.gain * d.mix * 0.4;
        l.connect(y.detune); y.connect(m); m.connect(r);
        y.start(n); this.padOscs.push(y);
      });
    });
  }
  startScheduler() {
    if (this.scheduler) return;
    this.beat = 0; this.bassStep = 0; this.arpStep = 0;
    const t = () => {
      if (!this.ctx || !this.padOscs) return;
      if (this.beat % 4 === 0 && this.stage >= 1) this.playWalkingBass();
      if (this.stage >= 3 && (this.beat % 16 === 0 || this.beat % 16 === 8)) this.playKick();
      if (this.stage >= 2 && (this.beat % 16 === 4 || this.beat % 16 === 12)) this.playBrushedSnare();
      if (this.stage >= 3 && this.beat % 2 === 0) this.playRide();
      if (this.stage >= 3) this.playArp();
      this.beat = (this.beat + 1) % 32;
    };
    const n = 60 / this.bpm / 4 * 1e3;
    this.scheduler = setInterval(t, n);
  }
  playWalkingBass() {
    if (!this.ctx || this.muted || !this.padOscs) return;
    try {
      const t = [55, 65.4, 82.4, 98, 55, 58.27, 65.4, 73.42];
      const n = t[this.bassStep % t.length]; this.bassStep++;
      const r = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      o.type = "triangle"; o.frequency.value = n;
      const i = this.ctx.createBiquadFilter();
      i.type = "lowpass"; i.frequency.value = 750;
      const l = this.ctx.createGain();
      l.gain.setValueAtTime(0, r);
      l.gain.linearRampToValueAtTime(0.085, r + 0.008);
      l.gain.exponentialRampToValueAtTime(0.04, r + 0.12);
      l.gain.exponentialRampToValueAtTime(0.001, r + 0.55);
      o.connect(i); i.connect(l); l.connect(this.master);
      o.start(r); o.stop(r + 0.65);
    } catch {}
  }
  playKick() {
    if (!this.ctx || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      const n = this.ctx.createOscillator();
      n.type = "sine";
      n.frequency.setValueAtTime(150, t);
      n.frequency.exponentialRampToValueAtTime(40, t + 0.1);
      const r = this.ctx.createGain();
      r.gain.setValueAtTime(0, t);
      r.gain.linearRampToValueAtTime(0.16, t + 0.005);
      r.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      n.connect(r); r.connect(this.master);
      n.start(t); n.stop(t + 0.18);
    } catch {}
  }
  playBrushedSnare() {
    if (!this.ctx || this.muted || !this.noiseBuffer) return;
    try {
      const t = this.ctx.currentTime;
      const n = this.ctx.createBufferSource();
      n.buffer = this.noiseBuffer;
      const r = this.ctx.createBiquadFilter();
      r.type = "bandpass"; r.frequency.value = 3200; r.Q.value = 0.7;
      const o = this.ctx.createGain();
      o.gain.setValueAtTime(0, t);
      o.gain.linearRampToValueAtTime(0.028, t + 0.005);
      o.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      n.connect(r); r.connect(o); o.connect(this.master);
      n.start(t); n.stop(t + 0.25);
    } catch {}
  }
  playRide() {
    if (!this.ctx || this.muted || !this.noiseBuffer) return;
    try {
      const t = this.ctx.currentTime;
      const n = this.ctx.createBufferSource();
      n.buffer = this.noiseBuffer;
      const r = this.ctx.createBiquadFilter();
      r.type = "bandpass"; r.frequency.value = 7800; r.Q.value = 4.5;
      const o = this.ctx.createGain();
      o.gain.setValueAtTime(0, t);
      o.gain.linearRampToValueAtTime(0.014, t + 0.002);
      o.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      n.connect(r); r.connect(o); o.connect(this.master);
      n.start(t); n.stop(t + 0.1);
    } catch {}
  }
  playArp() {
    if (!this.ctx || this.muted) return;
    try {
      const t = [440, 523.25, 659.25, 880];
      const n = t[this.arpStep % t.length]; this.arpStep++;
      const r = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      o.type = "triangle"; o.frequency.value = n;
      const i = this.ctx.createBiquadFilter();
      i.type = "highpass"; i.frequency.value = 400;
      const l = this.ctx.createGain();
      l.gain.setValueAtTime(0, r);
      l.gain.linearRampToValueAtTime(0.02, r + 0.003);
      l.gain.exponentialRampToValueAtTime(0.001, r + 0.09);
      o.connect(i); i.connect(l); l.connect(this.master);
      o.start(r); o.stop(r + 0.12);
    } catch {}
  }
  playHornStab() {
    if (!this.ctx || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      const n = [220, 261.63, 329.63];
      const r = this.ctx.createBiquadFilter();
      r.type = "lowpass";
      r.frequency.setValueAtTime(350, t);
      r.frequency.linearRampToValueAtTime(2400, t + 0.05);
      r.frequency.exponentialRampToValueAtTime(900, t + 0.4);
      r.Q.value = 1.5;
      const o = this.ctx.createGain();
      o.gain.setValueAtTime(0, t);
      o.gain.linearRampToValueAtTime(0.04, t + 0.04);
      o.gain.linearRampToValueAtTime(0.028, t + 0.1);
      o.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      n.forEach((i) => {
        const l = this.ctx.createOscillator();
        l.type = "sawtooth"; l.frequency.value = i;
        l.connect(r); l.start(t); l.stop(t + 0.5);
      });
      r.connect(o); o.connect(this.master);
    } catch {}
  }
  setStage(t) {
    this.stage = t;
    if (!this.ctx) return;
    this.bpm = t === 1 ? 70 : t === 2 ? 90 : t === 3 ? 108 : 70;
    if (this.scheduler) {
      clearInterval(this.scheduler); this.scheduler = null;
      if (this.padOscs) this.startScheduler();
    }
    if (this.master) {
      const n = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(n);
      this.master.gain.linearRampToValueAtTime(this.muted || t === 0 ? 0 : 0.5 + (t - 1) * 0.08, n + 0.7);
    }
  }
  duck(t = 0.2, n = 250) {
    if (!this.ctx || !this.master) return;
    const r = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(r);
    this.master.gain.setValueAtTime(this.master.gain.value, r);
    this.master.gain.linearRampToValueAtTime(this.muted ? 0 : t, r + n / 1e3);
  }
  unduck(t = 400) {
    if (!this.ctx || !this.master) return;
    const n = this.ctx.currentTime;
    const r = this.muted ? 0 : 0.5 + Math.max(0, this.stage - 1) * 0.08;
    this.master.gain.cancelScheduledValues(n);
    this.master.gain.linearRampToValueAtTime(r, n + t / 1e3);
  }
  stop() {
    if (this.scheduler) { clearInterval(this.scheduler); this.scheduler = null; }
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      if (this.master) {
        this.master.gain.cancelScheduledValues(t);
        this.master.gain.linearRampToValueAtTime(0, t + 0.4);
      }
      if (this.padOscs) {
        this.padOscs.forEach((n) => { try { n.stop(t + 0.5); } catch {} });
        this.padOscs = null;
      }
      if (this.lfo) { try { this.lfo.stop(t + 0.5); } catch {} this.lfo = null; }
    } catch {}
    this.stage = 0;
  }
}
