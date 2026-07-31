export const createTextDigest = (values: readonly string[]): string => {
  let hash = 2166136261;
  for (const value of values) {
    for (const character of value) {
      hash ^= character.codePointAt(0)!;
      hash = Math.imul(hash, 16777619);
    }
    hash ^= 31;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};
