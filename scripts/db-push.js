#!/usr/bin/env node
/**
 * db-push.js
 * Applies pending SQL migrations to the linked Supabase project.
 * 
 * Maintains a journal table (public.migration_journal) to track which
 * migrations have been applied. Skips already-applied files.
 * 
 * Usage: node scripts/db-push.js [--dry-run]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '../supabase/migrations');
const DRY_RUN = process.argv.includes('--dry-run');

function supabaseQuery(sql) {
  const escaped = sql.replace(/"/g, '\\"');
  const tmpFile = path.join(require('os').tmpdir(), `db-push-${Date.now()}.sql`);
  fs.writeFileSync(tmpFile, sql);
  try {
    const result = execSync(`npx supabase db query --linked --file "${tmpFile}"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return JSON.parse(result.trim());
  } finally {
    fs.unlinkSync(tmpFile);
  }
}

function ensureJournal() {
  supabaseQuery(`
    CREATE TABLE IF NOT EXISTS public.migration_journal (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

function getApplied() {
  const result = supabaseQuery(
    'SELECT filename FROM public.migration_journal ORDER BY filename;'
  );
  return new Set((result.rows || []).map(r => r.filename));
}

function applyMigration(filename, sql) {
  // Run the migration SQL
  const tmpFile = path.join(require('os').tmpdir(), `migration-${Date.now()}.sql`);
  const combined = sql + `\nINSERT INTO public.migration_journal (filename) VALUES ('${filename.replace(/'/g, "''")}') ON CONFLICT DO NOTHING;`;
  fs.writeFileSync(tmpFile, combined);
  try {
    execSync(`npx supabase db query --linked --file "${tmpFile}"`, {
      encoding: 'utf8',
      stdio: 'inherit',
    });
  } finally {
    fs.unlinkSync(tmpFile);
  }
}

async function main() {
  console.log(`\n🗄️  Dinner Plans — DB Push${DRY_RUN ? ' (DRY RUN)' : ''}\n`);

  console.log('Connecting to database...');
  ensureJournal();
  const applied = getApplied();

  // Get all .sql files sorted by name
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const pending = files.filter(f => !applied.has(f));

  if (pending.length === 0) {
    console.log('✅ No pending migrations.\n');
    return;
  }

  console.log(`Found ${pending.length} pending migration(s):\n`);
  pending.forEach(f => console.log(`  • ${f}`));
  console.log('');

  if (DRY_RUN) {
    console.log('DRY RUN: no changes applied.\n');
    return;
  }

  for (const filename of pending) {
    const filepath = path.join(MIGRATIONS_DIR, filename);
    const sql = fs.readFileSync(filepath, 'utf8');
    console.log(`Applying: ${filename}...`);
    applyMigration(filename, sql);
    console.log(`  ✓ Done`);
  }

  console.log(`\n✅ Applied ${pending.length} migration(s).\n`);
}

main().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
