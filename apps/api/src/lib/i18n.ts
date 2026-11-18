import { serverMessage, type Lang } from '@baki/shared';
import type { Request } from 'express';

/** Language from Accept-Language: English if the client asks for it, Bangla otherwise. */
export function langOf(req: Request): Lang {
  return req.acceptsLanguages('bn', 'en') === 'en' ? 'en' : 'bn';
}

export function translateFieldErrors(lang: Lang, fieldErrors?: Record<string, string[]>) {
  if (!fieldErrors) return undefined;
  return Object.fromEntries(
    Object.entries(fieldErrors).map(([field, keys]) => [field, keys.map((key) => serverMessage(lang, key))]),
  );
}
