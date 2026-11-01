// Test objectives on R^2, each with an analytic gradient and Hessian.
import type { Vec, View } from './core';

/** Symmetric 2x2 matrix stored as [a, b, c] = [[a, b], [b, c]]. */
export type Sym = [number, number, number];

export interface Objective {
  id: string;
  name: string;
  tex: string;
  f: (x: Vec) => number;
  grad: (x: Vec) => Vec;
  hess: (x: Vec) => Sym;
  view: View;
  start: Vec;
  xstar: Vec;
  fstar: number;
  convex: boolean;
}

/** f(x) = 1/2 (x-c)^T A (x-c) with A = R(θ) diag(1, κ) R(θ)^T. */
export function quadratic(kappa = 10, thetaDeg = 30, c: Vec = [0, 0]): Objective {
  const t = (thetaDeg * Math.PI) / 180;
  const cs = Math.cos(t);
  const sn = Math.sin(t);
  // columns of R are eigenvectors: u=(cs,sn) with eigval 1, v=(-sn,cs) with eigval κ
  const A: Sym = [cs * cs + kappa * sn * sn, cs * sn - kappa * sn * cs, sn * sn + kappa * cs * cs];
  return {
    id: 'quadratic',
    name: `Quadratic (κ = ${kappa})`,
    tex: String.raw`\tfrac12 (x-c)^\top A (x-c)`,
    f: ([x, y]) => {
      const dx = x - c[0];
      const dy = y - c[1];
      return 0.5 * (A[0] * dx * dx + 2 * A[1] * dx * dy + A[2] * dy * dy);
    },
    grad: ([x, y]) => {
      const dx = x - c[0];
      const dy = y - c[1];
      return [A[0] * dx + A[1] * dy, A[1] * dx + A[2] * dy];
    },
    hess: () => A,
    view: { x: [-4, 4], y: [-3, 3] },
    start: [-3.2, 1.6],
    xstar: c,
    fstar: 0,
    convex: true,
  };
}

export const rosenbrock: Objective = {
  id: 'rosenbrock',
  name: 'Rosenbrock',
  tex: String.raw`(1-x)^2 + 100\,(y-x^2)^2`,
  f: ([x, y]) => (1 - x) ** 2 + 100 * (y - x * x) ** 2,
  grad: ([x, y]) => [-2 * (1 - x) - 400 * x * (y - x * x), 200 * (y - x * x)],
  hess: ([x, y]) => [2 - 400 * (y - x * x) + 800 * x * x, -400 * x, 200],
  view: { x: [-2, 2], y: [-1, 3] },
  start: [-1.2, 1],
  xstar: [1, 1],
  fstar: 0,
  convex: false,
};

// Boyd & Vandenberghe's running example (eq. 9.20): smooth, convex, not quadratic.
const E = (x: number, y: number) => [Math.exp(x + 3 * y - 0.1), Math.exp(x - 3 * y - 0.1), Math.exp(-x - 0.1)];
export const logSumExp: Objective = {
  id: 'lse',
  name: 'Exponential bowl (B&V 9.20)',
  tex: String.raw`e^{x+3y-0.1} + e^{x-3y-0.1} + e^{-x-0.1}`,
  f: ([x, y]) => E(x, y).reduce((a, b) => a + b, 0),
  grad: ([x, y]) => {
    const [a, b, c] = E(x, y);
    return [a + b - c, 3 * a - 3 * b];
  },
  hess: ([x, y]) => {
    const [a, b, c] = E(x, y);
    return [a + b + c, 3 * a - 3 * b, 9 * a + 9 * b];
  },
  view: { x: [-2.2, 1.2], y: [-1.1, 1.1] },
  start: [-1.8, 0.8],
  xstar: [-Math.log(2) / 2, 0],
  fstar: 2 * Math.sqrt(2) * Math.exp(-0.1),
  convex: true,
};

export const himmelblau: Objective = {
  id: 'himmelblau',
  name: 'Himmelblau (non-convex)',
  tex: String.raw`(x^2+y-11)^2 + (x+y^2-7)^2`,
  f: ([x, y]) => (x * x + y - 11) ** 2 + (x + y * y - 7) ** 2,
  grad: ([x, y]) => {
    const a = x * x + y - 11;
    const b = x + y * y - 7;
    return [4 * x * a + 2 * b, 2 * a + 4 * y * b];
  },
  hess: ([x, y]) => [12 * x * x + 4 * y - 42, 4 * x + 4 * y, 4 * x + 12 * y * y - 26],
  view: { x: [-5, 5], y: [-5, 5] },
  start: [-0.5, -0.5],
  xstar: [3, 2],
  fstar: 0,
  convex: false,
};

/** Builds an objective from a <select> value. Quadratic takes κ and θ. */
export function objective(id: string, kappa = 10, theta = 30): Objective {
  switch (id) {
    case 'rosenbrock':
      return rosenbrock;
    case 'lse':
      return logSumExp;
    case 'himmelblau':
      return himmelblau;
    default:
      return quadratic(kappa, theta);
  }
}

/* 2x2 linear algebra on Sym */
export const symMul = (A: Sym, v: Vec): Vec => [A[0] * v[0] + A[1] * v[1], A[1] * v[0] + A[2] * v[1]];
export const symDet = (A: Sym) => A[0] * A[2] - A[1] * A[1];
export function symInv(A: Sym): Sym {
  const d = symDet(A);
  return [A[2] / d, -A[1] / d, A[0] / d];
}
/** Eigen-decomposition: returns [λ1, λ2, angle of eigvec for λ1]. λ1 ≥ λ2. */
export function symEig(A: Sym): [number, number, number] {
  const tr = A[0] + A[2];
  const disc = Math.sqrt(((A[0] - A[2]) / 2) ** 2 + A[1] * A[1]);
  const l1 = tr / 2 + disc;
  const l2 = tr / 2 - disc;
  const ang = 0.5 * Math.atan2(2 * A[1], A[0] - A[2]);
  return [l1, l2, ang];
}

/** Points on the ellipse {x : (x-c)^T M (x-c) = r^2} for positive definite M. */
export function ellipse(M: Sym, c: Vec, r = 1, n = 96): Vec[] {
  const [l1, l2, ang] = symEig(M);
  if (l1 <= 0 || l2 <= 0) return [];
  const a = r / Math.sqrt(l1);
  const b = r / Math.sqrt(l2);
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const pts: Vec[] = [];
  for (let i = 0; i <= n; i++) {
    const t = (2 * Math.PI * i) / n;
    const u = a * Math.cos(t);
    const v = b * Math.sin(t);
    pts.push([c[0] + u * ca - v * sa, c[1] + u * sa + v * ca]);
  }
  return pts;
}
