// Lagrangian duality on a bounded box B ⊂ R²:
//   p* = min { f(x) : g(x) ≤ 0 (or = 0), x ∈ B },  d(λ) = min_{x ∈ B} f(x) + λ g(x).
// Everything is computed numerically from a dense grid plus local refinement,
// so any smooth f, g can be dropped in as a preset.
import { add, clamp, contours, dot, norm, scale, sub, type Vec, type View } from './core';

export interface Problem {
  id: string;
  name: string;
  texF: string;
  texG: string;
  /** plain-text versions for the live readout */
  textF: string;
  textG: string;
  f: (x: Vec) => number;
  gf: (x: Vec) => Vec;
  g: (x: Vec) => number;
  gg: (x: Vec) => Vec;
  box: View;
  lamMax: number;
}

const half = (x: Vec, c: Vec, a = 1, b = 1) => 0.5 * (a * (x[0] - c[0]) ** 2 + b * (x[1] - c[1]) ** 2);

export const problems: Problem[] = [
  {
    id: 'linear',
    textF: '½(x − 2)² + 3/2·(y − 1.5)²',
    textG: 'x + y − 1',
    name: 'Convex: quadratic + half-plane',
    texF: String.raw`\tfrac12(x-2)^2 + \tfrac32(y-1.5)^2`,
    texG: String.raw`x + y - 1`,
    f: (x) => half(x, [2, 1.5], 1, 3),
    gf: ([x, y]) => [x - 2, 3 * (y - 1.5)],
    g: ([x, y]) => x + y - 1,
    gg: () => [1, 1],
    box: { x: [-4, 4], y: [-4, 4] },
    lamMax: 5,
  },
  {
    id: 'disk',
    textF: '½((x − 2)² + (y − 1)²)',
    textG: 'x² + y² − 1',
    name: 'Convex: quadratic + disk',
    texF: String.raw`\tfrac12\big((x-2)^2 + (y-1)^2\big)`,
    texG: String.raw`x^2 + y^2 - 1`,
    f: (x) => half(x, [2, 1]),
    gf: ([x, y]) => [x - 2, y - 1],
    g: ([x, y]) => x * x + y * y - 1,
    gg: ([x, y]) => [2 * x, 2 * y],
    box: { x: [-3, 3], y: [-3, 3] },
    lamMax: 2,
  },
  {
    id: 'gap',
    textF: '(x² − 1)² − 0.4x + y²',
    textG: 'x',
    name: 'Non-convex: double well (duality gap)',
    texF: String.raw`(x^2-1)^2 - 0.4x + y^2`,
    texG: String.raw`x`,
    f: ([x, y]) => (x * x - 1) ** 2 - 0.4 * x + y * y,
    gf: ([x, y]) => [4 * x * (x * x - 1) - 0.4, 2 * y],
    g: ([x]) => x,
    gg: () => [1, 0],
    box: { x: [-2, 2], y: [-2, 2] },
    lamMax: 1.5,
  },
  {
    id: 'inactive',
    textF: '½((x − 0.3)² + (y − 0.2)²)',
    textG: 'x² + y² − 1',
    name: 'Convex: inactive constraint (λ* = 0)',
    texF: String.raw`\tfrac12\big((x-0.3)^2 + (y-0.2)^2\big)`,
    texG: String.raw`x^2 + y^2 - 1`,
    f: (x) => half(x, [0.3, 0.2]),
    gf: ([x, y]) => [x - 0.3, y - 0.2],
    g: ([x, y]) => x * x + y * y - 1,
    gg: ([x, y]) => [2 * x, 2 * y],
    box: { x: [-3, 3], y: [-3, 3] },
    lamMax: 2,
  },
];

export interface Grid {
  n: number;
  xs: Vec[];
  fs: Float64Array;
  gs: Float64Array;
}

export function sampleGrid(P: Problem, n = 161): Grid {
  const xs: Vec[] = [];
  const [x0, x1] = P.box.x;
  const [y0, y1] = P.box.y;
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) xs.push([x0 + ((x1 - x0) * i) / (n - 1), y0 + ((y1 - y0) * j) / (n - 1)]);
  return { n, xs, fs: Float64Array.from(xs, P.f), gs: Float64Array.from(xs, P.g) };
}

const project = (P: Problem, x: Vec): Vec => [clamp(x[0], P.box.x[0], P.box.x[1]), clamp(x[1], P.box.y[0], P.box.y[1])];

