/**
 * SEC-001: Require verified JWT on protected Supabase edge functions.
 *
 * Static checks against every protected function in `supabase/functions/`:
 *   - Imports the shared `authenticateRequest` helper
 *   - Calls `authenticateRequest` before reading the request body
 *   - Does NOT extract `userId` from the request body
 *
 * Also verifies that supabase/config.toml correctly distinguishes webhook
 * functions (`verify_jwt = false`) from authenticated user actions
 * (`verify_jwt = true`), and that the shared auth helper produces a 401
 * response on missing or invalid tokens.
 */

import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.join(__dirname, '..', '..');
const FUNCTIONS_DIR = path.join(REPO_ROOT, 'supabase', 'functions');
const CONFIG_TOML = path.join(REPO_ROOT, 'supabase', 'config.toml');

const PROTECTED_FUNCTIONS = [
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

describe('SEC-001: protected edge functions require verified JWT', () => {
  describe.each(PROTECTED_FUNCTIONS)('%s', (name) => {
    const source = readFunctionSource(name);

    it('imports authenticateRequest from the shared auth helper', () => {
      expect(source).toMatch(
        /from\s+['"]\.\.\/_shared\/auth\.ts['"]/,
      );
      expect(source).toMatch(/authenticateRequest/);
      expect(source).toMatch(/isAuthFailure/);
    });

    it('calls authenticateRequest and short-circuits on failure', () => {
      // The pattern is: const auth = await authenticateRequest(req, corsHeaders);
      //                 if (isAuthFailure(auth)) return auth.response;
      expect(source).toMatch(
        /await\s+authenticateRequest\s*\(\s*req\s*,/,
      );
      expect(source).toMatch(
        /if\s*\(\s*isAuthFailure\s*\(\s*auth\s*\)\s*\)\s*return\s+auth\.response/,
      );
    });

    it('does not destructure userId from the request body', () => {
      // Forbid `const { userId } = ...req.json()` and any destructuring that
      // includes `userId,` from `body`. The verified JWT is the only source.
      const destructurePatterns = [
        /const\s*\{\s*[^}]*\buserId\b[^}]*\}\s*=\s*(?:await\s+)?req\.json/,
        /const\s*\{\s*[^}]*\buserId\b[^}]*\}\s*=\s*body\b/,
        /const\s*\{\s*[^}]*\buserId\b[^}]*\}\s*=\s*payload\b/,
      ];
      for (const pattern of destructurePatterns) {
        expect(source).not.toMatch(pattern);
      }
    });

    it('does not read actorUserId from the request body', () => {
      // send-household-notification used to trust an `actorUserId` field.
      expect(source).not.toMatch(
        /const\s*\{\s*[^}]*\bactorUserId\b[^}]*\}\s*=\s*(?:await\s+)?req\.json/,
      );
      expect(source).not.toMatch(
        /const\s*\{\s*[^}]*\bactorUserId\b[^}]*\}\s*=\s*payload\b/,
      );
    });
  });
});

describe('SEC-001: shared auth helper', () => {
  const helperPath = path.join(FUNCTIONS_DIR, '_shared', 'auth.ts');
  const source = fs.readFileSync(helperPath, 'utf8');

  it('extracts a Bearer token from the Authorization header', () => {
    expect(source).toMatch(/Authorization/);
    expect(source).toMatch(/Bearer /);
  });

  it('calls supabase.auth.getUser(token) to verify the JWT', () => {
    expect(source).toMatch(/auth\.getUser\(\s*token\s*\)/);
  });

  it('returns a 401 response when token is missing or invalid', () => {
    // Two distinct 401 returns: missing token and invalid token.
    const matches = source.match(/status:\s*401/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
    expect(source).toMatch(/Unauthorized: missing bearer token/);
    expect(source).toMatch(/Unauthorized: invalid token/);
  });
});

describe('SEC-001: supabase/config.toml verify_jwt settings', () => {
  const config = fs.readFileSync(CONFIG_TOML, 'utf8');

  it.each(PROTECTED_FUNCTIONS)(
    'sets verify_jwt = true for protected function %s',
    (name) => {
      const section = new RegExp(
        `\\[functions\\.${name}\\][^\\[]*verify_jwt\\s*=\\s*true`,
        'm',
      );
      expect(config).toMatch(section);
    },
  );

  it.each(WEBHOOK_FUNCTIONS)(
    'sets verify_jwt = false for webhook function %s',
    (name) => {
      const section = new RegExp(
        `\\[functions\\.${name}\\][^\\[]*verify_jwt\\s*=\\s*false`,
        'm',
      );
      expect(config).toMatch(section);
    },
  );
});
