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

  return {
    resume() {
      const ac = get();
      void ac.resume();
      unlock(ac);
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

function unlock(ac: AudioContext): void {
  const buffer = ac.createBuffer(1, 1, ac.sampleRate);
  const src = ac.createBufferSource();
  src.buffer = buffer;
  src.connect(ac.destination);
  src.start(0);
}

function startScore(ac: AudioContext): void {
  const master = ac.createGain();
  master.gain.value = 0.35;
  master.connect(ac.destination);

  const delay = ac.createDelay(2);
  delay.delayTime.value = 0.62;
  const feedback = ac.createGain();
  feedback.gain.value = 0.36;
  const wet = ac.createGain();
  wet.gain.value = 0.55;
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(wet);
  wet.connect(master);

  const dry = ac.createGain();
  dry.gain.value = 0.85;
  dry.connect(master);

  drone(ac, dry, delay, 146.83, 0.11, 0);
  drone(ac, dry, delay, 174.61, 0.08, 5);
  drone(ac, dry, delay, 220.0, 0.07, -4);
  drone(ac, dry, delay, 293.66, 0.045, 2);
  hush(ac, dry);
  glass(ac, dry, delay, 220);
  glass(ac, dry, delay, 146.83);

  const next = () => {
    const freq = GLASS[Math.floor(Math.random() * GLASS.length)] ?? 220;
    glass(ac, dry, delay, freq);
    if (Math.random() < 0.4) glass(ac, dry, delay, freq * 1.5);
    window.setTimeout(next, 3800 + Math.random() * 5200);
  };
  window.setTimeout(next, 1800);
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
  osc.type = "triangle";
  osc.frequency.value = freq;
  osc.detune.value = cents;
  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 900;
  const g = ac.createGain();
  const now = ac.currentTime;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.linearRampToValueAtTime(level, now + 1.4);
  osc.connect(filter);
  filter.connect(g);
  g.connect(dry);
  g.connect(delay);
  osc.start();
}

function glass(ac: AudioContext, dry: AudioNode, delay: AudioNode, freq: number): void {
  const osc = ac.createOscillator();
  osc.type = "sine";
  osc.frequency.value = freq;
  const g = ac.createGain();
  const now = ac.currentTime;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.linearRampToValueAtTime(0.16, now + 0.35);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 7.5);
  osc.connect(g);
  g.connect(dry);
  g.connect(delay);
  osc.start(now);
  osc.stop(now + 7.8);
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
  filter.frequency.value = 480;
  const g = ac.createGain();
  g.gain.value = 0.03;
  src.connect(filter);
  filter.connect(g);
  g.connect(dest);
  src.start();
}
