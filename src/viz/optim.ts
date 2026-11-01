// Line searches and descent methods. Every method precomputes its whole
// trajectory so the page can scrub through iterations freely.
import { add, dot, norm, scale, sub, type Vec } from './core';
import { symInv, symMul, type Objective, type Sym } from './functions';

export interface Iterate {
  x: Vec;
  f: number;
  g: Vec;
  /** search direction used to leave this iterate (absent on the last one) */
  p?: Vec;
  alpha?: number;
  /** method-specific extras, e.g. inverse-Hessian approximation, trial steps */
  H?: Sym;
  trials?: number[];
  y?: Vec; // look-ahead point (Nesterov)
}

export type LineSearch = 'fixed' | 'exact' | 'armijo' | 'wolfe';

export interface LSOptions {
  kind: LineSearch;
  alpha: number; // fixed step, or initial trial step
  c1?: number;
  c2?: number;
  rho?: number;
}

/* ------------------------------------------------------------ line search */

/** φ(α) = f(x + α p) and φ'(α). */
export function phi(obj: Objective, x: Vec, p: Vec) {
  return {
    f: (a: number) => obj.f(add(x, scale(p, a))),
    d: (a: number) => dot(obj.grad(add(x, scale(p, a))), p),
  };
}

/** Backtracking: shrink α by ρ until the Armijo condition holds. */
export function armijo(obj: Objective, x: Vec, p: Vec, a0: number, c1 = 1e-4, rho = 0.5) {
  const { f } = phi(obj, x, p);
  const f0 = obj.f(x);
  const d0 = dot(obj.grad(x), p);
  let a = a0;
  const trials = [a];
  for (let i = 0; i < 60 && f(a) > f0 + c1 * a * d0; i++) {
    a *= rho;
    trials.push(a);
  }
  return { alpha: a, trials };
}

/** Strong-Wolfe line search (Nocedal & Wright, Alg. 3.5 + 3.6). */
export function wolfe(obj: Objective, x: Vec, p: Vec, a1 = 1, c1 = 1e-4, c2 = 0.9) {
  const { f, d } = phi(obj, x, p);
  const f0 = f(0);
  const d0 = d(0);
  const trials: number[] = [];
  const zoom = (lo: number, hi: number) => {
    for (let i = 0; i < 40; i++) {
      const a = (lo + hi) / 2;
      trials.push(a);
      const fa = f(a);
      if (fa > f0 + c1 * a * d0 || fa >= f(lo)) hi = a;
      else {
        const da = d(a);
        if (Math.abs(da) <= -c2 * d0) return a;
        if (da * (hi - lo) >= 0) hi = lo;
        lo = a;
      }
    }
    return (lo + hi) / 2;
  };
  let prev = 0;
  let a = a1;
  for (let i = 0; i < 30; i++) {
    trials.push(a);
    const fa = f(a);
    if (fa > f0 + c1 * a * d0 || (i > 0 && fa >= f(prev))) return { alpha: zoom(prev, a), trials };
    const da = d(a);
    if (Math.abs(da) <= -c2 * d0) return { alpha: a, trials };
    if (da >= 0) return { alpha: zoom(a, prev), trials };
    prev = a;
    a *= 2;
  }
  return { alpha: a, trials };
}

/** Exact minimization of φ along p: bracket, then golden section. */
export function exact(obj: Objective, x: Vec, p: Vec) {
  if (obj.id === 'quadratic') {
    // closed form: α = -∇f(x)ᵀp / pᵀAp
    const curv = dot(p, symMul(obj.hess(x), p));
    if (curv > 0) return { alpha: -dot(obj.grad(x), p) / curv, trials: [] as number[] };
  }
  const { f } = phi(obj, x, p);
  let hi = 1e-3;
  while (f(hi * 2) < f(hi) && hi < 1e6) hi *= 2;
  hi *= 2;
  let lo = 0;
  const gr = (Math.sqrt(5) - 1) / 2;
  let c = hi - gr * (hi - lo);
  let e = lo + gr * (hi - lo);
  for (let i = 0; i < 80; i++) {
    if (f(c) < f(e)) hi = e;
    else lo = c;
    c = hi - gr * (hi - lo);
    e = lo + gr * (hi - lo);
  }
  return { alpha: (lo + hi) / 2, trials: [] as number[] };
}

export function lineSearch(obj: Objective, x: Vec, p: Vec, o: LSOptions) {
  switch (o.kind) {
    case 'exact':
      return exact(obj, x, p);
    case 'armijo':
      return armijo(obj, x, p, o.alpha, o.c1, o.rho);
    case 'wolfe':
      return wolfe(obj, x, p, o.alpha, o.c1, o.c2);
    default:
      return { alpha: o.alpha, trials: [o.alpha] };
  }
}

/* ---------------------------------------------------------------- methods */

const TOL = 1e-9;
const BLOWUP = 1e6;

function point(obj: Objective, x: Vec): Iterate {
  return { x, f: obj.f(x), g: obj.grad(x) };
}

