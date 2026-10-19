export type Vec = { x: number; y: number };
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
export const center = (p: Vec[]): Vec => ({ x: p.reduce((a, v) => a + v.x, 0) / Math.max(1, p.length), y: p.reduce((a, v) => a + v.y, 0) / Math.max(1, p.length) });
export function segmentDistance(p: Vec, a: Vec, b: Vec) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t);
}
// Use the same even-odd convention as CanvasRenderingContext2D.fill('evenodd').
export function inside(p: Vec, polygon: Vec[]) {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) result = !result;
  }
  return result;
}
export function pathLength(p: Vec[]) { let n = 0; for (let i = 1; i < p.length; i++) n += dist(p[i - 1], p[i]); return n; }
export function nearPath(v: Vec, p: Vec[], radius: number, closed = true) {
  for (let i = 1; i < p.length; i++) if (segmentDistance(v, p[i - 1], p[i]) <= radius) return true;
  return closed && p.length > 2 && segmentDistance(v, p[p.length - 1], p[0]) <= radius;
}
// Bounded sampling also handles self-intersection without signed-area cancellation.
export function foldedArea(p: Vec[]) {
  if (p.length < 3) return 0;
  const minX = Math.min(...p.map(v => v.x)), maxX = Math.max(...p.map(v => v.x));
  const minY = Math.min(...p.map(v => v.y)), maxY = Math.max(...p.map(v => v.y));
  let hits = 0;
  for (let x = 0; x < 16; x++) for (let y = 0; y < 16; y++)
    if (inside({ x: minX + (x + .5) / 16 * (maxX - minX), y: minY + (y + .5) / 16 * (maxY - minY) }, p)) hits++;
  return hits / 256 * (maxX - minX) * (maxY - minY);
}
export function rng(seed: number) {
  let state = seed >>> 0;
  return () => { state += 0x6D2B79F5; let t = state; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
