import { describe, it, expect } from 'vitest';
import { createTileBag, drawTiles, LETTER_VALUES, RACK_SIZE } from './tiles.js';

describe('tile bag', () => {
  it('has 100 tiles for 2-4 players and 200 for 5-8', () => {
    expect(createTileBag(2)).toHaveLength(100);
    expect(createTileBag(4)).toHaveLength(100);
    expect(createTileBag(5)).toHaveLength(200);
    expect(createTileBag(8)).toHaveLength(200);
  });

  it('has the standard English distribution', () => {
    const bag = createTileBag(2);
    const count = (l: string) => bag.filter(t => t.letter === l).length;
    expect(count('E')).toBe(12);
    expect(count('A')).toBe(9);
    expect(count('Q')).toBe(1);
    expect(count('_')).toBe(2);
  });

  it('assigns standard values, blanks worth 0', () => {
    expect(LETTER_VALUES['Q']).toBe(10);
    expect(LETTER_VALUES['E']).toBe(1);
    expect(LETTER_VALUES['K']).toBe(5);
    expect(LETTER_VALUES['_']).toBe(0);
  });

  it('gives every tile a unique id', () => {
    const bag = createTileBag(5);
    expect(new Set(bag.map(t => t.id)).size).toBe(200);
  });

  it('drawTiles is pure and draws n tiles', () => {
    const bag = createTileBag(2);
    const { drawn, bag: rest } = drawTiles(bag, RACK_SIZE);
    expect(drawn).toHaveLength(7);
    expect(rest).toHaveLength(93);
    expect(bag).toHaveLength(100); // original untouched
  });

  it('drawTiles drains a short bag without error', () => {
    const bag = createTileBag(2).slice(0, 3);
    const { drawn, bag: rest } = drawTiles(bag, 7);
    expect(drawn).toHaveLength(3);
    expect(rest).toHaveLength(0);
  });

  it('shuffle is deterministic with an injected rng', () => {
    const rng = () => 0.5;
    expect(createTileBag(2, rng).map(t => t.letter).join('')).toBe(
      createTileBag(2, rng).map(t => t.letter).join(''),
    );
  });
});
