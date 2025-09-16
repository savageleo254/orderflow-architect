// Deterministic seeded random number generator shared by both client and server
// Implementation: Mulberry32 PRNG – tiny and fast, good enough for reproducible mock data.
// The generator is deterministic for the same seed (default 42).
// Do NOT import any .env secret here.

let _seed = 42 >>> 0 // force uint32

export function setSeed(seed: number) {
  _seed = seed >>> 0
}

export function seededRandom(): number {
  // Mulberry32 algorithm
  let t = (_seed += 0x6d2b79f5)
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export function randomBetween(min: number, max: number): number {
  return min + seededRandom() * (max - min)
}
