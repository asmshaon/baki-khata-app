import type { MessageKey } from '@baki/shared';

/**
 * An error with a translatable message. `messageKey` and the field error
 * entries are keys from the shared message catalogue; the error handler in
 * app.ts translates them into the request's language.
 */
export class HttpError extends Error {
  constructor(
    public status: number,
    public messageKey: MessageKey,
    public fieldErrors?: Record<string, string[]>,
  ) {
    super(messageKey);
  }
}

export const notFound = (key: MessageKey = 'notFound') => new HttpError(404, key);
