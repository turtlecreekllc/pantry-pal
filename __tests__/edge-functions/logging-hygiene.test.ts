/**
 * SEC-003: Logging hygiene for Supabase edge functions.
 *
 * Static checks against every function in `supabase/functions/` to verify that:
 *   - No env-state probes ("STRIPE_SECRET_KEY: SET" / NOT SET style)
 *   - No raw request body logging (`console.log('Request body:', ...)`)
 *   - Error logs do not pass the full caught error object — they must emit
 *     name/stack rather than the request payload or the unredacted error.
 *
 * The test reads each function's source text and asserts on patterns. If a
 * future change reintroduces a regression, the test fails on the offending
 * function name.
 */

import * as fs from 'fs';
import * as path from 'path';

const FUNCTIONS_DIR = path.join(__dirname, '..', '..', 'supabase', 'functions');

function listFunctionSources(): { name: string; source: string }[] {
  const entries = fs.readdirSync(FUNCTIONS_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((dir) => {
      const filePath = path.join(FUNCTIONS_DIR, dir.name, 'index.ts');
      if (!fs.existsSync(filePath)) return null;
      return { name: dir.name, source: fs.readFileSync(filePath, 'utf8') };
    })
    .filter((x): x is { name: string; source: string } => x !== null);
}

describe('SEC-003: edge function logging hygiene', () => {
  const sources = listFunctionSources();

  it('covers all 12 edge functions', () => {
    // 9 original + 3 SEC-006 provider proxies (claude, openai-audio, spoonacular)
    expect(sources.length).toBe(12);
  });

  describe.each(sources)('$name/index.ts', ({ source }) => {
    it('does not log env-state (SET / NOT SET)', () => {
      // Catches patterns like `STRIPE_SECRET_KEY:`, `? 'SET' : 'NOT SET'`,
      // and `Environment check`.
      expect(source).not.toMatch(/'SET'\s*:\s*'NOT SET'/);
      expect(source).not.toMatch(/Environment check/i);
      expect(source).not.toMatch(
        /console\.(log|error|info)\([^)]*STRIPE_SECRET_KEY[^)]*\)/,
      );
      expect(source).not.toMatch(
        /console\.(log|error|info)\([^)]*SUPABASE_SERVICE_ROLE_KEY[^)]*\)/,
      );
    });

    it('does not log the raw request body', () => {
      // Forbid `console.log('Request body', ...)` and any direct dump of the
      // parsed `body` object.
      expect(source).not.toMatch(/console\.(log|error|info)\(\s*['"`]Request body/i);
      expect(source).not.toMatch(/console\.(log|error|info)\([^)]*JSON\.stringify\(\s*body\s*\)/);
      expect(source).not.toMatch(/console\.(log|error|info)\([^)]*Raw body received/i);
    });

    it('does not log user identifiers verbatim in informational logs', () => {
      // Block patterns that emit `${userId}` / `transactionId` etc directly.
      // Allow operational logs that reference only the function/event type.
      expect(source).not.toMatch(/console\.log\([^)]*\$\{userId\}/);
      expect(source).not.toMatch(/console\.log\([^)]*\$\{targetUserId\}/);
      expect(source).not.toMatch(/console\.log\([^)]*\$\{transactionId\}/);
      expect(source).not.toMatch(/console\.log\([^)]*Creating Stripe customer for/);
    });

    it('error logs emit error type/stack, not the raw caught value', () => {
      // Forbid `console.error('...:', err)` and `console.error('...:', err.message)`
      // which leak the message string into log shippers. Allowed forms reference
      // `err?.name`, `err?.stack`, `err?.code`, or `(err as Error)?.stack`.
      const catchBlocks = source.match(/catch\s*\([^)]*\)\s*\{[\s\S]*?\n  \}/g) || [];
      for (const block of catchBlocks) {
        // If the catch block logs, it must include `.stack` or `.name` or `.code`.
        const consoleCalls = block.match(/console\.(error|log|warn)\([^;]+\)/g) || [];
        for (const call of consoleCalls) {
          const referencesStackOrName = /\.(stack|name|code)\b/.test(call);
          // The legacy `err.message` alone, or a bare `err` arg, is the failure
          // mode SEC-003 targets.
          const bareErrArg = /,\s*err\s*\)/.test(call) || /,\s*error\s*\)/.test(call);
          const messageOnly = /\.message\s*[,)]/.test(call) && !referencesStackOrName;
          expect({ call, bareErrArg, messageOnly, referencesStackOrName }).toEqual(
            expect.objectContaining({ bareErrArg: false, messageOnly: false }),
          );
        }
      }
    });
  });
});
