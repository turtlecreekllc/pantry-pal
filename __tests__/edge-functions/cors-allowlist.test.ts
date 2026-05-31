/**
 * SEC-004: Lock down CORS origins on edge functions.
 *
 * Static checks against every browser-callable function in
 * `supabase/functions/` confirm that:
 *   - No function hard-codes `Access-Control-Allow-Origin: '*'`
 *   - Every function imports and uses the shared `buildCorsHeaders` /
 *     `handlePreflight` helpers from `_shared/cors.ts`
 *
 * Behavioural checks against the shared helper itself confirm that:
 *   - Allowed origins (marketing site, localhost dev origins, app scheme) are
 *     reflected back in the response
 *   - Disallowed origins receive a 403 on preflight
 *   - The allowlist can be overridden via the `ALLOWED_ORIGINS` env var
 */

import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.join(__dirname, '..', '..');
const FUNCTIONS_DIR = path.join(REPO_ROOT, 'supabase', 'functions');
const CORS_HELPER = path.join(FUNCTIONS_DIR, '_shared', 'cors.ts');

// All browser-callable functions. Webhook functions (stripe-webhook,
// apple-webhook) are server-to-server and intentionally have no CORS.
const BROWSER_FUNCTIONS = [
  'create-checkout-session',
  'cancel-subscription',
  'resume-subscription',
  'create-portal-session',
  'start-free-trial',
  'validate-apple-receipt',
  'send-household-notification',
];

const WEBHOOK_FUNCTIONS = ['stripe-webhook', 'apple-webhook'];

function readFunctionSource(name: string): string {
  return fs.readFileSync(path.join(FUNCTIONS_DIR, name, 'index.ts'), 'utf8');
}

describe('SEC-004: browser-callable edge functions use the CORS allowlist', () => {
  describe.each(BROWSER_FUNCTIONS)('%s', (name) => {
    const source = readFunctionSource(name);

    it('does not hard-code Access-Control-Allow-Origin: *', () => {
      expect(source).not.toMatch(/['"]Access-Control-Allow-Origin['"]\s*:\s*['"]\*['"]/);
    });

    it('imports buildCorsHeaders and handlePreflight from the shared helper', () => {
      expect(source).toMatch(/from\s+['"]\.\.\/_shared\/cors\.ts['"]/);
      expect(source).toMatch(/buildCorsHeaders/);
      expect(source).toMatch(/handlePreflight/);
    });

    it('routes OPTIONS preflight through handlePreflight', () => {
      expect(source).toMatch(
        /if\s*\(\s*req\.method\s*===\s*['"]OPTIONS['"]\s*\)\s*return\s+handlePreflight\s*\(\s*req\s*\)/,
      );
    });

    it('derives corsHeaders per-request via buildCorsHeaders(req)', () => {
      expect(source).toMatch(/buildCorsHeaders\s*\(\s*req\s*\)/);
    });
  });
});

describe('SEC-004: webhook functions remain CORS-free (server-to-server)', () => {
  it.each(WEBHOOK_FUNCTIONS)('%s does not import the CORS helper', (name) => {
    const source = readFunctionSource(name);
    expect(source).not.toMatch(/_shared\/cors\.ts/);
  });
});

describe('SEC-004: shared CORS helper behaviour', () => {
  const source = fs.readFileSync(CORS_HELPER, 'utf8');

  it('declares the production marketing site as an allowed origin', () => {
    expect(source).toMatch(/https:\/\/dinnerplans\.ai/);
  });

  it('declares localhost dev origins as allowed', () => {
    expect(source).toMatch(/http:\/\/localhost:8081/);
  });

  it('declares the app scheme deep-link origin as allowed', () => {
    expect(source).toMatch(/dinner-plans:\/\//);
  });

  it('sources the allowlist from a single constant (no duplication across functions)', () => {
    // Allowlist must live in the shared file. Spot-check that no edge
    // function defines its own ALLOWED_ORIGINS or repeats the marketing URL
    // as a literal allowlist entry.
    for (const name of BROWSER_FUNCTIONS) {
      const fnSource = readFunctionSource(name);
      expect(fnSource).not.toMatch(/ALLOWED_ORIGINS\s*=\s*\[/);
      expect(fnSource).not.toMatch(/['"]https:\/\/dinnerplans\.ai['"]/);
    }
  });

  it('reads an override allowlist from the ALLOWED_ORIGINS env var', () => {
    expect(source).toMatch(/Deno\.env\.get\(\s*['"]ALLOWED_ORIGINS['"]\s*\)/);
  });

  it('returns a 403 when handlePreflight sees a disallowed origin', () => {
    // The helper must short-circuit with status 403 when the origin is not
    // in the allowlist. Verified by reading the source — Deno runtime isn't
    // available in jest, so we assert the contract textually.
    expect(source).toMatch(/status:\s*403/);
    expect(source).toMatch(/Origin not allowed/);
  });

  it('reflects the request origin only when it is in the allowlist', () => {
    // buildCorsHeaders conditionally sets Access-Control-Allow-Origin so the
    // browser drops responses from unrecognised origins.
    expect(source).toMatch(/isOriginAllowed\s*\(\s*origin\s*\)/);
    expect(source).toMatch(/headers\[['"]Access-Control-Allow-Origin['"]\]\s*=\s*origin/);
  });

  it('adds Vary: Origin so caches do not collapse responses across origins', () => {
    expect(source).toMatch(/Vary['"]?\s*:\s*['"]Origin['"]/);
  });
});
