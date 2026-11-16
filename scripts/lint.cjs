#!/usr/bin/env node
/**
 * COMSATSPrepHub Syntax & Security Policy Linter
 * Enforces:
 * 1. Zero server-only AI or Supabase Service Role keys inside src/
 * 2. Zero Mermaid 'loose' security mode in src/
 * 3. Zero 'FOR ALL USING (true)' RLS policies in src/ or supabase/
 * 4. Real syntax validation (node --check) across api/, scripts/, and src/
 * 5. Every API route exports a default handler; shared _lib code does not
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const FORBIDDEN_CLIENT_PATTERNS = [
  { pattern: /GEMINI_API_KEY/, reason: 'GEMINI_API_KEY must never appear in client src/' },
  { pattern: /GROQ_API_KEY/, reason: 'GROQ_API_KEY must never appear in client src/' },
  { pattern: /OPENROUTER_API_KEY/, reason: 'OPENROUTER_API_KEY must never appear in client src/' },
  { pattern: /SUPABASE_SERVICE_ROLE_KEY/, reason: 'SUPABASE_SERVICE_ROLE_KEY must never appear in client src/' },
  { pattern: /securityLevel\s*:\s*['"]loose['"]/, reason: 'Mermaid securityLevel must be strict, never loose' },
  { pattern: /FOR\s+ALL\s+USING\s*\(\s*true\s*\)/i, reason: 'Unrestricted FOR ALL USING (true) RLS policy is forbidden' }
];

function walkFiles(dir, exts) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(walkFiles(full, exts));
    } else if (exts.some((ext) => entry.name.endsWith(ext))) {
      results.push(full);
    }
  }
  return results;
}

let errors = 0;
const srcFiles = walkFiles(path.join(ROOT, 'src'), ['.js', '.jsx']);

for (const file of srcFiles) {
  const rel = path.relative(ROOT, file);
  const content = fs.readFileSync(file, 'utf8');
  for (const rule of FORBIDDEN_CLIENT_PATTERNS) {
    if (rule.pattern.test(content)) {
      console.error(`❌ [SECURITY LINT] ${rel}: ${rule.reason}`);
      errors++;
    }
  }
}

const sqlFiles = walkFiles(path.join(ROOT, 'supabase'), ['.sql']);
for (const file of sqlFiles) {
  const rel = path.relative(ROOT, file);
  const content = fs.readFileSync(file, 'utf8');
  if (/FOR\s+ALL[\s\S]{0,40}USING\s*\(\s*true\s*\)/i.test(content)) {
    console.error(`❌ [SQL RLS LINT] ${rel}: Unrestricted FOR ALL USING (true) policy detected`);
    errors++;
  }
}

const apiFiles = walkFiles(path.join(ROOT, 'api'), ['.js']);
for (const file of apiFiles) {
  const rel = path.relative(ROOT, file);
  const content = fs.readFileSync(file, 'utf8');
  const isRoute = path.dirname(rel) === 'api' && !path.basename(rel).startsWith('_');
  if (isRoute && !/export\s+default\s+(?:async\s+)?function/.test(content)) {
    console.error(`❌ [API LINT] ${rel}: API route must export a default handler function`);
    errors++;
  }
  if (/Access-Control-Allow-Origin['"]?\s*[,:]\s*['"]\*['"]/.test(content)) {
    console.error(`❌ [API LINT] ${rel}: Wildcard CORS on an authenticated endpoint`);
    errors++;
  }
}

const scriptFiles = walkFiles(path.join(ROOT, 'scripts'), ['.js', '.cjs', '.mjs']);
const syntaxFiles = [
  ...apiFiles,
  ...scriptFiles,
  ...srcFiles.filter((file) => file.endsWith('.js'))
];
for (const file of syntaxFiles) {
  const check = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (check.status !== 0) {
    const rel = path.relative(ROOT, file);
    console.error(`❌ [SYNTAX LINT] ${rel}: ${(check.stderr || '').trim().split('\n')[0]}`);
    errors++;
  }
}

if (errors > 0) {
  console.error(`\nLint failed with ${errors} error(s).`);
  process.exit(1);
}

console.log(
  `✅ Lint passed across ${srcFiles.length} client files, ${apiFiles.length} API file(s), ` +
  `${scriptFiles.length} script(s), ${syntaxFiles.length} syntax check(s), and ${sqlFiles.length} SQL migration(s).`
);
