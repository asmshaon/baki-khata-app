import { z } from 'zod';
import { HttpError } from './http-error.js';

/**
 * Parses input with a Zod schema, throwing a 422 HttpError whose
 * fieldErrors map each field to message keys (translated in app.ts).
 */
export function validate<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const { fieldErrors } = z.flattenError(result.error);
    throw new HttpError(422, 'invalidInput', fieldErrors as Record<string, string[]>);
  }
  return result.data;
}
