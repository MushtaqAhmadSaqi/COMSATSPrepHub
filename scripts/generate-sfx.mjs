#!/usr/bin/env node
/**
 * Synthesizes crisp, zero-dependency 16-bit PCM mono WAV SFX into public/sfx/
 * for Remotion showcase & launch compositions.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '..', 'public', 'sfx');
const SAMPLE_RATE = 44100;

function writeWav(filename, samples) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const numSamples = samples.length;
  const dataBytes = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataBytes);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // PCM header size
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(1, 22); // Mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // Byte rate
  buffer.writeUInt16LE(2, 32); // Block align
  buffer.writeUInt16LE(16, 34); // Bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataBytes, 40);

  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }

  const outPath = path.join(OUT_DIR, filename);
  fs.writeFileSync(outPath, buffer);
  return { filename, bytes: buffer.length };
}

function makeWhoosh(durationSec = 0.34) {
  const n = Math.floor(SAMPLE_RATE * durationSec);
  const out = new Float64Array(n);
  // Deterministic PRNG for clean filtered noise sweep
  let seed = 1337;
  let lp = 0;
  let bp = 0;
  for (let i = 0; i < n; i++) {
    seed = (seed * 16807) % 2147483647;
    const white = (seed / 2147483647) * 2 - 1;
    const u = i / n;
    const env = Math.sin(Math.PI * u) ** 1.4;
    const cutoff = 0.04 + 0.18 * Math.sin(Math.PI * u);
    lp += cutoff * (white - lp);
    bp += 0.12 * (lp - bp);
    out[i] = bp * env * 0.65;
  }
  return out;
}

function makePop(durationSec = 0.095) {
  const n = Math.floor(SAMPLE_RATE * durationSec);
  const out = new Float64Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const u = i / n;
    const freq = 640 * Math.exp(-10 * t) + 170;
    phase += (2 * Math.PI * freq) / SAMPLE_RATE;
    const env = Math.min(1, i / 90) * Math.exp(-26 * t) * (1 - u);
    out[i] = Math.sin(phase) * env * 0.45;
  }
  return out;
}

function makeThump(durationSec = 0.18) {
  const n = Math.floor(SAMPLE_RATE * durationSec);
  const out = new Float64Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const freq = 155 * Math.exp(-14 * t) + 46;
    phase += (2 * Math.PI * freq) / SAMPLE_RATE;
    const env = Math.min(1, i / 110) * Math.exp(-15 * t);
    const overtone = Math.sin(phase * 2) * 0.18 * Math.exp(-32 * t);
    out[i] = (Math.sin(phase) + overtone) * env * 0.55;
  }
  return out;
}

function makeChime(durationSec = 0.6) {
  const n = Math.floor(SAMPLE_RATE * durationSec);
  const out = new Float64Array(n);
  const freqs = [523.25, 659.25, 783.99, 1046.5];
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    let val = 0;
    for (let f = 0; f < freqs.length; f++) {
      const start = f * 0.045;
      if (t < start) continue;
      const localT = t - start;
      const attack = Math.min(1, localT / 0.012);
      const decay = Math.exp(-(4.2 + f * 0.8) * localT);
      val += Math.sin(2 * Math.PI * freqs[f] * localT) * attack * decay * 0.2;
    }
    out[i] = val;
  }
  return out;
}

const files = [
  writeWav('whoosh.wav', makeWhoosh()),
  writeWav('pop.wav', makePop()),
  writeWav('thump.wav', makeThump()),
  writeWav('chime.wav', makeChime())
];

console.log('Generated SFX files in public/sfx/:', files.map((f) => `${f.filename} (${f.bytes}B)`).join(', '));
