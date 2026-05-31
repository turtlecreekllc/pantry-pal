/**
 * SEC-006: provider keys must not ship in the React Native bundle.
 *
 * Expo inlines every `EXPO_PUBLIC_*` variable into the compiled JS bundle, so
 * naming an upstream API key `EXPO_PUBLIC_ANTHROPIC_API_KEY` (or _OPENAI_ /
 * _SPOONACULAR_) leaks it to anyone who decompiles the IPA/APK. This grep
 * guard fails if any client-side source or `.env.example` reintroduces one of
 * those names. Provider calls must go through the SEC-006 edge function
 * proxies instead.
 *
 * In the absence of CI workflows in this repo, this Jest test is the guard —
 * `npx jest sec-006-bundle-guard` runs locally and on any future CI.
 */

import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.join(__dirname, '..', '..');

const FORBIDDEN_KEYS = [
  'EXPO_PUBLIC_ANTHROPIC_API_KEY',
  'EXPO_PUBLIC_OPENAI_API_KEY',
  'EXPO_PUBLIC_SPOONACULAR_API_KEY',
];

const FORBIDDEN_URL_HOSTS = [
  // Direct provider hits from the client are the failure mode SEC-006 closed.
  // These must only appear inside supabase/functions/.
  { host: 'api.anthropic.com', allowedSubpaths: [path.join('supabase', 'functions')] },
  { host: 'api.openai.com', allowedSubpaths: [path.join('supabase', 'functions')] },
  { host: 'api.spoonacular.com', allowedSubpaths: [path.join('supabase', 'functions')] },
];

const SCAN_DIRS = ['lib', 'components', 'hooks', 'context', 'app', 'screens'];

const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  '.expo',
  'dist',
  'build',
  '__tests__', // tests legitimately reference these strings to assert their absence
]);

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDED_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe('SEC-006: provider keys never ship in the client bundle', () => {
  const sourceFiles = SCAN_DIRS.flatMap((d) => walk(path.join(REPO_ROOT, d)));

  describe('client source files', () => {
    it.each(FORBIDDEN_KEYS)('does not reference %s anywhere in client code', (key) => {
      const offenders: string[] = [];
      for (const file of sourceFiles) {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes(key)) {
          offenders.push(path.relative(REPO_ROOT, file));
        }
      }
      expect(offenders).toEqual([]);
    });
  });

  describe('.env.example', () => {
    const envExample = fs.readFileSync(path.join(REPO_ROOT, '.env.example'), 'utf8');

    it.each(FORBIDDEN_KEYS)('does not declare %s', (key) => {
      // The key may appear only as part of an explanatory comment, never as a
      // `KEY=value` declaration. Allow comments that explicitly forbid it.
      const lines = envExample.split(/\r?\n/);
      const declarations = lines.filter((line) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('#')) return false;
        return trimmed.startsWith(`${key}=`);
      });
      expect(declarations).toEqual([]);
    });
  });

  describe('direct upstream provider URLs', () => {
    it.each(FORBIDDEN_URL_HOSTS)(
      'host $host only appears under supabase/functions',
      ({ host, allowedSubpaths }) => {
        const offenders: string[] = [];
        for (const file of sourceFiles) {
          const rel = path.relative(REPO_ROOT, file);
          if (allowedSubpaths.some((p) => rel.startsWith(p))) continue;
          const content = fs.readFileSync(file, 'utf8');
          if (content.includes(host)) {
            offenders.push(rel);
          }
        }
        expect(offenders).toEqual([]);
      },
    );
  });
});
