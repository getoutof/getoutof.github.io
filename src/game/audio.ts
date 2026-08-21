export type Sfx = {
  resume: () => void;
  launch: () => void;
  bounce: () => void;
  collect: () => void;
  win: () => void;
  fail: () => void;
};

const D3 = 146.83;
const F3 = 174.61;
const A3 = 220.0;
const Bb3 = 233.08;
const D4 = 293.66;
const E4 = 329.63;
const F4 = 349.23;
const G4 = 392.0;
const A4 = 440.0;
const Bb4 = 466.16;
const C5 = 523.25;
const D5 = 587.33;

type Hit = { t: number; f: number; v: number; d: number };

const RIFF: Hit[] = [
  { t: 0, f: D3, v: 0.13, d: 2.4 },
  { t: 0, f: D4, v: 0.1, d: 1.5 },
  { t: 0.55, f: F4, v: 0.11, d: 1.2 },
  { t: 1.1, f: A4, v: 0.13, d: 1.3 },
  { t: 1.65, f: D5, v: 0.17, d: 1.9 },
  { t: 2.45, f: C5, v: 0.1, d: 0.7 },
  { t: 2.85, f: Bb4, v: 0.11, d: 0.8 },
  { t: 3.3, f: A4, v: 0.1, d: 1.1 },
  { t: 4.05, f: F3, v: 0.11, d: 2.1 },
  { t: 4.05, f: F4, v: 0.1, d: 1.2 },
  { t: 4.65, f: E4, v: 0.09, d: 0.65 },
  { t: 5.1, f: D4, v: 0.11, d: 1.4 },
  { t: 5.75, f: A3, v: 0.09, d: 1.2 },
  { t: 6.35, f: Bb3, v: 0.1, d: 1.1 },
  { t: 6.95, f: A3, v: 0.08, d: 1.7 },
  { t: 8.05, f: D5, v: 0.16, d: 0.32 },
  { t: 8.22, f: C5, v: 0.14, d: 0.32 },
  { t: 8.39, f: Bb4, v: 0.13, d: 0.32 },
  { t: 8.56, f: A4, v: 0.12, d: 0.32 },
  { t: 8.73, f: G4, v: 0.12, d: 0.32 },
  { t: 8.9, f: F4, v: 0.11, d: 0.32 },
  { t: 9.07, f: E4, v: 0.11, d: 0.32 },
  { t: 9.24, f: D4, v: 0.14, d: 1.6 },
  { t: 9.24, f: D3, v: 0.12, d: 2.2 },
  { t: 10.5, f: A4, v: 0.08, d: 1.7 },
  { t: 11.35, f: F4, v: 0.08, d: 1.9 },
  { t: 12.3, f: D4, v: 0.1, d: 2.6 },
  { t: 12.3, f: A3, v: 0.07, d: 2.6 },
];

const LOOP = 14.8;

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
      g.gain.linearRampToValueAtTime(velocity * amp, when + 0.014);
      g.gain.exponentialRampToValueAtTime(0.0001, when + decay);
      osc.connect(g).connect(ac.destination);
      osc.start(when);
      osc.stop(when + decay + 0.05);
    }
  };

  const playRiff = (origin: number) => {
    for (const hit of RIFF) piano(hit.f, origin + hit.t, hit.v, hit.d);
  };

  return {
    resume() {
      const ac = get();
      void ac.resume();
      if (!scoreOn) {
        scoreOn = true;
        hold(D3, "sine", 0.03);
        hold(F3, "sine", 0.018);
        hold(A3, "sine", 0.016);
        playRiff(ac.currentTime + 0.05);
        const loop = () => {
          playRiff(get().currentTime + 0.02);
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
