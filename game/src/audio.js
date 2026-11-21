// The Quiet Gallery — sound, made in code. Every sound is synthesised
// with the Web Audio API: no audio files, no network, nothing to load.
// The game creates the context on the first user gesture (browsers refuse
// audio before one), and every effect is a short envelope over an
// oscillator or a burst of filtered noise.

export function makeAudio() {
  return {
    ctx: null,
    enabled: true,
    // The last footstep's alternating pitch, so steps sound like two feet.
    stepFlip: false,
  };
}

// Call from a click or a key press. Safe to call more than once.
export function unlockAudio(audio) {
  if (audio.ctx) {
    if (audio.ctx.state === 'suspended') audio.ctx.resume();
    return;
  }
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audio.ctx = new Ctx();
  } catch (err) {
    audio.enabled = false;
  }
}

function tone(audio, freq, seconds, type, gainValue, when = 0) {
  if (!audio.ctx || !audio.enabled) return;
  const t0 = audio.ctx.currentTime + when;
  const osc = audio.ctx.createOscillator();
  const gain = audio.ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(gainValue, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
  osc.connect(gain).connect(audio.ctx.destination);
  osc.start(t0);
  osc.stop(t0 + seconds + 0.05);
}

function noiseBurst(audio, seconds, filterFreq, gainValue) {
  if (!audio.ctx || !audio.enabled) return;
  const t0 = audio.ctx.currentTime;
  const length = Math.max(1, Math.floor(audio.ctx.sampleRate * seconds));
  const buffer = audio.ctx.createBuffer(1, length, audio.ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = audio.ctx.createBufferSource();
  source.buffer = buffer;
  const filter = audio.ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;
  const gain = audio.ctx.createGain();
  gain.gain.value = gainValue;
  source.connect(filter).connect(gain).connect(audio.ctx.destination);
  source.start(t0);
}

// A footstep: a soft low thud. Sneaking steps are quieter and shorter.
export function playStep(audio, sneaking) {
  if (!audio.ctx || !audio.enabled) return;
  audio.stepFlip = !audio.stepFlip;
  noiseBurst(audio, sneaking ? 0.05 : 0.08, audio.stepFlip ? 320 : 260, sneaking ? 0.05 : 0.12);
}

// The alarm: two sharp rising notes, the sound of being seen.
export function playAlert(audio) {
  tone(audio, 660, 0.16, 'square', 0.08);
  tone(audio, 880, 0.24, 'square', 0.08, 0.14);
}

// A guard turning suspicious: one short questioning blip.
export function playSuspicious(audio) {
  tone(audio, 520, 0.1, 'triangle', 0.07);
}

// A coin landing and ringing on the marble floor.
export function playCoin(audio) {
  tone(audio, 2093, 0.5, 'sine', 0.06);
  tone(audio, 2637, 0.4, 'sine', 0.04, 0.05);
}

// Picking up a relic: a small rising chime.
export function playPickup(audio) {
  tone(audio, 784, 0.12, 'sine', 0.08);
  tone(audio, 1047, 0.14, 'sine', 0.08, 0.09);
  tone(audio, 1319, 0.22, 'sine', 0.08, 0.18);
}

// The exit opening once every relic is taken.
export function playUnlock(audio) {
  tone(audio, 392, 0.2, 'triangle', 0.08);
  tone(audio, 587, 0.3, 'triangle', 0.08, 0.15);
}

// A clean getaway: a short fanfare.
export function playWin(audio) {
  [523, 659, 784, 1047].forEach((freq, i) => tone(audio, freq, 0.3, 'triangle', 0.09, i * 0.13));
}

// Being caught: a low falling note.
export function playCaught(audio) {
  tone(audio, 220, 0.5, 'sawtooth', 0.07);
  tone(audio, 147, 0.7, 'sawtooth', 0.07, 0.2);
}
