// Tiny canvas toolkit shared by every visualization. No dependencies.
// World coordinates are math-style (y up); the view is fitted with equal aspect.

export type Vec = [number, number];

export const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1]];
export const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1]];
export const scale = (a: Vec, s: number): Vec => [a[0] * s, a[1] * s];
export const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1];
export const norm = (a: Vec) => Math.hypot(a[0], a[1]);
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/* ------------------------------------------------------------------ theme */

export interface Theme {
  bg: string;
  text: string;
  strong: string;
  muted: string;
  faint: string;
  border: string;
  series: string[]; // categorical colors: --viz-1 … --viz-5
  fill: string[]; // translucent versions of series
}

const TOKENS = ['--bg', '--text', '--strong', '--muted', '--faint', '--border'];
const SERIES = ['--viz-1', '--viz-2', '--viz-3', '--viz-4', '--viz-5'];

/** Custom properties that use light-dark() are not resolved by getPropertyValue,
 *  so resolve them through a probe element's computed `color`. */
export function readTheme(): Theme {
  const probe = document.createElement('span');
  probe.style.display = 'none';
  document.body.appendChild(probe);
  const resolve = (v: string) => {
    probe.style.color = `var(${v})`;
    return getComputedStyle(probe).color;
  };
  const [bg, text, strong, muted, faint, border] = TOKENS.map(resolve);
  const series = SERIES.map(resolve);
  probe.remove();
  const fill = series.map((c) => withAlpha(c, 0.18));
  return { bg, text, strong, muted, faint, border, series, fill };
}

export function withAlpha(rgb: string, a: number) {
  const m = rgb.match(/[\d.]+/g);
  if (!m) return rgb;
  return `rgba(${m[0]}, ${m[1]}, ${m[2]}, ${a})`;
}

/** Calls cb whenever light/dark mode changes (system or the eye toggle). */
export function onThemeChange(cb: () => void) {
  new MutationObserver(cb).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', cb);
}

/* ------------------------------------------------------------------- plot */

export interface View {
  x: [number, number];
  y: [number, number];
}

export interface Stroke {
  color?: string;
  width?: number;
  dash?: number[];
  alpha?: number;
}

interface Handle {
  get: () => Vec;
  set: (p: Vec) => void;
  radius: number;
}

export class Plot {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  theme: Theme;
  w = 0;
  h = 0;
  private view: View;
  private equal: boolean;
  private sx = 1;
  private sy = 1;
  private ox = 0;
  private oy = 0;
  private handles: Handle[] = [];
  private active: Handle | null = null;
  private clickCb: ((p: Vec) => void) | null = null;
  private hoverCb: ((p: Vec | null) => void) | null = null;
  private drawFn: () => void = () => {};
  private paintCbs: (() => void)[] = [];
  private queued = false;

  constructor(canvas: HTMLCanvasElement, view: View, opts: { equal?: boolean } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.view = view;
    this.equal = opts.equal ?? true;
    this.theme = readTheme();
    new ResizeObserver(() => this.redraw()).observe(canvas);
    onThemeChange(() => {
      this.theme = readTheme();
      this.redraw();
    });
    this.bindPointer();
  }

  /** Sets the function that paints a full frame. */
  draw(fn: () => void) {
    this.drawFn = fn;
    this.redraw();
  }

  setView(view: View) {
    this.view = view;
    this.redraw();
  }

  getView(): View {
    return { x: [this.toWorld(0, 0)[0], this.toWorld(this.w, 0)[0]], y: [this.toWorld(0, this.h)[1], this.toWorld(0, 0)[1]] };
  }

  redraw() {
    if (this.queued) return;
    this.queued = true;
    requestAnimationFrame(() => {
      this.queued = false;
      this.paint();
    });
  }

