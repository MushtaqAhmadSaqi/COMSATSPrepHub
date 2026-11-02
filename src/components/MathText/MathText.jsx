import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import './MathText.css';

/**
 * Safely renders a LaTeX math formula using KaTeX into an HTML string.
 */
function renderKaTeX(formula, isDisplay = false) {
  try {
    return katex.renderToString(formula.trim(), {
      displayMode: isDisplay,
      throwOnError: false,
      strict: false
    });
  } catch {
    return null;
  }
}

/**
 * Auto-detects and converts common statistical and algebra expressions
 * (e.g., "- x̄ = (∑X) / n = 13.7 / 10 = 1.37" or "Sxx = ∑X^2 - (∑X)^2 / n")
 * into formatted KaTeX math so that plain text pasted from exams is rendered
 * with mathematical fractions, bars, summations, and exponents.
 */
function tryAutoFormatStatsMath(line) {
  if (!line || typeof line !== 'string') return null;

  // Check if line contains statistical or algebra notation: x̄, ȳ, ∑, Sxx, Syy, Sxy, etc.
  if (/[x̄ȳ∑]|S[xy]{2}\s*=/i.test(line)) {
    const bulletMatch = line.match(/^(\s*[-*•]\s*)(.*)$/);
    const prefix = bulletMatch ? bulletMatch[1] : '';
    const content = bulletMatch ? bulletMatch[2] : line;

    let latex = content
      .replace(/x̄/g, '\\bar{x}')
      .replace(/ȳ/g, '\\bar{y}')
      .replace(/∑/g, '\\sum ')
      .replace(/Sxx/g, 'S_{xx}')
      .replace(/Syy/g, 'S_{yy}')
      .replace(/Sxy/g, 'S_{xy}')
      .replace(/\s*\*\s*/g, ' \\times ')
      .replace(/≈/g, '\\approx ')
      .replace(/≠/g, '\\neq ')
      .replace(/≤/g, '\\le ')
      .replace(/≥/g, '\\ge ')
      .replace(/±/g, '\\pm ');

    // Convert (Expression) / denominator -> \frac{Expression}{denominator}
    latex = latex.replace(/\(([^()]+)\)\s*\/\s*([a-zA-Z0-9]+)/g, '\\frac{$1}{$2}');
    // Convert number / number e.g. 13.7 / 10 -> \frac{13.7}{10}
    latex = latex.replace(/([0-9.]+)\s*\/\s*([0-9.]+)/g, '\\frac{$1}{$2}');

    const html = renderKaTeX(latex, false);
    if (html) {
      return { prefix, html };
    }
  }

  return null;
}

/**
 * Parses inline string that may contain $...$ or \(...\) math tokens
 * as well as markdown bold (**...**) and inline code (`...`).
 */
function renderInlineWithMath(text, keyPrefix = '') {
  if (!text) return null;

  // Regex to match inline math: $...$ or \(...\)
  const mathRegex = /(\$[^\$\n]+?\$|\\\([\s\S]*?\\\))/g;
  const segments = [];
  let lastIdx = 0;
  let match;

  while ((match = mathRegex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      segments.push({
        type: 'text',
        content: text.slice(lastIdx, match.index)
      });
    }

    const raw = match[0];
    const formula = raw.startsWith('$') ? raw.slice(1, -1) : raw.slice(2, -2);
    const html = renderKaTeX(formula, false);

    if (html) {
      segments.push({ type: 'math', html });
    } else {
      segments.push({ type: 'text', content: raw });
    }

    lastIdx = match.index + raw.length;
  }

  if (lastIdx < text.length) {
    segments.push({ type: 'text', content: text.slice(lastIdx) });
  }

  return segments.map((seg, idx) => {
    const k = `${keyPrefix}-seg-${idx}`;
    if (seg.type === 'math') {
      return (
        <span
          key={k}
          className="katex-inline-math"
          dangerouslySetInnerHTML={{ __html: seg.html }}
        />
      );
    }

    // Parse simple markdown bold and code inside the text portion
    const inlineParts = [];
    const inlineRegex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let textLast = 0;
    let tMatch;

    while ((tMatch = inlineRegex.exec(seg.content)) !== null) {
      if (tMatch.index > textLast) {
        inlineParts.push(seg.content.slice(textLast, tMatch.index));
      }
      const tok = tMatch[0];
      if (tok.startsWith('`')) {
        inlineParts.push(
          <code key={`${k}-code-${tMatch.index}`} className="math-inline-code">
            {tok.slice(1, -1)}
          </code>
        );
      } else if (tok.startsWith('**')) {
        inlineParts.push(
          <strong key={`${k}-bold-${tMatch.index}`} className="math-bold-text">
            {tok.slice(2, -2)}
          </strong>
        );
      } else {
        inlineParts.push(
          <em key={`${k}-em-${tMatch.index}`}>{tok.slice(1, -1)}</em>
        );
      }
      textLast = tMatch.index + tok.length;
    }

    if (textLast < seg.content.length) {
      inlineParts.push(seg.content.slice(textLast));
    }

    return <React.Fragment key={k}>{inlineParts}</React.Fragment>;
  });
}

