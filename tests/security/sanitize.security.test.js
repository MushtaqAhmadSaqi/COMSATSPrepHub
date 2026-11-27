import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  isSafeRedirectUrl,
  isSafePdfUrl,
  sanitizePlainText,
  getInitialsAvatarDataUri
} from '../../src/utils/sanitize.js';

describe('Suite A — Input, Redirect, URL & SVG Sanitization (SEC-03, SEC-04, SEC-05)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('isSafeRedirectUrl', () => {
    const base = 'https://comsatsprephub.vercel.app';

    it('allows valid same-origin paths and URLs', () => {
      expect(isSafeRedirectUrl('/papers', base)).toBe(true);
      expect(isSafeRedirectUrl('/#/gpa?semester=4', base)).toBe(true);
      expect(isSafeRedirectUrl('#quiz', base)).toBe(true);
      expect(isSafeRedirectUrl('https://comsatsprephub.vercel.app/admin', base)).toBe(true);
    });

    it('blocks open redirects, backslashes, control chars, and dangerous schemes', () => {
      const payloads = [
        '',
        '   ',
        null,
        undefined,
        123,
        '//evil.example.com',
        '///evil.example.com',
        '/\\evil.example.com',
        '\\evil.example.com',
        '/ok\r\nLocation: https://evil.example.com',
        '/ok\x00evil',
        'https://evil.example.com/phish',
        'https://comsatsprephub.vercel.app.evil.com',
        'http://comsatsprephub.vercel.app/downgrade',
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'vbscript:msgbox(1)'
      ];

      for (const payload of payloads) {
        expect(isSafeRedirectUrl(payload, base)).toBe(false);
      }
    });
  });

  describe('isSafePdfUrl', () => {
    const base = 'https://comsatsprephub.vercel.app';
    const configuredSupabase = 'https://myprephubproj.supabase.co';

    it('allows configured Supabase storage host, Vercel app host, and safe relative PDF paths', () => {
      expect(
        isSafePdfUrl(
          'https://myprephubproj.supabase.co/storage/v1/object/public/papers/csc211.pdf',
          base,
          configuredSupabase
        )
      ).toBe(true);
      expect(isSafePdfUrl('https://comsatsprephub.vercel.app/papers/csc211.pdf', base)).toBe(true);
      expect(isSafePdfUrl('/papers/csc211.pdf', base)).toBe(true);
    });

    it('reads VITE_SUPABASE_URL dynamically when override argument is omitted', () => {
      vi.stubEnv('VITE_SUPABASE_URL', configuredSupabase);
      expect(
        isSafePdfUrl(
          'https://myprephubproj.supabase.co/storage/v1/object/public/papers/csc101.pdf',
          base
        )
      ).toBe(true);
      expect(
        isSafePdfUrl(
          'https://attacker-project.supabase.co/storage/v1/object/public/papers/phish.pdf',
          base
        )
      ).toBe(false);
    });

    it('rejects arbitrary *.supabase.co projects, non-HTTPS URLs, backslashes, and dangerous schemes', () => {
      const maliciousUrls = [
        'https://unrelated-other.supabase.co/storage/v1/object/public/papers/x.pdf',
        'http://myprephubproj.supabase.co/storage/v1/object/public/papers/x.pdf',
        'http://comsatsprephub.vercel.app/papers/x.pdf',
        'https://evil.example.com/malware.pdf',
        'javascript:alert(1)',
        'data:application/pdf;base64,JVBERi0=',
        '//evil.example.com/x.pdf',
        '/\\evil.example.com/x.pdf',
        '/papers/x.pdf\x00.exe',
        ''
      ];

      for (const url of maliciousUrls) {
        expect(isSafePdfUrl(url, base, configuredSupabase)).toBe(false);
      }
    });
  });

  describe('sanitizePlainText', () => {
    it('strips HTML tags, nested/malformed tags, null bytes, and control characters', () => {
      expect(
        sanitizePlainText('<script>alert(1)</script>CSC211\x00 Data Structures', 100)
      ).toBe('alert(1)CSC211 Data Structures');

      const nested = '<scr<script>ipt>alert(1)</script><img src=x onerror="alert(2)"';
      const cleaned = sanitizePlainText(nested, 200);
      expect(cleaned).not.toContain('<');
      expect(cleaned).not.toContain('>');
      expect(cleaned).not.toContain('<script');

      expect(sanitizePlainText('CSC301\x00\x07\x1B Algorithms', 50)).toBe('CSC301 Algorithms');
      expect(sanitizePlainText('A'.repeat(50), 10)).toBe('A'.repeat(10));
      expect(sanitizePlainText(null, 50)).toBe('');
    });
  });

  describe('getInitialsAvatarDataUri', () => {
    it('blocks SVG/attribute injection via name and bgColor and validates CSS hex', () => {
      const injectedUri = getInitialsAvatarDataUri(
        '<script>alert(1)</script>',
        '#1e40af" onload="alert(1)'
      );
      expect(injectedUri.startsWith('data:image/svg+xml;utf8,')).toBe(true);
      const decodedSvg = decodeURIComponent(injectedUri.slice('data:image/svg+xml;utf8,'.length));
      expect(decodedSvg).toContain('fill="#1e40af"');
      expect(decodedSvg).not.toContain('onload=');
      expect(decodedSvg).not.toContain('<script');

      const badHexUri = getInitialsAvatarDataUri('Ali Raza', 'red;background:url(javascript:alert(1))');
      expect(decodeURIComponent(badHexUri)).toContain('fill="#1e40af"');
      expect(decodeURIComponent(badHexUri)).toContain('>AR</text>');

      const validShortHex = getInitialsAvatarDataUri('Sara Khan', '#0af');
      expect(decodeURIComponent(validShortHex)).toContain('fill="#0af"');
      expect(decodeURIComponent(validShortHex)).toContain('>SK</text>');
    });
  });
});
