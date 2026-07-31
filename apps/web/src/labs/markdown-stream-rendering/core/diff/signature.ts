export const createSignature = (value: string, seed = 0): number => {
  let high = 0xdeadbeef ^ seed;
  let low = 0x41c6ce57 ^ seed;
  for (let index = 0; index < value.length; index += 1) {
    const character = value.charCodeAt(index);
    high = Math.imul(high ^ character, 2654435761);
    low = Math.imul(low ^ character, 1597334677);
  }
  high = Math.imul(high ^ (high >>> 16), 2246822507);
  high ^= Math.imul(low ^ (low >>> 13), 3269869909);
  low = Math.imul(low ^ (low >>> 16), 2246822507);
  low ^= Math.imul(high ^ (high >>> 13), 3269869909);
  return 4294967296 * (2097151 & low) + (high >>> 0);
};
