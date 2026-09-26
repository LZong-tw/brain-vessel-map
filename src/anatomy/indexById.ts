/**
 * Lookup table keyed by id. Built on a prototype-less object so that ids coming from
 * outside (e.g. the URL hash) such as "constructor" or "__proto__" never match.
 */
export function indexById<T>(items: readonly T[], key: (item: T) => string): Record<string, T> {
  const out = Object.create(null) as Record<string, T>;
  for (const it of items) out[key(it)] = it;
  return out;
}
