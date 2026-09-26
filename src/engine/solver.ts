/**
 * Dense Cholesky solver for the symmetric positive-definite systems produced by
 * resistor networks (graph Laplacian with Dirichlet boundary conditions).
 * n is a few hundred, so O(n³/6) dense factorisation is fast enough (~ms).
 */

export class SymmetricSystem {
  readonly n: number;
  readonly a: Float64Array;
  readonly b: Float64Array;

  constructor(n: number) {
    this.n = n;
    this.a = new Float64Array(n * n);
    this.b = new Float64Array(n);
  }

  /** Conductance g between unknown nodes i and j. */
  addEdge(i: number, j: number, g: number): void {
    const { a, n } = this;
    a[i * n + i] += g;
    a[j * n + j] += g;
    a[i * n + j] -= g;
    a[j * n + i] -= g;
  }

  /** Conductance g from unknown node i to a node at fixed potential p. */
  addFixed(i: number, g: number, p: number): void {
    this.a[i * this.n + i] += g;
    this.b[i] += g * p;
  }

  /** Net current injected into node i (positive = source). */
  addSource(i: number, q: number): void {
    this.b[i] += q;
  }

  /** Solves A x = b in place (A is destroyed). Returns x. */
  solve(): Float64Array {
    const { a, b, n } = this;
    // Cholesky: A = L Lᵀ, L stored in lower triangle of a
    for (let j = 0; j < n; j++) {
      const rj = j * n;
      let d = a[rj + j];
      for (let k = 0; k < j; k++) d -= a[rj + k] * a[rj + k];
      if (d <= 1e-300) d = 1e-300;
      const ljj = Math.sqrt(d);
      a[rj + j] = ljj;
      const inv = 1 / ljj;
      for (let i = j + 1; i < n; i++) {
        const ri = i * n;
        let s = a[ri + j];
        for (let k = 0; k < j; k++) s -= a[ri + k] * a[rj + k];
        a[ri + j] = s * inv;
      }
    }
    // forward: L y = b
    const y = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const ri = i * n;
      let s = b[i];
      for (let k = 0; k < i; k++) s -= a[ri + k] * y[k];
      y[i] = s / a[ri + i];
    }
    // backward: Lᵀ x = y
    const x = new Float64Array(n);
    for (let i = n - 1; i >= 0; i--) {
      let s = y[i];
      for (let k = i + 1; k < n; k++) s -= a[k * n + i] * x[k];
      x[i] = s / a[i * n + i];
    }
    return x;
  }
}
