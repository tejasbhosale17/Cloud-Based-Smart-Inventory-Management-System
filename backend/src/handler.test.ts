// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { handler } from './handler.js';

describe('handler', () => {
  it('returns a successful JSON health response', async () => {
    const response = await handler();

    expect(response.statusCode).toBe(200);
    expect(response.headers).toEqual({ 'content-type': 'application/json' });
    expect(JSON.parse(response.body ?? '')).toEqual({
      message: 'Smart Inventory API is running',
    });
  });
});
