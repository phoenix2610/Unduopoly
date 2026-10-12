"use client";

let ctx: AudioContext | null = null;

export function unlockAudio() {
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
}

function tone(freq: number, at: number, length = 0.18, gain = 0.5) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = freq;
  amp.gain.setValueAtTime(0, ctx.currentTime + at);
  amp.gain.linearRampToValueAtTime(gain, ctx.currentTime + at + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + at + length);
  osc.connect(amp).connect(ctx.destination);
  osc.start(ctx.currentTime + at);
  osc.stop(ctx.currentTime + at + length + 0.02);
}

export function chimeNewOrder() {
  [0, 0.22, 0.44].forEach((t) => tone(1320, t));
}

export function chimeArrival() {
  tone(660, 0, 0.22);
  tone(990, 0.24, 0.32);
}
