import type { Tile } from './types.js';

export const RACK_SIZE = 7;

export const LETTER_VALUES: Record<string, number> = {
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8, K: 5, L: 1, M: 3,
  N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1, U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10, _: 0,
};

const DISTRIBUTION: Record<string, number> = {
  A: 9, B: 2, C: 2, D: 4, E: 12, F: 2, G: 3, H: 2, I: 9, J: 1, K: 1, L: 4, M: 2,
  N: 6, O: 8, P: 2, Q: 1, R: 6, S: 4, T: 6, U: 4, V: 2, W: 2, X: 1, Y: 2, Z: 1, _: 2,
};

export function createTileBag(playerCount: number, rng: () => number = Math.random): Tile[] {
  const copies = playerCount >= 5 ? 2 : 1;
  const bag: Tile[] = [];
  let n = 0;
  for (let copy = 0; copy < copies; copy++) {
    for (const [letter, count] of Object.entries(DISTRIBUTION)) {
      for (let i = 0; i < count; i++) {
        bag.push({ id: `t${n++}`, letter, value: LETTER_VALUES[letter], isBlank: letter === '_' });
      }
    }
  }
  // Fisher-Yates
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

export function drawTiles(bag: Tile[], n: number): { drawn: Tile[]; bag: Tile[] } {
  const take = Math.min(n, bag.length);
  return { drawn: bag.slice(0, take), bag: bag.slice(take) };
}
