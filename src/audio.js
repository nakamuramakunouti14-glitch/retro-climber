// 音。ファイルを使わず、その場で8ビット風の音を作る（Web Audio）。
// iPhone では最初のタップの中で unlock() を呼ぶまで音が出ない。

let ctx = null;
let master = null;
let muted = false;
let bgmTimer = null;

const midiToHz = (n) => 440 * 2 ** ((n - 69) / 12);

export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume().catch((err) => console.warn("音を再開できませんでした", err));
}

export function suspend() {
  if (ctx && ctx.state === "running") ctx.suspend().catch((err) => console.warn("音を止められませんでした", err));
}

export function setMuted(value) {
  muted = value;
  if (master) master.gain.value = muted ? 0 : 0.5;
}

export function isMuted() {
  return muted;
}

function tone({ f, f2, dur, type = "square", vol = 0.15, at = 0 }) {
  if (!ctx || !master) return;
  const t = Math.max(at, ctx.currentTime);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f, t);
  if (f2) osc.frequency.exponentialRampToValueAtTime(f2, t + dur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

const now = () => (ctx ? ctx.currentTime : 0);

export const sfx = {
  jump: () => tone({ f: 280, f2: 620, dur: 0.12, vol: 0.12 }),
  airJump: () => tone({ f: 420, f2: 900, dur: 0.12, vol: 0.12 }),
  gem: () => {
    tone({ f: 988, dur: 0.06, vol: 0.1 });
    tone({ f: 1319, dur: 0.12, vol: 0.1, at: now() + 0.06 });
  },
  stomp: () => tone({ f: 220, f2: 70, dur: 0.12, vol: 0.18 }),
  hurt: () => tone({ f: 420, f2: 90, dur: 0.3, type: "sawtooth", vol: 0.12 }),
  checkpoint: () => [523, 659, 784].forEach((n, i) => tone({ f: n, dur: 0.1, vol: 0.1, at: now() + i * 0.08 })),
  clear: () => {
    [72, 76, 79, 84].forEach((n, i) => tone({ f: midiToHz(n), dur: 0.14, vol: 0.12, at: now() + i * 0.12 }));
    [79, 84].forEach((n, i) => tone({ f: midiToHz(n), dur: 0.4, vol: 0.12, at: now() + 0.55 + i * 0.25 }));
  },
  select: () => tone({ f: 660, dur: 0.06, vol: 0.08 }),
};

// BGM。どれもこのゲームのために作った短い曲（8分音符の並び。null は休み）。
const SONGS = {
  meadow: {
    bpm: 140,
    lead: [72, null, 76, 79, 77, 76, 74, null, 72, 74, 76, 72, 74, null, 67, null,
      72, null, 76, 79, 81, 79, 77, 76, 74, 76, 72, null, 72, null, null, null],
    bass: [48, 55, 53, 55, 50, 55, 43, 55, 48, 55, 53, 55, 43, 50, 48, null],
  },
  town: {
    bpm: 150,
    lead: [65, 69, 72, 69, 70, 69, 67, null, 65, 67, 69, 65, 67, null, 60, null,
      65, 69, 72, 77, 76, 74, 72, 69, 70, 72, 69, 67, 65, null, null, null],
    bass: [41, 48, 46, 48, 43, 48, 36, 48, 41, 48, 46, 48, 36, 43, 41, null],
  },
  tower: {
    bpm: 132,
    lead: [69, null, 72, 76, 74, 72, 71, null, 69, 71, 72, 69, 71, null, 64, null,
      69, 72, 76, 81, 79, 77, 76, 74, 72, 74, 71, 68, 69, null, null, null],
    bass: [45, 52, 48, 52, 50, 52, 40, 52, 45, 52, 48, 52, 40, 47, 45, null],
  },
};

export function playBgm(id) {
  stopBgm();
  const song = SONGS[id];
  if (!ctx || !song) return;
  const eighth = 60 / song.bpm / 2;
  let step = 0;
  let next = ctx.currentTime + 0.15;
  bgmTimer = setInterval(() => {
    if (!ctx || ctx.state !== "running") return;
    if (next < ctx.currentTime) next = ctx.currentTime + 0.05;
    while (next < ctx.currentTime + 0.15) {
      const n = song.lead[step % song.lead.length];
      if (n != null) tone({ f: midiToHz(n), dur: eighth * 0.9, vol: 0.05, at: next });
      if (step % 2 === 0) {
        const b = song.bass[(step / 2) % song.bass.length];
        if (b != null) tone({ f: midiToHz(b), dur: eighth * 1.8, type: "triangle", vol: 0.14, at: next });
      }
      next += eighth;
      step++;
    }
  }, 25);
}

export function stopBgm() {
  if (bgmTimer) clearInterval(bgmTimer);
  bgmTimer = null;
}