  private paint() {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (!w || !h) return;
    if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr)) {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
    }
    this.w = w;
    this.h = h;
    const { x, y } = this.view;
    let sx = w / (x[1] - x[0]);
    let sy = h / (y[1] - y[0]);
    if (this.equal) sx = sy = Math.min(sx, sy);
    this.sx = sx;
    this.sy = sy;
    this.ox = w / 2 - ((x[0] + x[1]) / 2) * sx;
    this.oy = h / 2 + ((y[0] + y[1]) / 2) * sy;
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    this.drawFn();
    this.paintCbs.forEach((cb) => cb());
  }

  /** Runs after every repaint (used by the 3D view to stay in sync). */
  onPaint(cb: () => void) {
    this.paintCbs.push(cb);
  }

  /* coordinate transforms */
  X = (x: number) => this.ox + x * this.sx;
  Y = (y: number) => this.oy - y * this.sy;
  S = (p: Vec): Vec => [this.X(p[0]), this.Y(p[1])];
  toWorld = (px: number, py: number): Vec => [(px - this.ox) / this.sx, (this.oy - py) / this.sy];
  /** world length of one CSS pixel (x direction) */
  get px() {
    return 1 / this.sx;
  }

  /* primitives */
  private stroke(s: Stroke) {
    const ctx = this.ctx;
    ctx.strokeStyle = s.color ?? this.theme.text;
    ctx.lineWidth = s.width ?? 1.5;
    ctx.setLineDash(s.dash ?? []);
    ctx.globalAlpha = s.alpha ?? 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
  }

  line(a: Vec, b: Vec, s: Stroke = {}) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(this.X(a[0]), this.Y(a[1]));
    ctx.lineTo(this.X(b[0]), this.Y(b[1]));
    this.stroke(s);
  }

  /** Infinite line through p with direction d, clipped to the canvas. */
  infiniteLine(p: Vec, d: Vec, s: Stroke = {}) {
    const n = norm(d);
    if (n === 0) return;
    const L = (this.w + this.h) / this.sx;
    const u = scale(d, L / n);
    this.line(sub(p, u), add(p, u), s);
  }

  polyline(pts: Vec[], s: Stroke = {}, closed = false) {
    if (pts.length < 2) return;
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(this.X(pts[0][0]), this.Y(pts[0][1]));
    for (let i = 1; i < pts.length; i++) ctx.lineTo(this.X(pts[i][0]), this.Y(pts[i][1]));
    if (closed) ctx.closePath();
    this.stroke(s);
  }

  polygon(pts: Vec[], fill: string, s?: Stroke) {
    if (pts.length < 2) return;
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(this.X(pts[0][0]), this.Y(pts[0][1]));
    for (let i = 1; i < pts.length; i++) ctx.lineTo(this.X(pts[i][0]), this.Y(pts[i][1]));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (s) this.stroke(s);
  }

  /** Arrow from a to b; head size in CSS px. */
  arrow(a: Vec, b: Vec, s: Stroke = {}, head = 8) {
    const [ax, ay] = this.S(a);
    const [bx, by] = this.S(b);
    const len = Math.hypot(bx - ax, by - ay);
    if (len < 1) return;
    const ux = (bx - ax) / len;
    const uy = (by - ay) / len;
    const h = Math.min(head, len * 0.6);
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx - ux * h * 0.6, by - uy * h * 0.6);
    this.stroke(s);
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx - ux * h - uy * h * 0.5, by - uy * h + ux * h * 0.5);
    ctx.lineTo(bx - ux * h + uy * h * 0.5, by - uy * h - ux * h * 0.5);
    ctx.closePath();
    ctx.fillStyle = s.color ?? this.theme.text;
    ctx.globalAlpha = s.alpha ?? 1;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  /** Dot with radius in CSS px. Pass ring=true for a hollow handle look. */
  dot(p: Vec, r = 4, color?: string, ring = false) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(this.X(p[0]), this.Y(p[1]), r, 0, Math.PI * 2);
    if (ring) {
      ctx.fillStyle = this.theme.bg;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = color ?? this.theme.strong;
      ctx.stroke();
    } else {
      ctx.fillStyle = color ?? this.theme.strong;
      ctx.fill();
    }
  }

  /** Text at world point p, offset in CSS px. */
  text(p: Vec, str: string, opts: { color?: string; dx?: number; dy?: number; align?: CanvasTextAlign; size?: number; base?: CanvasTextBaseline } = {}) {
    const ctx = this.ctx;
    ctx.font = `${opts.size ?? 13}px Helvetica, Arial, sans-serif`;
    ctx.fillStyle = opts.color ?? this.theme.muted;
    ctx.textAlign = opts.align ?? 'left';
    ctx.textBaseline = opts.base ?? 'middle';
    ctx.fillText(str, this.X(p[0]) + (opts.dx ?? 0), this.Y(p[1]) + (opts.dy ?? 0));
  }

  /** Text at canvas pixel position (for legends / corner labels). */
  label(px: number, py: number, str: string, color?: string, align: CanvasTextAlign = 'left', size = 13) {
    const ctx = this.ctx;
    ctx.font = `${size}px Helvetica, Arial, sans-serif`;
    ctx.fillStyle = color ?? this.theme.muted;
    ctx.textAlign = align;
    ctx.textBaseline = 'top';
    ctx.fillText(str, px, py);
  }

  /** x and y axes through the origin (if visible), with light ticks. */
  axes(opts: { ticks?: boolean } = {}) {
    const v = this.getView();
    const c = this.theme.border;
    if (v.y[0] < 0 && v.y[1] > 0) this.line([v.x[0], 0], [v.x[1], 0], { color: c, width: 1 });
    if (v.x[0] < 0 && v.x[1] > 0) this.line([0, v.y[0]], [0, v.y[1]], { color: c, width: 1 });
    if (opts.ticks === false) return;
    const step = niceStep((v.x[1] - v.x[0]) / 8);
    for (let t = Math.ceil(v.x[0] / step) * step; t <= v.x[1]; t += step) {
      if (Math.abs(t) < step / 2) continue;
      this.text([t, 0], fmt(t), { dy: 10, align: 'center', size: 11, base: 'top' });
    }
    for (let t = Math.ceil(v.y[0] / step) * step; t <= v.y[1]; t += step) {
      if (Math.abs(t) < step / 2) continue;
      this.text([0, t], fmt(t), { dx: -6, align: 'right', size: 11 });
    }
  }

  /* ---------------------------------------------------------- interaction */

  /** Registers a draggable point. Returns the plot for chaining. */
  handle(get: () => Vec, set: (p: Vec) => void, radius = 14) {
    this.handles.push({ get, set, radius });
    return this;
  }

  onClick(cb: (p: Vec) => void) {
    this.clickCb = cb;
  }

  onHover(cb: (p: Vec | null) => void) {
    this.hoverCb = cb;
  }

  private bindPointer() {
    const c = this.canvas;
    const pos = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top] as Vec;
    };
    const hit = (px: Vec) => {
      let best: Handle | null = null;
      let bd = Infinity;
      for (const h of this.handles) {
        const [hx, hy] = this.S(h.get());
        const d = Math.hypot(hx - px[0], hy - px[1]);
        if (d < h.radius && d < bd) {
          bd = d;
          best = h;
        }
      }
      return best;
    };
    c.addEventListener('pointerdown', (e) => {
      const p = pos(e);
      this.active = hit(p);
      if (this.active) {
        c.setPointerCapture(e.pointerId);
        e.preventDefault();
      } else if (this.clickCb) {
        this.clickCb(this.toWorld(p[0], p[1]));
      }
    });
    c.addEventListener('pointermove', (e) => {
      const p = pos(e);
      if (this.active) {
        this.active.set(this.toWorld(p[0], p[1]));
        this.redraw();
      } else {
        c.style.cursor = hit(p) ? 'grab' : this.clickCb ? 'crosshair' : 'default';
        this.hoverCb?.(this.toWorld(p[0], p[1]));
      }
    });
    const end = () => (this.active = null);
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('pointerleave', () => this.hoverCb?.(null));
  }
}

