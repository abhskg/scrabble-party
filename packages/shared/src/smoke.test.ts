import { describe, it, expect } from 'vitest';
import { SHARED_OK } from './index.js';

describe('workspace', () => {
  it('resolves the shared package', () => {
    expect(SHARED_OK).toBe(true);
  });
});
