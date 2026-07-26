export function createSignature(value: string, seed = 0): number {
  let high = 0xdeadbeef ^ seed;
  let low = 0x41c6ce57 ^ seed;

  for (let index = 0; index < value.length; index += 1) {
    const character = value.charCodeAt(index);
    high = Math.imul(high ^ character, 2_654_435_761);
    low = Math.imul(low ^ character, 1_597_334_677);
  }

  high = Math.imul(high ^ (high >>> 16), 2_246_822_507);
  high ^= Math.imul(low ^ (low >>> 13), 3_269_869_909);
  low = Math.imul(low ^ (low >>> 16), 2_246_822_507);
  low ^= Math.imul(high ^ (high >>> 13), 3_269_869_909);

  return 4_294_967_296 * (2_097_151 & low) + (high >>> 0);
}
