// Planar compact convex sets as densely sampled CCW boundaries, with enough
// face metadata to talk about faces, exposed faces, polars and conjugate faces.
import { dot, norm, sub, type Vec } from './core';

/** corner: extreme point with a non-trivial normal cone (exposed).
 *  arc: smooth extreme point on a strictly convex arc (exposed, unique normal).
 *  junction: extreme point where an arc meets a flat edge tangentially — a face, but not exposed. */
export type VKind = 'corner' | 'arc' | 'junction';

export interface Shape {
  /** boundary vertices, counter-clockwise */
  v: Vec[];
  kind: VKind[];
  /** flat[i]: the edge v[i] → v[i+1] is a genuine 1-dimensional face (false = chord of a sampled arc) */
  flat: boolean[];
}

/** Outward unit normal of edge i and its offset h_i = ⟨n_i, v_i⟩ (the edge lies on ⟨n_i, x⟩ = h_i). */
export function edgeNormals(s: Shape) {
  const n = s.v.length;
  return s.v.map((a, i) => {
    const b = s.v[(i + 1) % n];
    const d = sub(b, a);
    const L = norm(d) || 1;
    const nn: Vec = [d[1] / L, -d[0] / L];
    return { n: nn, h: dot(nn, a) };
  });
}

export interface Polar {
  /** false when 0 ∉ int C: the polar is unbounded and the face correspondence breaks */
  ok: boolean;
  /** polar vertex a_i = n_i / h_i, dual to edge i of C. Polar edge a_{i-1} → a_i is dual to vertex i of C. */
  a: Vec[];
}

export function polar(s: Shape): Polar {
  const en = edgeNormals(s);
  const ok = en.every((e) => e.h > 1e-3);
  return { ok, a: ok ? en.map((e) => [e.n[0] / e.h, e.n[1] / e.h] as Vec) : [] };
}

export function inside(poly: Vec[], p: Vec) {
  // CCW convex polygon: p inside iff left of every edge
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    if ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) < 0) return false;
  }
  return poly.length >= 3;
}

/** Andrew's monotone chain. Returns indices of hull points, CCW. */
export function hull(pts: Vec[]): number[] {
  const idx = pts.map((_, i) => i).sort((i, j) => pts[i][0] - pts[j][0] || pts[i][1] - pts[j][1]);
  if (idx.length < 3) return idx;
  const cross = (o: number, a: number, b: number) =>
    (pts[a][0] - pts[o][0]) * (pts[b][1] - pts[o][1]) - (pts[a][1] - pts[o][1]) * (pts[b][0] - pts[o][0]);
  const lower: number[] = [];
  for (const i of idx) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], i) <= 1e-12) lower.pop();
    lower.push(i);
  }
  const upper: number[] = [];
  for (const i of [...idx].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], i) <= 1e-12) upper.pop();
    upper.push(i);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

/* ---------------------------------------------------------------- presets */

export function polygonShape(pts: Vec[]): Shape | null {
  const h = hull(pts);
  if (h.length < 3) return null;
  return { v: h.map((i) => pts[i]), kind: h.map(() => 'corner'), flat: h.map(() => true) };
}

const arc = (c: Vec, r: number, t0: number, t1: number, n: number): Vec[] => {
  const out: Vec[] = [];
  for (let k = 1; k < n; k++) {
    const t = t0 + ((t1 - t0) * k) / n;
    out.push([c[0] + r * Math.cos(t), c[1] + r * Math.sin(t)]);
  }
  return out; // interior samples only (endpoints excluded)
};

/** Stadium: flat edges y = ±r for |x| ≤ a, semicircular caps of radius r. */
export function stadium(a = 0.75, r = 0.75, n = 48): Shape {
  const v: Vec[] = [];
  const kind: VKind[] = [];
  const flat: boolean[] = [];
  const push = (p: Vec, k: VKind, f: boolean) => {
    v.push(p);
    kind.push(k);
    flat.push(f);
  };
  push([-a, -r], 'junction', true); // bottom edge →
  push([a, -r], 'junction', false);
  for (const p of arc([a, 0], r, -Math.PI / 2, Math.PI / 2, n)) push(p, 'arc', false);
  push([a, r], 'junction', true); // top edge ←
  push([-a, r], 'junction', false);
  for (const p of arc([-a, 0], r, Math.PI / 2, (3 * Math.PI) / 2, n)) push(p, 'arc', false);
  return { v, kind, flat };
}

export function disk(c: Vec = [0.3, 0.15], r = 1.1, n = 160): Shape {
  const v = arc(c, r, 0, 2 * Math.PI, n);
  v.unshift([c[0] + r, c[1]]);
  return { v, kind: v.map(() => 'arc'), flat: v.map(() => false) };
}