function diverged(it: Iterate) {
  return !Number.isFinite(it.f) || norm(it.x) > BLOWUP;
}

/** Stop when the gradient vanishes, the iterate blows up, or f stalls at machine precision. */
function done(path: Iterate[], k: number) {
  const it = path[k];
  if (norm(it.g) < TOL || diverged(it)) return true;
  return k > 0 && Math.abs(path[k - 1].f - it.f) <= 1e-15 * Math.max(1, Math.abs(it.f)) && norm(it.g) < 1e-6;
}

/** Generic "direction + line search" loop. */
export function descent(obj: Objective, x0: Vec, dir: (it: Iterate, k: number) => Vec, ls: LSOptions, maxIter = 200): Iterate[] {
  const path: Iterate[] = [point(obj, x0)];
  for (let k = 0; k < maxIter; k++) {
    const it = path[k];
    if (done(path, k)) break;
    let p = dir(it, k);
    if (dot(p, it.g) >= 0) p = scale(it.g, -1); // safeguard: must be a descent direction
    const { alpha, trials } = lineSearch(obj, it.x, p, ls);
    it.p = p;
    it.alpha = alpha;
    it.trials = trials;
    path.push(point(obj, add(it.x, scale(p, alpha))));
  }
  return path;
}

export const gradientDescent = (obj: Objective, x0: Vec, ls: LSOptions, maxIter = 200) =>
  descent(obj, x0, (it) => scale(it.g, -1), ls, maxIter);

export const newton = (obj: Objective, x0: Vec, ls: LSOptions, maxIter = 200) =>
  descent(obj, x0, (it) => scale(symMul(symInv(obj.hess(it.x)), it.g), -1), ls, maxIter);

/** Nonlinear conjugate gradient. On a quadratic with exact line search all
 *  variants coincide with linear CG and finish in n = 2 steps. */
export function conjugateGradient(obj: Objective, x0: Vec, ls: LSOptions, beta: 'FR' | 'PR' | 'HS' = 'PR', maxIter = 200): Iterate[] {
  const path: Iterate[] = [point(obj, x0)];
  let p: Vec = scale(path[0].g, -1);
  for (let k = 0; k < maxIter; k++) {
    const it = path[k];
    if (done(path, k)) break;
    if (dot(p, it.g) >= 0) p = scale(it.g, -1); // restart
    const { alpha, trials } = lineSearch(obj, it.x, p, ls);
    it.p = p;
    it.alpha = alpha;
    it.trials = trials;
    const next = point(obj, add(it.x, scale(p, alpha)));
    path.push(next);
    const yk = sub(next.g, it.g);
    let b: number;
    if (beta === 'FR') b = dot(next.g, next.g) / dot(it.g, it.g);
    else if (beta === 'HS') b = dot(next.g, yk) / dot(p, yk);
    else b = Math.max(0, dot(next.g, yk) / dot(it.g, it.g)); // PR+
    if (!Number.isFinite(b)) b = 0;
    p = add(scale(next.g, -1), scale(p, b));
  }
  return path;
}

/** BFGS on the inverse Hessian H. Each iterate stores the H used for its step. */
export function bfgs(obj: Objective, x0: Vec, ls: LSOptions, H0: Sym = [1, 0, 1], maxIter = 200): Iterate[] {
  const path: Iterate[] = [point(obj, x0)];
  let H: Sym = H0;
  for (let k = 0; k < maxIter; k++) {
    const it = path[k];
    if (done(path, k)) break;
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
    const next = point(obj, add(it.x, scale(p, alpha)));
    path.push(next);
    const s = sub(next.x, it.x);
    const y = sub(next.g, it.g);
    const sy = dot(s, y);
    if (sy > 1e-12) {
      // H+ = (I - ρ s yᵀ) H (I - ρ y sᵀ) + ρ s sᵀ
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

/** Momentum methods with a fixed step α.
 *  heavy-ball: x+ = x - α∇f(x) + β(x - x⁻)
 *  nesterov:   y = x + β_k (x - x⁻),  x+ = y - α∇f(y)
 *  β_k is either constant or the (k-1)/(k+2) schedule. */
export function momentum(obj: Objective, x0: Vec, alpha: number, kind: 'gd' | 'heavy' | 'nesterov', beta: number | 'schedule', maxIter = 200): Iterate[] {
  const path: Iterate[] = [point(obj, x0)];
  let prev = x0;
  for (let k = 0; k < maxIter; k++) {
    const it = path[k];
    if (done(path, k)) break;
    const b = beta === 'schedule' ? k / (k + 3) : beta;
    let next: Vec;
    if (kind === 'gd') next = sub(it.x, scale(it.g, alpha));
    else if (kind === 'heavy') next = add(sub(it.x, scale(it.g, alpha)), scale(sub(it.x, prev), b));
    else {
      const y = add(it.x, scale(sub(it.x, prev), b));
      it.y = y;
      next = sub(y, scale(obj.grad(y), alpha));
    }
    it.p = sub(next, it.x);
    it.alpha = 1;
    prev = it.x;
    path.push(point(obj, next));
  }
  return path;
}
