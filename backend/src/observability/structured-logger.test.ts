// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';
import { logError } from './structured-logger.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('structured error logger', () => {
  it('writes JSON context without exposing internal error messages', () => {
    const writeError = vi.spyOn(console, 'error').mockImplementation(() => {});

    logError('Repository operation failed.', new Error('database details'), {
      operation: 'listProducts',
      requestId: 'request-123',
    });

    expect(writeError).toHaveBeenCalledWith(
      JSON.stringify({
        level: 'ERROR',
        message: 'Repository operation failed.',
        operation: 'listProducts',
        requestId: 'request-123',
        errorName: 'Error',
      }),
    );
    expect(writeError.mock.calls[0]?.[0]).not.toContain('database details');
  });

  it('identifies non-Error failures without serializing their values', () => {
    const writeError = vi.spyOn(console, 'error').mockImplementation(() => {});

    logError('Notification failed.', 'private failure detail', {
      operation: 'notifyLowStock',
      eventId: 'event-123',
    });

    expect(writeError).toHaveBeenCalledWith(
      JSON.stringify({
        level: 'ERROR',
        message: 'Notification failed.',
        operation: 'notifyLowStock',
        eventId: 'event-123',
        errorName: 'UnknownError',
      }),
    );
  });
});
