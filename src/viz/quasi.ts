// Helpers for the CG / BFGS / Nesterov pages.
import { add, dot, norm, scale, sub, type Vec, type View } from './core';
import { symEig, symMul, type Objective, type Sym } from './functions';
import { lineSearch, type Iterate, type LSOptions } from './optim';

/** Contour a larger area than the view so the canvas edges stay covered. */
export function padded(v: View, f = 0.4): View {
  const w = v.x[1] - v.x[0];
  const h = v.y[1] - v.y[0];
  return { x: [v.x[0] - w * f, v.x[1] + w * f], y: [v.y[0] - h * f, v.y[1] + h * f] };
}

/** Square root of a positive definite symmetric matrix. */
export function symSqrt(A: Sym): Sym {
  const [l1, l2, ang] = symEig(A);
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const a = Math.sqrt(Math.max(l1, 0));
  const b = Math.sqrt(Math.max(l2, 0));
  // R diag(a,b) Rᵀ with R = [[c,-s],[s,c]]
  return [a * c * c + b * s * s, (a - b) * c * s, a * s * s + b * c * c];
}

export const isPD = (A: Sym) => A[0] > 0 && A[0] * A[2] - A[1] * A[1] > 0;

/** Product of two symmetric matrices (not symmetric in general): [[m00,m01],[m10,m11]]. */
export function matMul(A: Sym, B: Sym): [number, number, number, number] {
  return [A[0] * B[0] + A[1] * B[1], A[0] * B[1] + A[1] * B[2], A[1] * B[0] + A[2] * B[1], A[1] * B[1] + A[2] * B[2]];
}

/** Frobenius norm of H·∇²f − I: zero when BFGS has learned the exact inverse Hessian. */
export function inverseError(H: Sym, hess: Sym) {
  const [a, b, c, d] = matMul(H, hess);
  return Math.hypot(a - 1, b, c, d - 1);
}

/** BFGS where H0 = I for the first step and is then rescaled to (sᵀy / yᵀy)·I
 *  before the first update (Nocedal & Wright, eq. 6.20). */
export function bfgsScaled(obj: Objective, x0: Vec, ls: LSOptions, maxIter = 200): Iterate[] {
  const pt = (x: Vec): Iterate => ({ x, f: obj.f(x), g: obj.grad(x) });
  const path: Iterate[] = [pt(x0)];
  let H: Sym = [1, 0, 1];
  for (let k = 0; k < maxIter; k++) {
    const it = path[k];
    if (norm(it.g) < 1e-9 || !Number.isFinite(it.f) || norm(it.x) > 1e6) break;
    if (k > 0 && Math.abs(path[k - 1].f - it.f) <= 1e-15 * Math.max(1, Math.abs(it.f)) && norm(it.g) < 1e-6) break;
    let p = scale(symMul(H, it.g), -1);
    if (dot(p, it.g) >= 0) {
      H = [1, 0, 1];
      p = scale(it.g, -1);
    }
    const { alpha, trials } = lineSearch(obj, it.x, p, ls);
    it.p = p;
    it.alpha = alpha;
    it.trials = trials;
    it.H = H;
    const next = pt(add(it.x, scale(p, alpha)));
    path.push(next);
    const s = sub(next.x, it.x);
    const y = sub(next.g, it.g);
    const sy = dot(s, y);
    if (sy > 1e-12) {
      if (k === 0) {
        const g = sy / dot(y, y);
        H = [g, 0, g];
      }
      const r = 1 / sy;
      const Hy = symMul(H, y);
      const yHy = dot(y, Hy);
      H = [
        H[0] - r * (2 * s[0] * Hy[0]) + (r * r * yHy + r) * s[0] * s[0],
        H[1] - r * (s[0] * Hy[1] + Hy[0] * s[1]) + (r * r * yHy + r) * s[0] * s[1],
        H[2] - r * (2 * s[1] * Hy[1]) + (r * r * yHy + r) * s[1] * s[1],
      ];
    }
    next.H = H;
  }
  return path;
}
