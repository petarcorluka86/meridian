/**
 * Shared by server and client, so it lives outside both 'use client' modules —
 * a helper exported from a client module cannot be called during server render.
 */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  // A GitHub login is one word, so word-initials would give a lone letter.
  // Two characters reads as a monogram rather than an accident.
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return words
    .slice(0, 2)
    .map((p) => p[0] ?? '')
    .join('')
    .toUpperCase();
}