/** Upper half-disk: the diameter is a flat edge and its endpoints are genuine corners. */
export function halfDisk(c: Vec = [0, -0.45], r = 1.4, n = 80): Shape {
  const v: Vec[] = [
    [c[0] - r, c[1]],
    [c[0] + r, c[1]],
    ...arc(c, r, 0, Math.PI, n),
  ];
  const kind: VKind[] = v.map((_, i) => (i < 2 ? 'corner' : 'arc'));
  const flat = v.map((_, i) => i === 0);
  return { v, kind, flat };
}

/* ------------------------------------------------------------------ faces */

export type Face = { type: 'vertex'; i: number } | { type: 'edge'; i: number } | { type: 'whole' };

/** Outward normal cone at vertex i as [from, to] unit directions (CCW). Junctions and arc points
 *  have a single normal; for a junction it is the normal of its flat edge. */
export function normalCone(s: Shape, i: number): [Vec, Vec] {
  const en = edgeNormals(s);
  const m = s.v.length;
  const prev = en[(i - 1 + m) % m].n;
  const next = en[i].n;
  if (s.kind[i] === 'corner') return [prev, next];
  if (s.kind[i] === 'junction') {
    const f = s.flat[i] ? next : prev;
    return [f, f];
  }
  const avg: Vec = [prev[0] + next[0], prev[1] + next[1]];
  const L = norm(avg) || 1;
  const u: Vec = [avg[0] / L, avg[1] / L];
  return [u, u];
}

/** For a junction vertex, the flat edge index whose supporting line is the only one through it. */
export function junctionEdge(s: Shape, i: number) {
  const m = s.v.length;
  return s.flat[i] ? i : (i - 1 + m) % m;
}

/** Exposed face argmax_{x∈C} ⟨c, x⟩. Directions within `snapDeg` of a flat edge normal snap to it
 *  (so the 1-dimensional exposed faces are reachable by dragging). */
export function exposedFace(s: Shape, c: Vec, snapDeg = 2.5): { face: Face; c: Vec; sigma: number } {
  const en = edgeNormals(s);
  const L = norm(c);
  if (L === 0) return { face: { type: 'whole' }, c, sigma: 0 };
  const cosSnap = Math.cos((snapDeg * Math.PI) / 180);
  for (let i = 0; i < s.v.length; i++) {
    if (!s.flat[i]) continue;
    if (dot(en[i].n, c) / L >= cosSnap) {
      const cs: Vec = [en[i].n[0] * L, en[i].n[1] * L];
      return { face: { type: 'edge', i }, c: cs, sigma: dot(cs, s.v[i]) };
    }
  }
  let best = 0;
  let bv = -Infinity;
  s.v.forEach((p, i) => {
    const d = dot(c, p);
    if (d > bv) {
      bv = d;
      best = i;
    }
  });
  return { face: { type: 'vertex', i: best }, c, sigma: bv };
}

export function isExposed(s: Shape, f: Face) {
  return f.type !== 'vertex' || s.kind[f.i] !== 'junction';
}

/** Points of C that make up a face (vertex: 1 point; edge: its 2 endpoints; whole: the boundary). */
export function facePoints(s: Shape, f: Face): Vec[] {
  if (f.type === 'vertex') return [s.v[f.i]];
  if (f.type === 'edge') return [s.v[f.i], s.v[(f.i + 1) % s.v.length]];
  return s.v;
}

/** Conjugate face in C°, as a list of points (1 = vertex/point, 2 = segment, 0 = empty).
 *  F^△ = { y ∈ C° : ⟨x, y⟩ = 1 for all x ∈ F }. */
export function conjugate(s: Shape, P: Polar, f: Face): Vec[] {
  if (!P.ok) return [];
  const m = s.v.length;
  if (f.type === 'whole') return [];
  if (f.type === 'edge') return [P.a[f.i]];
  const i = f.i;
  if (s.kind[i] === 'corner') return [P.a[(i - 1 + m) % m], P.a[i]];
  if (s.kind[i] === 'junction') return [P.a[junctionEdge(s, i)]];
  // smooth arc point: the polar "edge" is a sampling artifact of length ~0 — return its midpoint
  const p = P.a[(i - 1 + m) % m];
  const q = P.a[i];
  return [[(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]];
}

/** F^△△ — equal to F exactly when F is exposed. */
export function biconjugate(s: Shape, f: Face): Face | null {
  if (f.type === 'whole') return null; // C^△ = ∅ and ∅^△ = C°° = C; reported separately
  if (f.type === 'vertex' && s.kind[f.i] === 'junction') return { type: 'edge', i: junctionEdge(s, f.i) };
  return f;
}

export function faceDim(f: Face) {
  return f.type === 'vertex' ? 0 : f.type === 'edge' ? 1 : 2;
}

export function segDist(p: Vec, a: Vec, b: Vec) {
  const d = sub(b, a);
  const t = Math.max(0, Math.min(1, dot(sub(p, a), d) / (dot(d, d) || 1)));
  return norm(sub(p, [a[0] + t * d[0], a[1] + t * d[1]]));
}
