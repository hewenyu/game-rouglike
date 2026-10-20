import type { Event } from "./sim";
export class Sound {
  context: AudioContext | null = null;
  master: GainNode | null = null;
  muted = false;
  voices = 0;
  pickup = 0;
  lastFire = 0;
  lastTierFire = 0;
  init() {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = this.muted ? 0 : 0.28;
      const limiter = this.context.createDynamicsCompressor();
      limiter.threshold.value = -12;
      limiter.ratio.value = 8;
      this.master.connect(limiter);
      limiter.connect(this.context.destination);
    }
    void this.context.resume().catch(() => {});
  }
  toggle() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.28;
  }
  tone(
    f: number,
    end: number,
    dur: number,
    vol: number,
    type: OscillatorType = "triangle",
  ) {
    if (!this.context || !this.master || this.muted || this.voices > 22) return;
    this.voices++;
    const c = this.context,
      t = c.currentTime,
      o = c.createOscillator(),
      g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, end), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.01);
    o.onended = () => {
      this.voices--;
      o.disconnect();
      g.disconnect();
    };
  }
  play(e: Event) {
    if (e.type === "fire") {
      const t = this.context?.currentTime ?? 0;
      if (t - this.lastFire < 0.04) return;
      this.lastFire = t;
      this.tone(
        e.kind === "coil" ? 500 : 240,
        e.kind === "coil" ? 90 : 55,
        e.kind === "rocket" ? 0.19 : 0.08,
        0.18,
        e.kind === "shotgun" ? "sawtooth" : "triangle",
      );
    }
    if (e.type === "kill") this.tone(130, 50, 0.08, 0.13, "square");
    if (e.type === "explode") this.tone(90, 25, 0.25, 0.28, "sawtooth");
    if (e.type === "pickup") {
      this.tone(
        650 + (this.pickup++ % 8) * 75,
        900 + (this.pickup % 8) * 75,
        0.08,
        0.1,
        "sine",
      );
    }
    if (e.type === "hurt") this.tone(145, 45, 0.3, 0.4, "sawtooth");
    if (e.type === "wave" || e.type === "buy") {
      this.tone(330, 660, 0.24, 0.3);
      setTimeout(() => this.tone(494, 988, 0.22, 0.15), 90);
    }
    if (e.type === "boss") {
      const stage = e.value ?? 1;
      this.tone(110 - stage * 8, 42, 0.42, 0.32, "sawtooth");
      setTimeout(
        () => this.tone(175 + stage * 24, 75 + stage * 8, 0.28, 0.2),
        80,
      );
    }
    if (e.type === "branch") {
      if (e.value === 1) {
        this.tone(520, 1040, 0.24, 0.22, "sine");
        setTimeout(() => this.tone(780, 1240, 0.18, 0.12, "triangle"), 80);
      } else {
        this.tone(190, 95, 0.36, 0.26, "square");
        setTimeout(() => this.tone(130, 55, 0.3, 0.16, "sawtooth"), 100);
      }
    }
    if (e.type === "tier" || e.type === "merge") {
      if (!e.tier || e.tier < 2) return;
      const tier = e.tier;
      this.tone(420 + tier * 110, 690 + tier * 180, 0.16, 0.16, "triangle");
      setTimeout(
        () => this.tone(620 + tier * 140, 920 + tier * 120, 0.2, 0.1, "sine"),
        65,
      );
      if (e.mod === "popcorn")
        setTimeout(() => this.tone(920, 1460, 0.12, 0.09, "triangle"), 125);
    }
    if (e.type === "wake-hit") this.tone(1050, 1500, 0.1, 0.1, "sine");
    if (e.type === "ember-blast") this.tone(170, 55, 0.3, 0.2, "sawtooth");
    if (e.type === "split") this.tone(280, 145, 0.14, 0.12, "square");
    if (e.type === "spitter-tell") this.tone(310, 410, 0.32, 0.1, "triangle");
    if (e.type === "mod-cue") {
      if (e.mod === "popcorn") this.tone(720, 1120, 0.12, 0.1, "sine");
      else if (e.mod === "domino") this.tone(150, 90, 0.18, 0.14, "square");
      else this.tone(390, 560, 0.2, 0.09, "sine");
    }
    if (e.type === "tier-fire") {
      const t = this.context?.currentTime ?? 0;
      if (t - this.lastTierFire < 0.04) return;
      this.lastTierFire = t;
      const up = e.kind === "coil" || e.kind === "rocket";
      const tier = Math.max(2, Math.min(4, e.tier ?? 2));
      this.tone(
        (up ? 620 : 360) + tier * 50,
        (up ? 1050 : 190) + tier * 60,
        0.1,
        0.09,
        e.kind === "shotgun" ? "sawtooth" : "triangle",
      );
    }
    if (e.type === "ring") this.tone(880, 1760, 0.18, 0.12, "triangle");
    if (e.type === "end") this.tone(660, 220, 0.8, 0.3);
  }
}
