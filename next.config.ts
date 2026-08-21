import type { NextConfig } from 'next';

/**
 * No external origin is reachable from the page: avatars are served from .cache/,
 * there are no web fonts, and nothing calls out from the browser. Integration
 * traffic happens server-side only.
 */
const csp = [
  "default-src 'self'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  // Next injects inline bootstrap scripts; 'unsafe-inline' is ignored by browsers
  // that honour the nonce, and is the documented fallback for older ones.
  "script-src 'self' 'unsafe-inline'" +
    (process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''),
  "font-src 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const nextConfig: NextConfig = {
  /**
   * Next allows one dev server per directory, and the pixel gate needs two: one
   * on the fixture vault for the screens, one on a throwaway git repository for
   * Changelog. Giving the second its own build directory gives it its own lock.
   */
  distDir: process.env.NEXT_DIST_DIR || '.next',
  poweredByHeader: false,
  devIndicators: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
        ],
      },
    ];
  },
};

export default nextConfig;