/** Minimizer of L(·, λ) over the box: best grid point, then projected gradient with backtracking. */
export function argminL(P: Problem, G: Grid, lam: number): { x: Vec; val: number } {
  let bi = 0;
  let bv = Infinity;
  for (let i = 0; i < G.xs.length; i++) {
    const v = G.fs[i] + lam * G.gs[i];
    if (v < bv) {
      bv = v;
      bi = i;
    }
  }
  const L = (x: Vec) => P.f(x) + lam * P.g(x);
  let x = G.xs[bi];
  let v = bv;
  let s = 0.1;
  for (let k = 0; k < 60; k++) {
    const gr = add(P.gf(x), scale(P.gg(x), lam));
    if (norm(gr) < 1e-10) break;
    let moved = false;
    for (let t = 0; t < 30; t++) {
      const y = project(P, sub(x, scale(gr, s)));
      const vy = L(y);
      if (vy < v - 1e-14) {
        x = y;
        v = vy;
        s *= 2;
        moved = true;
        break;
      }
      s *= 0.5;
    }
    if (!moved) break;
  }
  return { x, val: v };
}

export const dual = (P: Problem, G: Grid, lam: number) => argminL(P, G, lam).val;

/** Primal optimum: best of (interior feasible grid point, refined) and (point on g = 0, refined along the curve). */
export function primal(P: Problem, G: Grid, eq: boolean): { x: Vec; val: number } {
  let best: { x: Vec; val: number } = { x: [NaN, NaN], val: Infinity };

  // boundary g = 0
  const cs = contours(P.g, P.box, { n: 240, levels: [0] });
  const seg = cs.segs[0];
  for (let k = 0; k < seg.length; k += 2) {
    const x: Vec = [seg[k], seg[k + 1]];
    const v = P.f(x);
    if (v < best.val) best = { x, val: v };
  }
  if (Number.isFinite(best.val)) best = refineOnCurve(P, best.x);

  if (!eq) {
    let bi = -1;
    for (let i = 0; i < G.xs.length; i++) if (G.gs[i] <= 0 && (bi < 0 || G.fs[i] < G.fs[bi])) bi = i;
    if (bi >= 0) {
      let x = G.xs[bi];
      let v = G.fs[bi];
      let s = 0.1;
      for (let k = 0; k < 80; k++) {
        const gr = P.gf(x);
        let moved = false;
        for (let t = 0; t < 30; t++) {
          const y = project(P, sub(x, scale(gr, s)));
          if (P.g(y) <= 0 && P.f(y) < v - 1e-14) {
            x = y;
            v = P.f(y);
            s *= 2;
            moved = true;
            break;
          }
          s *= 0.5;
        }
        if (!moved) break;
      }
      if (v < best.val) best = { x, val: v };
    }
  }
  return best;
}

function toCurve(P: Problem, x: Vec): Vec {
  for (let i = 0; i < 8; i++) {
    const gg = P.gg(x);
    const n2 = dot(gg, gg);
    if (n2 === 0) break;
    x = sub(x, scale(gg, P.g(x) / n2));
  }
  return x;
}

function refineOnCurve(P: Problem, x: Vec) {
  x = toCurve(P, x);
  let v = P.f(x);
  let s = 0.05;
  for (let k = 0; k < 200; k++) {
    const gg = P.gg(x);
    const t: Vec = [-gg[1], gg[0]];
    const tn = norm(t);
    if (tn === 0) break;
    const u = scale(t, 1 / tn);
    const slope = dot(P.gf(x), u);
    if (Math.abs(slope) < 1e-12) break;
    let moved = false;
    for (let tries = 0; tries < 30; tries++) {
      const y = toCurve(P, sub(x, scale(u, s * slope)));
      const vy = P.f(y);
      const inBox = y[0] >= P.box.x[0] && y[0] <= P.box.x[1] && y[1] >= P.box.y[0] && y[1] <= P.box.y[1];
      if (inBox && vy < v - 1e-15) {
        x = y;
        v = vy;
        s *= 2;
        moved = true;
        break;
      }
      s *= 0.5;
    }
    if (!moved) break;
  }
  return { x, val: v };
}

/** Dual function sampled on [lo, hi] plus its maximizer (golden-section refined; d is concave). */
export function dualCurve(P: Problem, G: Grid, lo: number, hi: number, m = 241) {
  const lams: number[] = [];
  const ds: number[] = [];
  for (let i = 0; i < m; i++) {
    const l = lo + ((hi - lo) * i) / (m - 1);
    lams.push(l);
    ds.push(dual(P, G, l));
  }
  let bi = 0;
  for (let i = 1; i < m; i++) if (ds[i] > ds[bi]) bi = i;
  let a = lams[Math.max(0, bi - 1)];
  let b = lams[Math.min(m - 1, bi + 1)];
  const gr = (Math.sqrt(5) - 1) / 2;
  for (let i = 0; i < 50; i++) {
    const c = b - gr * (b - a);
    const e = a + gr * (b - a);
    if (dual(P, G, c) > dual(P, G, e)) b = e;
    else a = c;
  }
  const golden = (a + b) / 2;
  const dg = dual(P, G, golden);
  return dg >= ds[bi] ? { lams, ds, lamStar: golden, dStar: dg } : { lams, ds, lamStar: lams[bi], dStar: ds[bi] };
}
