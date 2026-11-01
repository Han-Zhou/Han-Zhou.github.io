// Convergence chart drawn in pixel space: log10 of a positive quantity vs iteration.
import { fmt, type Plot } from './core';

export interface Series {
  values: number[];
  color: string;
  label?: string;
}

/** Draws log10(values) vs k for each series. `k` marks the current iteration. */
export function convergence(plot: Plot, series: Series[], opts: { k?: number; ylabel?: string; floor?: number } = {}) {
  const ctx = plot.ctx;
  const t = plot.theme;
  const W = plot.w;
  const H = plot.h;
  const m = { l: 44, r: 12, t: 12, b: 26 };
  const floor = opts.floor ?? 1e-12;
  const logs = series.map((s) => s.values.map((v) => Math.log10(Math.max(Math.abs(v), floor))));
  const all = logs.flat().filter(Number.isFinite);
  if (!all.length) return;
  let lo = Math.floor(Math.min(...all));
  let hi = Math.ceil(Math.max(...all));
  if (hi - lo < 2) hi = lo + 2;
  const K = Math.max(1, ...series.map((s) => s.values.length - 1));
  const X = (k: number) => m.l + (k / K) * (W - m.l - m.r);
  const Y = (v: number) => m.t + ((hi - v) / (hi - lo)) * (H - m.t - m.b);

  // grid + labels
  ctx.font = '11px Helvetica, Arial, sans-serif';
  ctx.lineWidth = 1;
  const stepY = Math.max(1, Math.ceil((hi - lo) / 5));
  for (let v = lo; v <= hi; v += stepY) {
    ctx.strokeStyle = t.faint;
    ctx.beginPath();
    ctx.moveTo(m.l, Y(v));
    ctx.lineTo(W - m.r, Y(v));
    ctx.stroke();
    ctx.fillStyle = t.muted;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`1e${v}`, m.l - 6, Y(v));
  }
  const stepX = Math.max(1, Math.round(K / 6 / 5) * 5 || 1);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let k = 0; k <= K; k += stepX) ctx.fillText(fmt(k), X(k), H - m.b + 6);
  if (opts.ylabel) {
    ctx.textAlign = 'left';
    ctx.fillText(opts.ylabel, m.l + 6, m.t);
  }

  // current-iteration marker
  if (opts.k !== undefined) {
    ctx.strokeStyle = t.border;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(X(opts.k), m.t);
    ctx.lineTo(X(opts.k), H - m.b);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  logs.forEach((ys, i) => {
    ctx.strokeStyle = series[i].color;
    ctx.lineWidth = 1.75;
    ctx.beginPath();
    let pen = false;
    ys.forEach((y, k) => {
      // diverged values: clamp to the top edge once, then stop drawing
      if (!Number.isFinite(y)) {
        if (pen) ctx.lineTo(X(k), Y(hi));
        pen = false;
        return;
      }
      const yy = Math.min(y, hi);
      if (pen) ctx.lineTo(X(k), Y(yy));
      else ctx.moveTo(X(k), Y(yy));
      pen = true;
    });
    ctx.stroke();
    if (opts.k !== undefined && opts.k < ys.length && Number.isFinite(ys[opts.k])) {
      ctx.fillStyle = series[i].color;
      ctx.beginPath();
      ctx.arc(X(opts.k), Y(ys[opts.k]), 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}