/* --------------------------------------------------------------- contours */

export interface ContourSet {
  levels: number[];
  segs: Float32Array[]; // per level: x1,y1,x2,y2,...
}

/** Marching squares over the given view. Levels are chosen from quantiles
 *  of the sampled values so badly scaled functions (Rosenbrock) still look good. */
export function contours(f: (p: Vec) => number, view: View, opts: { n?: number; count?: number; levels?: number[] } = {}): ContourSet {
  const n = opts.n ?? 180;
  const [x0, x1] = view.x;
  const [y0, y1] = view.y;
  const dx = (x1 - x0) / n;
  const dy = (y1 - y0) / n;
  const g = new Float64Array((n + 1) * (n + 1));
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) g[j * (n + 1) + i] = f([x0 + i * dx, y0 + j * dy]);

  let levels = opts.levels;
  if (!levels) {
    const finite = Array.from(g).filter(Number.isFinite).sort((a, b) => a - b);
    const count = opts.count ?? 16;
    levels = [];
    for (let k = 1; k <= count; k++) {
      // quadratic spacing in quantile => denser near the minimum
      const q = Math.pow(k / (count + 1), 2);
      levels.push(finite[Math.floor(q * (finite.length - 1))]);
    }
    levels = [...new Set(levels)];
  }

  const segs = levels.map((lv) => {
    const out: number[] = [];
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const a = g[j * (n + 1) + i] - lv; // bottom-left
        const b = g[j * (n + 1) + i + 1] - lv; // bottom-right
        const c = g[(j + 1) * (n + 1) + i + 1] - lv; // top-right
        const d = g[(j + 1) * (n + 1) + i] - lv; // top-left
        const code = (a > 0 ? 1 : 0) | (b > 0 ? 2 : 0) | (c > 0 ? 4 : 0) | (d > 0 ? 8 : 0);
        if (code === 0 || code === 15) continue;
        const X = x0 + i * dx;
        const Y = y0 + j * dy;
        const e = [
          [X + (dx * a) / (a - b), Y], // bottom
          [X + dx, Y + (dy * b) / (b - c)], // right
          [X + (dx * d) / (d - c), Y + dy], // top
          [X, Y + (dy * a) / (a - d)], // left
        ];
        const pairs = MS[code];
        for (let k = 0; k < pairs.length; k += 2) out.push(e[pairs[k]][0], e[pairs[k]][1], e[pairs[k + 1]][0], e[pairs[k + 1]][1]);
      }
    }
    return new Float32Array(out);
  });
  return { levels, segs };
}

