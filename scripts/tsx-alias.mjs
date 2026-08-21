/** Maps the @/* path alias for scripts run outside the Next bundler. */
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
export async function resolve(specifier, context, next) {
  if (specifier.startsWith('@/')) {
    return next(pathToFileURL(path.join(root, 'src', specifier.slice(2))).href, context);
  }
  return next(specifier, context);
}
