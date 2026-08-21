export type Sfx = {
  resume: () => void;
  launch: () => void;
  bounce: () => void;
  collect: () => void;
  win: () => void;
  fail: () => void;
};

const A2 = 110.0;
const D3 = 146.83;
const F3 = 174.61;
const A3 = 220.0;
const Bb3 = 233.08;
const C4 = 261.63;
const D4 = 293.66;
const E4 = 329.63;
const F4 = 349.23;
const A4 = 440.0;
const Bb4 = 466.16;
const C5 = 523.25;
const D5 = 587.33;

type Hit = { t: number; f: number; v: number; d: number };
type Chord = { t: number; f: number[]; v: number; d: number };

const PIANO: Hit[] = [
  { t: 0, f: D3, v: 0.12, d: 5.5 },
  { t: 0, f: D4, v: 0.09, d: 4.2 },
  { t: 3.2, f: F4, v: 0.1, d: 3.8 },
  { t: 6.4, f: A4, v: 0.11, d: 4.0 },
  { t: 10.2, f: D5, v: 0.13, d: 5.2 },
  { t: 14.0, f: C5, v: 0.08, d: 2.6 },
  { t: 16.2, f: Bb4, v: 0.09, d: 3.2 },
  { t: 18.8, f: A4, v: 0.08, d: 4.0 },
  { t: 22.0, f: F3, v: 0.11, d: 5.0 },
  { t: 22.0, f: F4, v: 0.09, d: 3.6 },
  { t: 25.8, f: E4, v: 0.08, d: 2.8 },
  { t: 28.5, f: D4, v: 0.1, d: 4.2 },
  { t: 32.0, f: A3, v: 0.08, d: 3.4 },
  { t: 34.8, f: Bb3, v: 0.09, d: 3.6 },
  { t: 37.6, f: A3, v: 0.07, d: 4.5 },
  { t: 41.0, f: D4, v: 0.1, d: 5.0 },
  { t: 44.5, f: F4, v: 0.09, d: 4.4 },
  { t: 48.0, f: E4, v: 0.08, d: 3.5 },
  { t: 51.0, f: D4, v: 0.09, d: 4.8 },
  { t: 51.0, f: A3, v: 0.06, d: 4.8 },
  { t: 55.0, f: A4, v: 0.06, d: 3.2 },
  { t: 57.4, f: F4, v: 0.07, d: 3.8 },
  { t: 59.2, f: D4, v: 0.08, d: 4.5 },
];

const GUITAR: Chord[] = [
  { t: 2.4, f: [D3, A3], v: 0.07, d: 2.4 },
  { t: 8.6, f: [A3, D4], v: 0.065, d: 2.2 },
  { t: 15.4, f: [F3, C4], v: 0.07, d: 2.6 },
  { t: 23.5, f: [D3, F3], v: 0.06, d: 2.3 },
  { t: 30.8, f: [A2, D3], v: 0.07, d: 2.8 },
  { t: 39.2, f: [D4, A4], v: 0.055, d: 2.5 },
  { t: 46.6, f: [F3, Bb3], v: 0.065, d: 2.4 },
  { t: 53.8, f: [D3, A3], v: 0.06, d: 3.0 },
];

const KICK = [0.04, 7.9, 16.05, 24.1, 32.0, 40.15, 48.05, 56.2];

const LOOP = 61;

export function createAudio(): Sfx {
  let ctx: AudioContext | null = null;
  let scoreOn = false;

  const get = () => {
    ctx ??= new AudioContext();
    return ctx;
  };

  const tone = (freq: number, duration: number, type: OscillatorType, gain = 0.08) => {
    const ac = get();
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);
    osc.connect(g).connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + duration);
  };

  const hold = (freq: number, type: OscillatorType, gain: number) => {
    const ac = get();
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;
    osc.connect(g).connect(ac.destination);
    osc.start();
  };

  const piano = (freq: number, when: number, velocity: number, decay: number) => {
    const ac = get();
    const partials: [number, number][] = [
      [1, 1],
      [2.003, 0.32],
      [3.01, 0.16],
      [4.02, 0.07],
    ];
    for (const [mult, amp] of partials) {
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = "sine";
      osc.frequency.value = freq * mult;
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(velocity * amp, when + 0.018);
      g.gain.exponentialRampToValueAtTime(0.0001, when + decay);
      osc.connect(g).connect(ac.destination);
      osc.start(when);
      osc.stop(when + decay + 0.05);
    }
  };

  const guitar = (freq: number, when: number, velocity: number, decay: number) => {
    const ac = get();
    const voices: [OscillatorType, number, number][] = [
      ["sawtooth", 0, 1],
      ["triangle", 8, 0.55],
    ];
    for (const [type, cents, amp] of voices) {
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      osc.detune.value = cents;
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(velocity * amp, when + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, when + decay);
      osc.connect(g).connect(ac.destination);
      osc.start(when);
      osc.stop(when + decay + 0.05);
    }
  };

  const kick = (when: number) => {
    const ac = get();
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(118, when);
    osc.frequency.exponentialRampToValueAtTime(42, when + 0.16);
    g.gain.setValueAtTime(0.22, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.42);
    osc.connect(g).connect(ac.destination);
    osc.start(when);
    osc.stop(when + 0.45);
    const click = ac.createOscillator();
    const cg = ac.createGain();
    click.type = "triangle";
    click.frequency.value = 720;
    cg.gain.setValueAtTime(0.04, when);
    cg.gain.exponentialRampToValueAtTime(0.0001, when + 0.03);
    click.connect(cg).connect(ac.destination);
    click.start(when);
    click.stop(when + 0.04);
  };

  const playLoop = (origin: number) => {
    for (const hit of PIANO) piano(hit.f, origin + hit.t, hit.v, hit.d);
    for (const chord of GUITAR) {
      for (const freq of chord.f) guitar(freq, origin + chord.t, chord.v, chord.d);
    }
    for (const t of KICK) kick(origin + t);
  };

  return {
    resume() {
      const ac = get();
      void ac.resume();
      if (!scoreOn) {
        scoreOn = true;
        hold(D3, "sine", 0.024);
        hold(F3, "sine", 0.014);
        hold(A3, "sine", 0.012);
        playLoop(ac.currentTime + 0.05);
        const loop = () => {
          playLoop(get().currentTime + 0.02);
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
  };
}