// edge pairs per marching-squares case (0 bottom, 1 right, 2 top, 3 left)
const MS: number[][] = [[], [3, 0], [0, 1], [3, 1], [1, 2], [3, 0, 1, 2], [0, 2], [3, 2], [2, 3], [0, 2], [0, 1, 2, 3], [1, 2], [1, 3], [0, 1], [3, 0], []];

export function drawContours(plot: Plot, cs: ContourSet, color?: string) {
  const ctx = plot.ctx;
  const base = color ?? plot.theme.muted;
  cs.segs.forEach((s, li) => {
    ctx.beginPath();
    for (let k = 0; k < s.length; k += 4) {
      ctx.moveTo(plot.X(s[k]), plot.Y(s[k + 1]));
      ctx.lineTo(plot.X(s[k + 2]), plot.Y(s[k + 3]));
    }
    ctx.strokeStyle = base;
    ctx.globalAlpha = 0.55 - (0.35 * li) / Math.max(1, cs.segs.length - 1);
    ctx.lineWidth = 1;
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
}

/* --------------------------------------------------------------- controls */

export type Params = Record<string, number | string | boolean>;

/** Binds every [data-k] input/select inside root. Range/number inputs yield
 *  numbers, checkboxes booleans, others strings. A sibling <output> mirrors
 *  range values. Calls onChange with the full param object. */
export function controls(root: HTMLElement, onChange: (p: Params, key: string) => void) {
  const els = Array.from(root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-k]'));
  const read = (): Params => {
    const p: Params = {};
    for (const el of els) {
      const k = el.dataset.k!;
      if (el instanceof HTMLInputElement && el.type === 'checkbox') p[k] = el.checked;
      else if (el instanceof HTMLInputElement && (el.type === 'range' || el.type === 'number')) p[k] = parseFloat(el.value);
      else p[k] = el.value;
      const out = el.parentElement?.querySelector('output');
      // outputs marked data-out are written by the page itself
      if (out && !out.dataset.out && el instanceof HTMLInputElement && el.type === 'range') {
        const fmtAttr = el.dataset.fmt;
        const v = parseFloat(el.value);
        out.textContent = fmtAttr === 'exp' ? fmt(Math.pow(10, v)) : fmt(v);
      }
    }
    return p;
  };
  for (const el of els) el.addEventListener('input', () => onChange(read(), el.dataset.k!));
  const initial = read();
  return {
    params: initial,
    read,
    set(k: string, v: string | number) {
      const el = els.find((e) => e.dataset.k === k);
      if (el) el.value = String(v);
      return read();
    },
  };
}

/** Play / step / reset over an integer frame counter. Buttons are found by
 *  [data-act="play|step|reset|back"] inside root. */
export function player(root: HTMLElement, opts: { max: () => number; onFrame: (k: number) => void; fps?: number }) {
  let k = 0;
  let timer: number | null = null;
  const playBtn = root.querySelector<HTMLButtonElement>('[data-act="play"]');
  const set = (v: number) => {
    k = clamp(v, 0, opts.max());
    opts.onFrame(k);
  };
  const stop = () => {
    if (timer !== null) clearInterval(timer);
    timer = null;
    if (playBtn) playBtn.textContent = 'Play';
  };
  const play = () => {
    if (k >= opts.max()) set(0);
    if (playBtn) playBtn.textContent = 'Pause';
    timer = window.setInterval(() => {
      if (k >= opts.max()) return stop();
      set(k + 1);
    }, 1000 / (opts.fps ?? 4));
  };
  playBtn?.addEventListener('click', () => (timer === null ? play() : stop()));
  root.querySelector('[data-act="step"]')?.addEventListener('click', () => {
    stop();
    set(k + 1);
  });
  root.querySelector('[data-act="back"]')?.addEventListener('click', () => {
    stop();
    set(k - 1);
  });
  root.querySelector('[data-act="reset"]')?.addEventListener('click', () => {
    stop();
    set(0);
  });
  root.querySelector('[data-act="end"]')?.addEventListener('click', () => {
    stop();
    set(opts.max());
  });
  return {
    get k() {
      return k;
    },
    set,
    stop,
  };
}

/* ------------------------------------------------------------------ utils */

export function niceStep(raw: number) {
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const m = raw / p;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
}

export function fmt(v: number, digits = 3) {
  if (!Number.isFinite(v)) return String(v);
  if (v === 0) return '0';
  const a = Math.abs(v);
  if (a >= 1e4 || a < 1e-3) return v.toExponential(2).replace('e+', 'e');
  return String(parseFloat(v.toPrecision(digits)));
}

/** Writes text into the element matching [data-out=key] inside root. */
export function out(root: HTMLElement, key: string, html: string) {
  const el = root.querySelector<HTMLElement>(`[data-out="${key}"]`);
  if (el) el.innerHTML = html;
}

/** Simple 1D plot helper: maps a (t, y) rectangle onto a Plot with equal=false. */
export function plot1D(canvas: HTMLCanvasElement, view: View) {
  return new Plot(canvas, view, { equal: false });
}
