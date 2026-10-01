/** A `messages` key in the configuration document that no catalogue declares, so it has no effect. */
export interface UnknownMessageKey {
  key: string;
  /** The closest declared key, when one is within two edits ignoring case. */
  suggestion?: string;
}

const MAX_SUGGESTION_DISTANCE = 2;

function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const substitution = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      current.push(Math.min(previous[j] + 1, current[j - 1] + 1, substitution));
    }
    previous = current;
  }
  return previous[b.length];
}

function closestKey(key: string, declared: readonly string[]): string | undefined {
  const target = key.toLowerCase();
  let best: { key: string; distance: number } | undefined;
  for (const candidate of declared) {
    if (Math.abs(candidate.length - key.length) > MAX_SUGGESTION_DISTANCE) continue;
    const distance = editDistance(target, candidate.toLowerCase());
    if (distance <= MAX_SUGGESTION_DISTANCE && (!best || distance < best.distance)) {
      best = { key: candidate, distance };
    }
  }
  return best?.key;
}

/** Lists the override keys that are not in `declared`, each with its closest declared key. */
export function unknownMessageKeys(
  overrides: Readonly<Record<string, string>> | undefined,
  declared: ReadonlySet<string>,
): UnknownMessageKey[] {
  const candidates = [...declared];
  return Object.keys(overrides ?? {})
    .filter((key) => !declared.has(key))
    .map((key) => {
      const suggestion = closestKey(key, candidates);
      return suggestion ? { key, suggestion } : { key };
    });
}

/** The message `onError` receives, written for the engineer editing the document. */
export function describeUnknownMessageKeys(keys: readonly UnknownMessageKey[]): string {
  const listed = keys
    .map(({ key, suggestion }) => (suggestion ? `"${key}" (did you mean "${suggestion}"?)` : `"${key}"`))
    .join(', ');
  return `The configuration document's messages override keys no catalogue declares, so they have no effect: ${listed}.`;
}
