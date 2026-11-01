// 3D surface view of z = f(x, y), rendered with three.js. This module is only
// loaded (via dynamic import from view3d.ts) when someone presses the 3D button.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { contours, type Theme, type Vec } from './core';
import type { Scene3D } from './view3d';

const N = 140; // surface grid resolution
const ZH = 0.85; // height of the tallest point, in scene units (x, y span [-1, 1])
const LIFT = 0.012; // paths float slightly above the surface

export class SurfaceView {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(38, 1, 0.01, 50);
  private controls: OrbitControls;
  private static = new THREE.Group(); // surface, contours, frame: rebuilt when f/view/theme change
  private dynamic = new THREE.Group(); // paths and markers: rebuilt every update
  private key = '';
  private sc: Scene3D | null = null;
  private theme: Theme | null = null;
  private mesh: THREE.Mesh | null = null;
  // world <-> scene mapping
  private cx = 0;
  private cy = 0;
  private s = 1;
  private fmin = 0;
  private fcap = 1;
  private log = false;
  private dragging = false;
  private label: HTMLElement;

  constructor(private container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);
    const el = this.renderer.domElement;
    el.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;';
    container.appendChild(el);

    this.label = document.createElement('div');
    this.label.style.cssText = 'position:absolute;left:8px;bottom:6px;font-size:12px;color:var(--muted);pointer-events:none;';
    container.appendChild(this.label);

