import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';

const { initializeSpy, renderSpy } = vi.hoisted(() => ({
  initializeSpy: vi.fn(),
  renderSpy: vi.fn()
}));

vi.mock('mermaid', () => ({
  default: {
    initialize: (...args) => initializeSpy(...args),
    render: (...args) => renderSpy(...args)
  }
}));

import MathText, { renderKaTeX } from '../../src/components/MathText/MathText.jsx';

describe('Suite B — KaTeX & Mermaid XSS / DoS Defense (SEC-02)', () => {
  beforeEach(() => {
    initializeSpy.mockClear();
    renderSpy.mockReset();
  });

  describe('KaTeX trust:false & macro expansion DoS protection', () => {
    it('renders legitimate math formulas cleanly', () => {
      const html = renderKaTeX('\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}', true);
      expect(typeof html).toBe('string');
      expect(html).toContain('katex');
    });

    it('blocks javascript: URIs, \\href, and untrusted external resources via trust: false', () => {
      const hrefResult = renderKaTeX('\\href{javascript:alert(1)}{click}', false);
      if (hrefResult) {
        const probe = document.createElement('div');
        probe.innerHTML = hrefResult;
        expect(probe.querySelector('a')).toBeNull();
        expect(hrefResult.toLowerCase()).not.toContain('href=');
      }

      const htmlClassResult = renderKaTeX('\\htmlClass{evil}{x}', false);
      if (htmlClassResult) {
        expect(htmlClassResult).not.toContain('class="evil"');
      }

      const imgResult = renderKaTeX('\\includegraphics{https://evil.example/track.png}', false);
      if (imgResult) {
        const imgProbe = document.createElement('div');
        imgProbe.innerHTML = imgResult;
        expect(imgProbe.querySelector('img')).toBeNull();
        expect(imgProbe.querySelector('.katex-html')?.textContent || '').not.toContain(
          'evil.example'
        );
      }
    });

    it('terminates exponential/recursive macro expansion DoS safely via maxExpand: 1000', () => {
      const recursiveResult = renderKaTeX('\\def\\x{\\x\\x}\\x', false);
      expect(recursiveResult).toBeNull();
    });
  });

  describe('MathText HTML/XSS neutralization', () => {
    it('never injects raw script or event-handler HTML elements into the DOM', () => {
      const payload =
        'Question: Solve $x^2 - 4 = 0$. <script>window.__xss = 1;</script><img src=x onerror="alert(1)">';
      const { container } = render(<MathText text={payload} />);

      expect(container.querySelector('script')).toBeNull();
      expect(container.querySelector('img')).toBeNull();
      expect(container.querySelector('[onerror]')).toBeNull();
      expect(window.__xss).toBeUndefined();
      expect(container.innerHTML).toContain('&lt;script&gt;');
      expect(container.querySelector('.katex')).not.toBeNull();
    });

    it('renders malicious display math safely as text fallback rather than executing HTML', () => {
      const payload = '$$\n<img src=x onerror=alert(1)>\n$$';
      const { container } = render(<MathText text={payload} />);

      expect(container.querySelector('img')).toBeNull();
      expect(container.innerHTML).not.toContain('<img');
    });
  });

  describe('Mermaid SVG sanitization with DOMPurify & strict mode', () => {
    it('strips <script>, inline event handlers, and foreign payloads from Mermaid SVG output', async () => {
      renderSpy.mockResolvedValue({
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40"><rect width="100" height="40"/><script>alert(1)</script><g onclick="alert(2)"><a href="javascript:alert(3)"><text x="10" y="20">Process Node</text></a></g></svg>'
      });

      const chartInput = '```mermaid\ngraph TD;\n  A[Start] --> B[End];\n```';
      const { container } = render(<MathText text={chartInput} />);

      await waitFor(() => {
        expect(container.querySelector('.mermaid-svg-container svg')).not.toBeNull();
      });

      expect(initializeSpy).toHaveBeenCalledWith(
        expect.objectContaining({ securityLevel: 'strict' })
      );
      expect(renderSpy).toHaveBeenCalledTimes(1);
      const passedId = renderSpy.mock.calls[0][0];
      expect(passedId).toMatch(/^mermaid-svg-[A-Za-z0-9_-]+$/);

      const svgHtml = container.querySelector('.mermaid-svg-container').innerHTML;
      expect(svgHtml).not.toContain('<script');
      expect(svgHtml).not.toContain('onclick');
      expect(svgHtml.toLowerCase()).not.toContain('javascript:');
      expect(svgHtml).toContain('Process Node');
    });
  });
});
