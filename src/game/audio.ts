export type Sfx = {
  resume: () => Promise<void>;
  launch: () => void;
  bounce: () => void;
  collect: () => void;
  win: () => void;
  fail: () => void;
};

export function createAudio(): Sfx {
  let ctx: AudioContext | null = null;

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

  return {
    async resume() {
      const ac = get();
      if (ac.state === "suspended") await ac.resume();
    },
    launch() {
      tone(180, 0.18, "sine", 0.07);
      tone(320, 0.12, "triangle", 0.04);
    },
    bounce() {
      tone(90, 0.08, "sine", 0.05);
    },
    collect() {
      tone(520, 0.12, "triangle", 0.07);
      tone(780, 0.16, "sine", 0.05);
    },
    win() {
      tone(392, 0.12, "triangle", 0.07);
      setTimeout(() => tone(523, 0.12, "triangle", 0.07), 90);
      setTimeout(() => tone(659, 0.22, "sine", 0.08), 180);
    },
    fail() {
      tone(140, 0.28, "sawtooth", 0.04);
    },
  };
}
