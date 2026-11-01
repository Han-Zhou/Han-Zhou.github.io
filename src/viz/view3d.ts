// "3D" toggle for a 2D contour plot. Lightweight: three.js and the surface
// renderer are only downloaded the first time someone presses the button.
import type { Plot, Theme, Vec, View } from './core';
import type { Objective } from './functions';

export interface Scene3D {
  obj: Objective;
  view: View;
  /** iterates already cut to the current frame */
  paths: { pts: Vec[]; color: string; width?: number; dashed?: boolean }[];
  markers?: { p: Vec; color: string; size?: number }[];
  start: Vec;
  setStart?: (p: Vec) => void;
}

/** Adds a 2D/3D toggle button to root's controls. getScene is called after
 *  every repaint of `plot`, so the 3D view follows play/step/sliders. */
export function add3DToggle(root: HTMLElement, plot: Plot, getScene: (theme: Theme) => Scene3D | null) {
  const canvas = plot.canvas;
  const wrap = document.createElement('div');
  wrap.style.position = 'relative';
  canvas.replaceWith(wrap);
  wrap.appendChild(canvas);

  const overlay = document.createElement('div');
  overlay.className = 'viz-3d';
  overlay.hidden = true;
  wrap.appendChild(overlay);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = '3D view';
  btn.title = 'Show the function as a surface you can rotate';
  const host = root.querySelector('.viz-buttons') ?? root.querySelector('.viz-controls');
  host?.appendChild(btn);

  let view: import('./surface3d').SurfaceView | null = null;
  let on = false;

  const sync = () => {
    if (!on || !view) return;
    const sc = getScene(plot.theme);
    if (sc) view.update(sc, plot.theme);
  };
  plot.onPaint(sync);

  btn.addEventListener('click', async () => {
    on = !on;
    btn.textContent = on ? '2D view' : '3D view';
    overlay.hidden = !on;
    canvas.style.visibility = on ? 'hidden' : '';
    if (on && !view) {
      btn.disabled = true;
      overlay.dataset.loading = 'Loading 3D…';
      try {
        const { SurfaceView } = await import('./surface3d');
        view = new SurfaceView(overlay);
      } catch {
        overlay.dataset.loading = 'WebGL is not available in this browser.';
        btn.disabled = false;
        return;
      }
      delete overlay.dataset.loading;
      btn.disabled = false;
    }
    sync();
  });
}
