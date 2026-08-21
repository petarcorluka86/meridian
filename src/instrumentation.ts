/**
 * Runs once when the server starts, before any page or action. The outbound
 * guard is installed here so it is in place for every request the process makes.
 *
 * One POST is permitted, by exact URL: Google's OAuth token endpoint. It is
 * authentication rather than a write to anyone's data, and it is the only way to
 * read a Google calendar at all. Everything else — every host, every method — is
 * refused, and the allowance is a URL rather than a host, so the rest of
 * oauth2.googleapis.com is as closed as the rest of the internet.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { installNetGuard } = await import('@/lib/net-guard');
    const { TOKEN_ENDPOINT } = await import('@/lib/sources/calendar');
    installNetGuard({ allowPostTo: [TOKEN_ENDPOINT] });
  }
}