    this.camera.up.set(0, 0, 1);
    this.camera.position.set(2.1, -2.5, 2.0);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8a8a, 1.7));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(1.5, -1, 3);
    this.scene.add(sun);
    this.scene.add(this.static, this.dynamic);

    this.bindDrag(); // before OrbitControls so we can disable it on a handle hit
    this.controls = new OrbitControls(this.camera, el);
    this.controls.target.set(0, 0, ZH * 0.3);
    this.controls.enableDamping = false;
    this.controls.minDistance = 1.2;
    this.controls.maxDistance = 8;
    this.controls.addEventListener('change', () => this.render());

    new ResizeObserver(() => this.resize()).observe(container);
  }

  /* ------------------------------------------------------------ mapping */

  private X = (x: number) => (x - this.cx) * this.s;
  private Y = (y: number) => (y - this.cy) * this.s;
  private height(f: number) {
    if (!Number.isFinite(f)) return ZH;
    const t = this.log ? Math.log1p(Math.max(0, f - this.fmin)) / Math.log1p(this.fcap - this.fmin) : (f - this.fmin) / (this.fcap - this.fmin);
    return ZH * Math.min(1, Math.max(0, t));
  }
  private P(p: Vec, lift = LIFT) {
    const f = this.sc!.obj.f(p);
    return new THREE.Vector3(this.X(p[0]), this.Y(p[1]), this.height(f) + lift);
  }

  /* ------------------------------------------------------------- update */

  update(sc: Scene3D, theme: Theme) {
    this.sc = sc;
    this.theme = theme;
    const key = `${sc.obj.id}|${sc.obj.name}|${JSON.stringify(sc.view)}|${theme.text}`;
    if (key !== this.key) {
      this.key = key;
      this.buildStatic();
    }
    this.buildDynamic();
    this.render();
  }

  private buildStatic() {
    const { obj, view } = this.sc!;
    const t = this.theme!;
    clear(this.static);

    const [x0, x1] = view.x;
    const [y0, y1] = view.y;
    this.cx = (x0 + x1) / 2;
    this.cy = (y0 + y1) / 2;
    this.s = 2 / Math.max(x1 - x0, y1 - y0);

    // sample f, choose linear or log height scale
    const vals = new Float64Array((N + 1) * (N + 1));
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) vals[j * (N + 1) + i] = obj.f([x0 + ((x1 - x0) * i) / N, y0 + ((y1 - y0) * j) / N]);
    const sorted = Array.from(vals).filter(Number.isFinite).sort((a, b) => a - b);
    this.fmin = sorted[0];
    const q = (p: number) => sorted[Math.floor(p * (sorted.length - 1))] - this.fmin;
    this.log = q(0.99) / Math.max(1e-12, q(0.5)) > 8;
    this.fcap = this.fmin + (q(1) || 1);
    this.label.textContent = `height: ${this.log ? 'log(1 + f − min f)' : 'f'} · drag to rotate, scroll to zoom${this.sc!.setStart ? ', drag the large ball to move the start' : ''}`;

    // surface mesh with height-shaded neutral colors
    const geo = new THREE.PlaneGeometry((x1 - x0) * this.s, (y1 - y0) * this.s, N, N);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const lo = new THREE.Color(t.border);
    const hi = new THREE.Color(t.faint);
    const c = new THREE.Color();
    // PlaneGeometry rows go top (y1) to bottom (y0)
    for (let j = 0; j <= N; j++) {
      for (let i = 0; i <= N; i++) {
        const idx = j * (N + 1) + i;
        const f = vals[(N - j) * (N + 1) + i];
        const z = this.height(f);
        pos.setZ(idx, z);
        c.copy(lo).lerp(hi, z / ZH);
        colors.set([c.r, c.g, c.b], idx * 3);
      }
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
    this.mesh = new THREE.Mesh(geo, mat);
    this.static.add(this.mesh);

    // contour lines on the surface and projected onto the floor
    const cs = contours(obj.f, view, { n: 120, count: 14 });
    const onSurf: number[] = [];
    const onFloor: number[] = [];
    cs.segs.forEach((seg, li) => {
      const z = this.height(cs.levels[li]) + 0.002;
      for (let k = 0; k < seg.length; k += 4) {
        const ax = this.X(seg[k]);
        const ay = this.Y(seg[k + 1]);
        const bx = this.X(seg[k + 2]);
        const by = this.Y(seg[k + 3]);
        onSurf.push(ax, ay, z, bx, by, z);
        onFloor.push(ax, ay, -0.002, bx, by, -0.002);
      }
    });
    const seg = (arr: number[], color: string, opacity: number) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
      return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity }));
    };
    this.static.add(seg(onSurf, t.muted, 0.7), seg(onFloor, t.muted, 0.35));

    // floor frame
    const hx = (x1 - x0) * this.s / 2;
    const hy = (y1 - y0) * this.s / 2;
    const frame = [-hx, -hy, 0, hx, -hy, 0, hx, -hy, 0, hx, hy, 0, hx, hy, 0, -hx, hy, 0, -hx, hy, 0, -hx, -hy, 0];
    this.static.add(seg(frame, t.border, 1));
  }

  private dynamicMats = new Set<LineMaterial>();

  private buildDynamic() {
    const sc = this.sc!;
    const t = this.theme!;
    clear(this.dynamic);
    this.dynamicMats.clear();
    const { w, h } = this.size();

    for (const path of sc.paths) {
      if (path.pts.length < 2) continue;
      // follow the surface between iterates instead of cutting through it
      // stop at the edge of the plotted domain (diverging methods leave it)
      const vw = sc.view;
      const inside = (p: Vec) => p[0] >= vw.x[0] && p[0] <= vw.x[1] && p[1] >= vw.y[0] && p[1] <= vw.y[1];
      const pts: number[] = [];
      let kept = 0;
      outer: for (let i = 0; i < path.pts.length; i++) {
        const a = path.pts[i];
        if (!inside(a)) break;
        kept = i + 1;
        const b = path.pts[i + 1];
        if (!b) {
          const v = this.P(a);
          pts.push(v.x, v.y, v.z);
          break;
        }
        const steps = Math.max(2, Math.min(80, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * this.s * 30)));
        for (let k = 0; k < steps; k++) {
          const u = k / steps;
          const q: Vec = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
          if (!inside(q)) break outer;
          const v = this.P(q);
          pts.push(v.x, v.y, v.z);
        }
      }
      if (pts.length < 6) continue;
      const g = new LineGeometry();
      g.setPositions(pts);
      const m = new LineMaterial({ color: new THREE.Color(path.color).getHex(), linewidth: path.width ?? 2.5, dashed: !!path.dashed, dashSize: 0.03, gapSize: 0.025 });
      m.resolution.set(w, h);
      this.dynamicMats.add(m);
      const line = new Line2(g, m);
      if (path.dashed) line.computeLineDistances();
      this.dynamic.add(line);
      // iterate dots
      for (const p of path.pts.slice(0, kept)) this.dynamic.add(ball(this.P(p), 0.012, path.color));
    }
    for (const mk of sc.markers ?? []) this.dynamic.add(ball(this.P(mk.p), mk.size ?? 0.025, mk.color));
    // minimizer and start point
    this.dynamic.add(ball(this.P(sc.obj.xstar, 0.004), 0.016, t.muted));
    this.dynamic.add(ball(this.P(sc.start), 0.035, t.strong));
  }

  /* ------------------------------------------------------------ drawing */

  private size() {
    return { w: this.container.clientWidth || 1, h: this.container.clientHeight || 1 };
  }

  private resize() {
    const { w, h } = this.size();
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.dynamicMats.forEach((m) => m.resolution.set(w, h));
    this.render();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  /* ------------------------------------------------- drag the start point */

  private bindDrag() {
    const el = this.renderer.domElement;
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const toNdc = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      return r;
    };
    el.addEventListener('pointerdown', (e) => {
      if (!this.sc?.setStart) return;
      const r = toNdc(e);
      const s = this.P(this.sc.start).project(this.camera);
      const dx = ((s.x - ndc.x) * r.width) / 2;
      const dy = ((s.y - ndc.y) * r.height) / 2;
      if (Math.hypot(dx, dy) < 18) {
        this.dragging = true;
        this.controls.enabled = false;
        el.setPointerCapture(e.pointerId);
      }
    });
    el.addEventListener('pointermove', (e) => {
      if (!this.dragging || !this.sc?.setStart || !this.mesh) return;
      toNdc(e);
      ray.setFromCamera(ndc, this.camera);
      const hit = ray.intersectObject(this.mesh)[0];
      let pt: THREE.Vector3 | undefined = hit?.point;
      if (!pt) {
        const floor = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        pt = ray.ray.intersectPlane(floor, new THREE.Vector3()) ?? undefined;
      }
      if (!pt) return;
      const v = this.sc.view;
      const x = Math.min(v.x[1], Math.max(v.x[0], pt.x / this.s + this.cx));
      const y = Math.min(v.y[1], Math.max(v.y[0], pt.y / this.s + this.cy));
      this.sc.setStart([x, y]);
    });
    const end = () => {
      this.dragging = false;
      this.controls.enabled = true;
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }
}

function ball(p: THREE.Vector3, r: number, color: string) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(color) }));
  m.position.copy(p);
  return m;
}

function clear(g: THREE.Group) {
  for (const o of [...g.children]) {
    g.remove(o);
    o.traverse((c) => {
      const m = c as THREE.Mesh;
      m.geometry?.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose();
    });
  }
}
