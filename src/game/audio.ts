export const MUTE_KEY = "trajectry.muted";

export type Sfx = {
  resume: () => void;
  launch: () => void;
  bounce: () => void;
  collect: () => void;
  win: () => void;
  fail: () => void;
  setMuted: (muted: boolean) => void;
  isMuted: () => boolean;
  setTitleQuiet: (quiet: boolean) => void;
};

export function readMuted(): boolean {
  try {
    const raw = globalThis.localStorage?.getItem(MUTE_KEY);
    return raw === "1" || raw === "true";
  } catch {
    return false;
  }
}

export function writeMuted(muted: boolean): void {
  try {
    globalThis.localStorage?.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* private mode */
  }
}

const D2 = 73.42;
const F2 = 87.31;
const A2 = 110.0;
const Bb2 = 116.54;
const C3 = 130.81;
const D3 = 146.83;
const E3 = 164.81;
const F3 = 174.61;
const A3 = 220.0;
const Bb3 = 233.08;
const C4 = 261.63;
const D4 = 293.66;

type Hit = { t: number; f: number; v: number; d: number };
type Chord = { t: number; f: number[]; v: number; d: number };

const PIANO: Hit[] = [
  { t: 0, f: D2, v: 0.14, d: 6.5 },
  { t: 0, f: D3, v: 0.08, d: 5.2 },
  { t: 3.2, f: F3, v: 0.09, d: 4.8 },
  { t: 6.4, f: A3, v: 0.1, d: 5.0 },
  { t: 10.2, f: D4, v: 0.11, d: 6.0 },
  { t: 14.0, f: C4, v: 0.07, d: 3.4 },
  { t: 16.2, f: Bb3, v: 0.08, d: 4.0 },
  { t: 18.8, f: A3, v: 0.07, d: 4.8 },
  { t: 22.0, f: F2, v: 0.12, d: 6.0 },
  { t: 22.0, f: F3, v: 0.08, d: 4.4 },
  { t: 25.8, f: E3, v: 0.07, d: 3.4 },
  { t: 28.5, f: D3, v: 0.09, d: 5.0 },
  { t: 32.0, f: A2, v: 0.08, d: 4.2 },
  { t: 34.8, f: Bb2, v: 0.09, d: 4.4 },
  { t: 37.6, f: A2, v: 0.07, d: 5.2 },
  { t: 41.0, f: D3, v: 0.09, d: 5.8 },
  { t: 44.5, f: F3, v: 0.08, d: 5.2 },
  { t: 48.0, f: E3, v: 0.07, d: 4.2 },
  { t: 51.0, f: D3, v: 0.08, d: 5.5 },
  { t: 51.0, f: A2, v: 0.06, d: 5.5 },
  { t: 55.0, f: A3, v: 0.05, d: 4.0 },
  { t: 57.4, f: F3, v: 0.06, d: 4.6 },
  { t: 59.2, f: D3, v: 0.07, d: 5.2 },
];

const GUITAR: Chord[] = [
  { t: 0, f: [D2, A2], v: 0.055, d: 3.2 },
  { t: 6.2, f: [A2, D3], v: 0.05, d: 3.0 },
  { t: 13.0, f: [F2, C3], v: 0.055, d: 3.4 },
  { t: 21.1, f: [D2, F2], v: 0.05, d: 3.1 },
  { t: 28.4, f: [A2, D3], v: 0.055, d: 3.6 },
  { t: 36.8, f: [D3, A3], v: 0.045, d: 3.3 },
  { t: 44.2, f: [F2, Bb2], v: 0.05, d: 3.2 },
  { t: 51.4, f: [D2, A2], v: 0.05, d: 3.8 },
];

const LOOP = 70;
const PIANO_IN = 8;
const GUITAR_IN = 16;

