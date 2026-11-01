// Normalized steepest-descent directions for ℓp and quadratic norms in R^2.
//   Δx_nsd = argmin { ∇fᵀv : ‖v‖ ≤ 1 },   Δx_sd = ‖∇f‖_* · Δx_nsd
import type { Vec } from './core';
import { symEig, symInv, symMul, type Sym } from './functions';

export interface SteepestDir {
  /** normalized steepest descent direction (on the unit sphere of the norm) */
  nsd: Vec;
  /** dual norm of the gradient, ‖g‖_* */
  dual: number;
}

const sign = (v: number) => (v > 0 ? 1 : v < 0 ? -1 : 0);

/** ℓp steepest descent, p ∈ [1, ∞]. Uses the dual exponent q = p/(p-1). */
export function lpDirection(g: Vec, p: number): SteepestDir {
  const a0 = Math.abs(g[0]);
  const a1 = Math.abs(g[1]);
  const m = Math.max(a0, a1);
  if (m === 0) return { nsd: [0, 0], dual: 0 };
  if (p <= 1 + 1e-9) {
    // dual is ℓ∞: move along the coordinate with the largest |g_i|
    return a0 >= a1 ? { nsd: [-sign(g[0]), 0], dual: m } : { nsd: [0, -sign(g[1])], dual: m };
  }
  if (!Number.isFinite(p)) return { nsd: [-sign(g[0]), -sign(g[1])], dual: a0 + a1 };
  const q = p / (p - 1);
  // rescale by max|g_i| so |g_i|^q never overflows when p → 1
  const b0 = a0 / m;
  const b1 = a1 / m;
  const dn = Math.pow(Math.pow(b0, q) + Math.pow(b1, q), 1 / q); // ‖g/m‖_q
  const v: Vec = [-sign(g[0]) * Math.pow(b0 / dn, q - 1), -sign(g[1]) * Math.pow(b1 / dn, q - 1)];
  return { nsd: v, dual: m * dn };
}

/** Quadratic norm ‖v‖_P = sqrt(vᵀPv): Δx_nsd = -P⁻¹g / sqrt(gᵀP⁻¹g). */
export function quadDirection(g: Vec, P: Sym): SteepestDir {
  const Pg = symMul(symInv(P), g);
  const dual = Math.sqrt(Math.max(0, g[0] * Pg[0] + g[1] * Pg[1]));
  if (dual === 0) return { nsd: [0, 0], dual: 0 };
  return { nsd: [-Pg[0] / dual, -Pg[1] / dual], dual };
}

export function lpNorm(v: Vec, p: number) {
  if (!Number.isFinite(p)) return Math.max(Math.abs(v[0]), Math.abs(v[1]));
  return Math.pow(Math.pow(Math.abs(v[0]), p) + Math.pow(Math.abs(v[1]), p), 1 / p);
}

/** Boundary of the ℓp unit ball. */
export function lpBall(p: number, n = 360): Vec[] {
  if (p <= 1 + 1e-9) return [[1, 0], [0, 1], [-1, 0], [0, -1]];
  if (!Number.isFinite(p)) return [[1, 1], [-1, 1], [-1, -1], [1, -1]];
  const pts: Vec[] = [];
  for (let i = 0; i < n; i++) {
    const t = (2 * Math.PI * i) / n;
    const u: Vec = [Math.cos(t), Math.sin(t)];
    const r = lpNorm(u, p);
    pts.push([u[0] / r, u[1] / r]);
  }
  return pts;
}

/** Makes P positive definite (shifting the spectrum if needed). Returns the
 *  matrix and whether a shift was applied. */
export function makePD(H: Sym, ratio = 0.01): { P: Sym; shifted: boolean } {
  const [l1, l2] = symEig(H);
  const floor = ratio * Math.max(Math.abs(l1), Math.abs(l2), 1e-9);
  if (l2 >= floor) return { P: H, shifted: false };
  const s = floor - l2;
  return { P: [H[0] + s, H[1], H[2] + s], shifted: true };
}

/** Slider s ∈ [0, 1] ↦ p = 1/(1 - s): s=0 → 1, s=½ → 2, s=1 → ∞. Then 1/q = s. */
export const sliderToP = (s: number) => (s >= 0.999 ? Infinity : 1 / (1 - s));
