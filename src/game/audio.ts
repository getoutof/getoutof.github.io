export type Sfx = {
  resume: () => Promise<void>;
  launch: () => void;
  bounce: () => void;
  collect: () => void;
  win: () => void;
  fail: () => void;
};

const GLASS = [146.83, 155.56, 174.61, 196.0, 220.0, 233.08, 277.18, 293.66];

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

  return {
    async resume() {
      const ac = get();
      if (ac.state === "suspended") await ac.resume();
      if (!scoreOn) {
        scoreOn = true;
        startScore(ac);
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

function startScore(ac: AudioContext): void {
  const master = ac.createGain();
  master.gain.value = 0.0001;
  master.gain.exponentialRampToValueAtTime(0.22, ac.currentTime + 6);
  master.connect(ac.destination);

  const delay = ac.createDelay(2);
  delay.delayTime.value = 0.84;
  const feedback = ac.createGain();
  feedback.gain.value = 0.44;
  const wet = ac.createGain();
  wet.gain.value = 0.5;
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(wet);
  wet.connect(master);

  const dry = ac.createGain();
  dry.gain.value = 0.62;
  dry.connect(master);

  drone(ac, dry, delay, 36.71, 0.05, 0);
  drone(ac, dry, delay, 73.42, 0.04, 6);
  drone(ac, dry, delay, 69.3, 0.018, -9);
  drone(ac, dry, delay, 110, 0.02, 3);
  drone(ac, dry, delay, 174.61, 0.01, 0);
  hush(ac, dry);

  const next = () => {
    const freq = GLASS[Math.floor(Math.random() * GLASS.length)] ?? 146.83;
    glass(ac, dry, delay, freq);
    if (Math.random() < 0.35) {
      glass(ac, dry, delay, freq * 0.5);
    }
    window.setTimeout(next, 5200 + Math.random() * 9000);
  };
  window.setTimeout(next, 2400);
}

function drone(
  ac: AudioContext,
  dry: AudioNode,
  delay: AudioNode,
  freq: number,
  level: number,
  cents: number,
): void {
  const osc = ac.createOscillator();
  osc.type = "sine";
  osc.frequency.value = freq;
  osc.detune.value = cents;
  const g = ac.createGain();
  const lfo = ac.createOscillator();
  const lfoGain = ac.createGain();
  lfo.type = "sine";
  lfo.frequency.value = 0.04 + Math.random() * 0.03;
  lfoGain.gain.value = level * 0.35;
  g.gain.value = level * 0.7;
  lfo.connect(lfoGain);
  lfoGain.connect(g.gain);
  osc.connect(g);
  g.connect(dry);
  g.connect(delay);
  osc.start();
  lfo.start();
}

function glass(ac: AudioContext, dry: AudioNode, delay: AudioNode, freq: number): void {
  const osc = ac.createOscillator();
  osc.type = "sine";
  osc.frequency.value = freq;
  const g = ac.createGain();
  const now = ac.currentTime;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.055, now + 2.2);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 11);
  osc.connect(g);
  g.connect(dry);
  g.connect(delay);
  osc.start(now);
  osc.stop(now + 11.2);
}

function hush(ac: AudioContext, dest: AudioNode): void {
  const buffer = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 160;
  const g = ac.createGain();
  g.gain.value = 0.016;
  src.connect(filter);
  filter.connect(g);
  g.connect(dest);
  src.start();
}