export function createAudio(): Sfx {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let scoreOn = false;
  let muted = readMuted();
  let titleQuiet = true;

  const silent = () => muted || titleQuiet;

  const applyGain = () => {
    if (!master || !ctx) return;
    master.gain.setValueAtTime(silent() ? 0 : 1, ctx.currentTime);
  };

  const get = () => {
    ctx ??= new AudioContext();
    if (!master) {
      master = ctx.createGain();
      master.gain.value = silent() ? 0 : 1;
      master.connect(ctx.destination);
    }
    return ctx;
  };

  const out = () => {
    get();
    return master!;
  };

  const tone = (freq: number, duration: number, type: OscillatorType, gain = 0.08) => {
    const ac = get();
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);
    osc.connect(g).connect(out());
    osc.start();
    osc.stop(ac.currentTime + duration);
  };

  const swell = (freq: number, type: OscillatorType, gain: number, attack: number) => {
    const ac = get();
    const osc = ac.createOscillator();
    const g = ac.createGain();
    const now = ac.currentTime;
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(gain, now + attack);
    osc.connect(g).connect(out());
    osc.start();
  };

  const piano = (freq: number, when: number, velocity: number, decay: number) => {
    const ac = get();
    const partials: [number, number][] = [
      [0.5, 0.55],
      [1, 1],
      [2.002, 0.18],
      [3.01, 0.06],
    ];
    for (const [mult, amp] of partials) {
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = "sine";
      osc.frequency.value = freq * mult;
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(velocity * amp, when + 0.09);
      g.gain.exponentialRampToValueAtTime(0.0001, when + decay);
      osc.connect(g).connect(out());
      osc.start(when);
      osc.stop(when + decay + 0.08);
    }
  };

  const guitar = (freq: number, when: number, velocity: number, decay: number) => {
    const ac = get();
    const voices: [OscillatorType, number, number, number][] = [
      ["sine", 0, 0.7, 0.5],
      ["triangle", 5, 0.45, 1],
      ["sine", -7, 0.35, 0.5],
    ];
    for (const [type, cents, amp, ratio] of voices) {
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = type;
      osc.frequency.value = freq * ratio;
      osc.detune.value = cents;
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(velocity * amp, when + 0.06);
      g.gain.exponentialRampToValueAtTime(0.0001, when + decay);
      osc.connect(g).connect(out());
      osc.start(when);
      osc.stop(when + decay + 0.08);
    }
  };

  const playLoop = (origin: number, first: boolean) => {
    const pianoAt = first ? PIANO_IN : 2;
    const guitarAt = first ? GUITAR_IN : 6;
    for (const hit of PIANO) piano(hit.f, origin + pianoAt + hit.t, hit.v, hit.d);
    for (const chord of GUITAR) {
      for (const freq of chord.f) guitar(freq, origin + guitarAt + chord.t, chord.v, chord.d);
    }
  };

  return {
    resume() {
      const ac = get();
      void ac.resume();
      if (!scoreOn) {
        scoreOn = true;
        swell(D2, "sine", 0.045, 9);
        swell(A2, "sine", 0.022, 12);
        swell(D3, "sine", 0.016, 16);
        playLoop(ac.currentTime + 0.05, true);
        const loop = () => {
          playLoop(get().currentTime + 0.02, false);
          window.setTimeout(loop, LOOP * 1000);
        };
        window.setTimeout(loop, LOOP * 1000);
      }
    },
    launch() {
      tone(180, 0.18, "sine", 0.05);
      tone(320, 0.12, "triangle", 0.03);
    },
    bounce() {
      tone(90, 0.08, "sine", 0.04);
    },
    collect() {
      tone(520, 0.12, "triangle", 0.05);
      tone(780, 0.16, "sine", 0.035);
    },
    win() {
      tone(349, 0.4, "sine", 0.04);
      tone(415, 0.7, "sine", 0.03);
    },
    fail() {
      tone(98, 0.9, "sine", 0.04);
      tone(147, 1.2, "triangle", 0.02);
    },
    setMuted(next: boolean) {
      muted = next;
      writeMuted(next);
      applyGain();
    },
    isMuted() {
      return muted;
    },
    setTitleQuiet(quiet: boolean) {
      titleQuiet = quiet;
      applyGain();
    },
  };
}
