export interface ErrorLogContext {
  operation: string;
  requestId?: string;
  eventId?: string;
}

export function logError(
  message: string,
  error: unknown,
  context: ErrorLogContext,
): void {
  console.error(
    JSON.stringify({
      level: 'ERROR',
      message,
      ...context,
      errorName: error instanceof Error ? error.name : 'UnknownError',
    }),
  );
}
