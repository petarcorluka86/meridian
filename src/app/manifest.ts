import type { MetadataRoute } from 'next';
import { GROUND } from './layout';
import { loadConfig } from '@/lib/env';

/**
 * Generated rather than served from `public/`, for one reason: `theme_color` is
 * a colour, and this app now has two. A static file would have said "paper" to
 * an installed window painted in the dark scheme.
 *
 * `system` cannot be expressed here — the manifest takes one value, not a media
 * query — so it resolves to the light ground, which is what the app opens as on
 * a Mac that has never been set either way.
 */
export default function manifest(): MetadataRoute.Manifest {
  const { theme } = loadConfig();
  const ground = theme === 'dark' ? GROUND.dark : GROUND.light;

  return {
    name: 'Meridian',
    short_name: 'Meridian',
    description: 'A local hub for running a team',
    start_url: '/',
    display: 'standalone',
    theme_color: ground,
    background_color: ground,
    icons: [
      { src: '/icon.svg', type: 'image/svg+xml', sizes: 'any' },
      { src: '/icon-192.png', type: 'image/png', sizes: '192x192', purpose: 'any' },
      { src: '/icon-512.png', type: 'image/png', sizes: '512x512', purpose: 'any' },
    ],
  };
}
