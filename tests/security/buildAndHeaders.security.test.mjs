import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT_DIR = path.resolve(import.meta.dirname, '..', '..');

function walkFiles(dir, extRegex) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(full, extRegex));
    } else if (extRegex.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

describe('Suite F — Security Headers, Links, ErrorBoundary & Build Secret Scan (SEC-01, SEC-07)', () => {
  it('configures strict CSP, clickjacking protection, HSTS, and security headers in vercel.json', () => {
    const vercelConfig = JSON.parse(readFileSync(path.join(ROOT_DIR, 'vercel.json'), 'utf8'));
    const headerRules = vercelConfig.headers?.find((h) => h.source === '/(.*)')?.headers || [];
    const headerMap = Object.fromEntries(
      headerRules.map((item) => [item.key.toLowerCase(), item.value])
    );

    expect(headerMap['x-frame-options']).toBe('DENY');
    expect(headerMap['x-content-type-options']).toBe('nosniff');
    expect(headerMap['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headerMap['strict-transport-security']).toContain('max-age=63072000');
    expect(headerMap['permissions-policy']).toContain('camera=()');

    const csp = headerMap['content-security-policy'] || '';
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("media-src 'self'");
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it('enforces rel="noopener noreferrer" on all target="_blank" links and window.open() calls in src/', () => {
    const srcFiles = walkFiles(path.join(ROOT_DIR, 'src'), /\.(js|jsx)$/);
    expect(srcFiles.length).toBeGreaterThan(20);

    for (const filePath of srcFiles) {
      const content = readFileSync(filePath, 'utf8');

      // Check every target="_blank" tag snippet
      const blankMatches = [...content.matchAll(/<a\b[^>]*target="_blank"[^>]*>/gs)];
      for (const match of blankMatches) {
        expect(match[0], `Missing noopener in ${path.relative(ROOT_DIR, filePath)}`).toContain(
          'noopener'
        );
        expect(match[0], `Missing noreferrer in ${path.relative(ROOT_DIR, filePath)}`).toContain(
          'noreferrer'
        );
      }

      // Check every window.open(...) call statement
      const windowOpenMatches = [...content.matchAll(/window\.open\([^\n;]+/g)];
      for (const match of windowOpenMatches) {
        expect(
          match[0],
          `window.open missing noopener in ${path.relative(ROOT_DIR, filePath)}`
        ).toContain('noopener');
        expect(
          match[0],
          `window.open missing noreferrer in ${path.relative(ROOT_DIR, filePath)}`
        ).toContain('noreferrer');
      }
    }
  });

  it('guards ErrorBoundary error details behind import.meta.env.DEV', () => {
    const ebSource = readFileSync(
      path.join(ROOT_DIR, 'src/components/ErrorBoundary/ErrorBoundary.jsx'),
      'utf8'
    );
    expect(ebSource).toContain('import.meta.env.DEV');
    expect(ebSource).toContain('{import.meta.env.DEV && this.state.error');
  });

  it('verifies production dist/ contains zero leaked secrets, hardcoded admin emails, or dev stack labels', () => {
    const distDir = path.join(ROOT_DIR, 'dist');
    const distAssetsDir = path.join(distDir, 'assets');
    expect(
      existsSync(distAssetsDir),
      'dist/assets not found — run `npm run build` before `npm run test:security`'
    ).toBe(true);

    const artifacts = [
      path.join(distDir, 'index.html'),
      ...walkFiles(distAssetsDir, /\.(js|css|html)$/)
    ].filter((p) => existsSync(p));

    const forbiddenPatterns = [
      /mushtaqsaqi00@gmail\.com/i,
      /saqijanitormiki@gmail\.com/i,
      /DEFAULT_ADMIN_EMAILS/,
      /Developer error details/,
      /AIza[0-9A-Za-z\-_]{35}/,
      /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
      /SUPABASE_SERVICE_ROLE_KEY/,
      /GROQ_API_KEY/,
      /OPENROUTER_API_KEY/
    ];

    for (const filePath of artifacts) {
      const content = readFileSync(filePath, 'utf8');
      for (const pattern of forbiddenPatterns) {
        expect(
          content,
          `Forbidden secret/leak pattern ${pattern} matched in ${path.relative(ROOT_DIR, filePath)}`
        ).not.toMatch(pattern);
      }
    }
  });
});
