/**
 * SEC-004: Shared CORS allowlist for Supabase edge functions.
 *
 * Replaces the `Access-Control-Allow-Origin: *` wildcard that every function
 * used to set. JWT verification (SEC-001) is the primary defense, but an
 * allowlist still reduces attack surface by preventing arbitrary browser
 * origins from issuing requests.
 *
 * Allowed origins (defaults):
 *   - https://dinnerplans.ai            production marketing site
 *   - https://www.dinnerplans.ai        www variant
 *   - http://localhost:8081             Expo web dev server
 *   - http://localhost:19006            legacy Expo web dev port
 *   - http://localhost:3000             generic dev port
 *   - dinner-plans://                   app scheme deep-link origin
 *
 * The `ALLOWED_ORIGINS` env var (comma-separated) overrides the default list
 * when set, so staging or preview deploys can extend the allowlist without a
 * code change.
 */

const DEFAULT_ALLOWED_ORIGINS = [
  'https://dinnerplans.ai',
  'https://www.dinnerplans.ai',
  'http://localhost:8081',
  'http://localhost:19006',
  'http://localhost:3000',
  'dinner-plans://',
];

const ALLOWED_HEADERS = 'authorization, x-client-info, apikey, content-type';

function getAllowedOrigins(): string[] {
  const override = Deno.env.get('ALLOWED_ORIGINS');
  if (!override) return DEFAULT_ALLOWED_ORIGINS;
  return override.split(',').map((o) => o.trim()).filter(Boolean);
}

export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  return getAllowedOrigins().includes(origin);
}

/**
 * Build the CORS headers for a request. If the origin is allowed, reflects it
 * back; otherwise omits the `Access-Control-Allow-Origin` header so the
 * browser blocks the response.
 *
 * `allowMethods` defaults to the union of methods the functions use today.
 * Callers that want to be more restrictive can pass an explicit list.
 */
export function buildCorsHeaders(
  req: Request,
  allowMethods: string[] = ['POST', 'OPTIONS'],
): Record<string, string> {
  const origin = req.headers.get('Origin') || req.headers.get('origin');
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': ALLOWED_HEADERS,
    'Access-Control-Allow-Methods': allowMethods.join(', '),
    Vary: 'Origin',
  };
  if (isOriginAllowed(origin)) {
    headers['Access-Control-Allow-Origin'] = origin as string;
  }
  return headers;
}

/**
 * Handle a CORS preflight (OPTIONS) request. Returns a 204 if the origin is
 * allowed, or a 403 with no CORS headers if the origin is not in the
 * allowlist.
 *
 * Callers should invoke this at the top of their handler when
 * `req.method === 'OPTIONS'`.
 */
export function handlePreflight(req: Request): Response {
  const origin = req.headers.get('Origin') || req.headers.get('origin');
  if (!isOriginAllowed(origin)) {
    return new Response(
      JSON.stringify({ error: 'Origin not allowed' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } },
    );
  }
  return new Response(null, { status: 204, headers: buildCorsHeaders(req) });
}