/**
 * Universal Math and Markdown text renderer for university exam papers.
 * Renders:
 * - Piecewise functions: $$f(x) = \begin{cases} ... \end{cases}$$
 * - Display equations: $$ ... $$ and \[ ... \]
 * - Inline math: $ ... $ and \( ... \)
 * - Auto-detected statistical formulas: x̄, ȳ, ∑, Sxx, Syy, Sxy
 * - Numbered steps, bullet lists, bold text, code blocks
 */
export default function MathText({ text, className = '' }) {
  const renderedElements = useMemo(() => {
    if (!text || typeof text !== 'string') return null;

    // Normalize newlines
    const raw = text.replace(/\\n/g, '\n');
    const lines = raw.split(/\r?\n/);

    const elements = [];
    let listBuffer = null;

    const flushList = () => {
      if (!listBuffer) return;
      const Tag = listBuffer.type;
      elements.push(
        <Tag key={`list-${elements.length}`} className="math-list-wrap">
          {listBuffer.items}
        </Tag>
      );
      listBuffer = null;
    };

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        flushList();
        i++;
        continue;
      }

      // 1. Check for standalone display math: $$...$$ or \[...\]
      const displayBlockMatch = trimmed.match(/^(\$\$|\\\[)([\s\S]*?)(\$\$|\\\])$/);
      if (displayBlockMatch) {
        flushList();
        const formula = displayBlockMatch[2];
        const html = renderKaTeX(formula, true);
        elements.push(
          <div
            key={`math-disp-${i}`}
            className="math-display-container"
            dangerouslySetInnerHTML={{ __html: html || formula }}
          />
        );
        i++;
        continue;
      }

      // 1b. Check for raw LaTeX piecewise environment like \begin{cases} ... \end{cases}
      if (/^f\(x\)\s*=\s*\\begin\{cases\}|\\begin\{(cases|matrix|aligned|array)\}/.test(trimmed)) {
        flushList();
        const html = renderKaTeX(trimmed, true);
        elements.push(
          <div
            key={`math-raw-env-${i}`}
            className="math-display-container"
            dangerouslySetInnerHTML={{ __html: html || trimmed }}
          />
        );
        i++;
        continue;
      }

      // 2. Check for step or section headings (e.g. "Step 1: ...", "### Heading")
      const stepMatch = trimmed.match(/^(Step\s*\d+\s*:|Task\s*\d+\s*:|Question\s*\d+\s*:|###+)\s*(.*)$/i);
      if (stepMatch) {
        flushList();
        elements.push(
          <div key={`step-heading-${i}`} className="math-step-heading">
            <span className="step-tag-pill">{stepMatch[1].replace(/#+/g, '').trim()}</span>
            <span className="step-tag-title">{renderInlineWithMath(stepMatch[2], `step-text-${i}`)}</span>
          </div>
        );
        i++;
        continue;
      }

      // 3. Check for bullet list items: "- ...", "* ...", "• ..."
      const bulletMatch = trimmed.match(/^([-*•])\s+(.*)$/);
      if (bulletMatch) {
        if (!listBuffer || listBuffer.type !== 'ul') {
          flushList();
          listBuffer = { type: 'ul', items: [] };
        }

        const bulletContent = bulletMatch[2];
        const autoMath = tryAutoFormatStatsMath(bulletContent);

        if (autoMath) {
          listBuffer.items.push(
            <li key={`li-${i}`} className="math-list-item">
              <span
                className="katex-auto-math"
                dangerouslySetInnerHTML={{ __html: autoMath.html }}
              />
            </li>
          );
        } else {
          listBuffer.items.push(
            <li key={`li-${i}`} className="math-list-item">
              {renderInlineWithMath(bulletContent, `li-math-${i}`)}
            </li>
          );
        }

        i++;
        continue;
      }

      // 4. Check for numbered list items: "1. ...", "2) ..."
      const numMatch = trimmed.match(/^(\d+[\.\)])\s+(.*)$/);
      if (numMatch) {
        if (!listBuffer || listBuffer.type !== 'ol') {
          flushList();
          listBuffer = { type: 'ol', items: [] };
        }

        const numContent = numMatch[2];
        const autoMath = tryAutoFormatStatsMath(numContent);

        if (autoMath) {
          listBuffer.items.push(
            <li key={`oli-${i}`} className="math-list-item">
              <span
                className="katex-auto-math"
                dangerouslySetInnerHTML={{ __html: autoMath.html }}
              />
            </li>
          );
        } else {
          listBuffer.items.push(
            <li key={`oli-${i}`} className="math-list-item">
              {renderInlineWithMath(numContent, `oli-math-${i}`)}
            </li>
          );
        }

        i++;
        continue;
      }

      // 5. Normal paragraph (check if entire line is an auto-math statistical line)
      flushList();
      const autoMath = tryAutoFormatStatsMath(trimmed);
      if (autoMath) {
        elements.push(
          <div key={`p-auto-${i}`} className="math-paragraph-math-line">
            <span
              className="katex-auto-math"
              dangerouslySetInnerHTML={{ __html: autoMath.html }}
            />
          </div>
        );
      } else {
        elements.push(
          <p key={`p-${i}`} className="math-paragraph">
            {renderInlineWithMath(trimmed, `p-math-${i}`)}
          </p>
        );
      }

      i++;
    }

    flushList();
    return elements;
  }, [text]);

  return <div className={`math-text-container ${className}`}>{renderedElements}</div>;
}

