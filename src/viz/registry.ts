export interface VizEntry {
  slug: string;
  title: string;
  summary: string;
  group: 'Optimization' | 'Convex geometry';
}

export const visualizations: VizEntry[] = [
  { slug: 'steepest-descent', group: 'Optimization', title: 'Steepest descent', summary: 'Gradient descent with fixed, backtracking, Wolfe, and exact step sizes — and the zig-zag that ill-conditioning causes.' },
  { slug: 'steepest-descent-norms', group: 'Optimization', title: 'Steepest descent under different norms', summary: 'The direction you call “steepest” depends on the unit ball you measure steps with: ℓ₁, ℓ₂, ℓ∞, any ℓₚ, or a quadratic norm.' },
  { slug: 'wolfe-conditions', group: 'Optimization', title: 'Wolfe conditions for line search', summary: 'Sufficient decrease and curvature conditions drawn on φ(α) = f(x + αp), with the acceptable step lengths shaded.' },
  { slug: 'conjugate-gradient', group: 'Optimization', title: 'Conjugate gradient', summary: 'A-conjugate directions finish a 2D quadratic in two steps; Fletcher–Reeves and Polak–Ribière carry the idea to non-quadratic functions.' },
  { slug: 'bfgs', group: 'Optimization', title: 'Quasi-Newton (BFGS)', summary: 'Watch the BFGS inverse-Hessian estimate learn the curvature of the function, ellipse by ellipse.' },
  { slug: 'nesterov', group: 'Optimization', title: 'Nesterov acceleration', summary: 'Gradient descent, heavy-ball momentum, and Nesterov’s look-ahead step raced side by side.' },
  { slug: 'lagrange-duality', group: 'Optimization', title: 'Lagrange multipliers and duality', summary: 'The Lagrangian as a family of supporting lines on the (g, f) image set: dual function, weak duality, and the duality gap.' },
  { slug: 'faces-of-convex-sets', group: 'Convex geometry', title: 'Faces of convex sets', summary: 'Faces, exposed faces, affine hulls, supporting hyperplanes, and conjugate faces in the polar set.' },
];
