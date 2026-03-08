// ============================================================
// Seeded PRNG — replaces Math.random() for reproducible runs
// Must be called BEFORE any engine imports.
// ============================================================

let _seed = 42;
let _state = 42;

/** mulberry32: fast, high-quality 32-bit PRNG */
function mulberry32(): number {
  _state = (_state + 0x6D2B79F5) | 0;
  let t = Math.imul(_state ^ (_state >>> 15), 1 | _state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Install seeded PRNG as Math.random. Call before any engine imports. */
export function installRng(seed: number): void {
  _seed = seed;
  _state = seed;
  Math.random = mulberry32;
}

/** Reset to the same seed (replay identical sequence). */
export function resetRng(): void {
  _state = _seed;
}

/** Get current seed for logging. */
export function getSeed(): number {
  return _seed;
}
