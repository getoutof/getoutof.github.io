export type Sfx = {
  resume: () => void;
  launch: () => void;
  bounce: () => void;
  collect: () => void;
  win: () => void;
  fail: () => void;
};

const GLASS = [146.83, 174.61, 196.0, 220.0, 233.08, 293.66, 349.23];

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

  return {
    resume() {
      const ac = get();
      void ac.resume();
      if (!scoreOn) {
        scoreOn = true;
        hold(146.83, "sine", 0.07);
        hold(174.61, "triangle", 0.045);
        hold(220.0, "sine", 0.04);
        hold(293.66, "sine", 0.02);
        tone(220, 3.2, "sine", 0.09);
        const next = () => {
          const freq = GLASS[Math.floor(Math.random() * GLASS.length)] ?? 220;
          tone(freq, 4.5, "sine", 0.07);
          window.setTimeout(next, 4000 + Math.random() * 4500);
        };
        window.setTimeout(next, 2500);
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
