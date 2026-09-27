import { describe, expect, it } from 'vitest';
import source from './app.css?raw';

/**
 * A rule left unclosed silently swallows every rule after it (they become nested rules that
 * never match) — this once disabled the timeline markers and the heat-map cell detail. The
 * stylesheet is plain CSS without strings containing braces, so counting is enough.
 */
describe('app.css', () => {
  it('has balanced braces, never closing more than it opened', () => {
    // the test runner must hand over the real file (see test.css in vite.config.ts), or this test
    // would pass on an empty string
    expect(source.length).toBeGreaterThan(10_000);
    const css = source.replace(/\/\*[\s\S]*?\*\//g, '');
    let depth = 0;
    let line = 1;
    for (const ch of css) {
      if (ch === '\n') line++;
      if (ch === '{') depth++;
      if (ch === '}') depth--;
      expect(depth, `line ${line}`).toBeGreaterThanOrEqual(0);
    }
    expect(depth).toBe(0);
  });
});
