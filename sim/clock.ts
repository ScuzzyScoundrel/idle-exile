// ============================================================
// Mock clock — controllable Date.now() for headless sim
// Must be called BEFORE any engine imports.
// ============================================================

let _now = 0;
const _originalDateNow = Date.now;

/** Install mock clock. Starts at time 0. */
export function installClock(): void {
  _now = 0;
  Date.now = () => _now;
}

/** Advance the mock clock by `ms` milliseconds. */
export function advanceClock(ms: number): void {
  _now += ms;
}

/** Set the mock clock to an absolute value. */
export function setClock(ms: number): void {
  _now = ms;
}

/** Get current mock time in ms. */
export function getNow(): number {
  return _now;
}

/** Restore real Date.now() (for cleanup). */
export function restoreClock(): void {
  Date.now = _originalDateNow;
}
