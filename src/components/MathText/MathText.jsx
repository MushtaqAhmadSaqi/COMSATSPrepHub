import React, { useState, useEffect, useMemo, useRef } from 'react';
import katex from 'katex';
import mermaid from 'mermaid';
import 'katex/dist/katex.min.css';
import './MathText.css';

// Initialize mermaid once safely on client
if (typeof window !== 'undefined') {
  try {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'neutral',
      securityLevel: 'loose',
      fontFamily: 'Inter, system-ui, sans-serif'
    });
  } catch {
    // Ignore init errors
  }
}

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

    latex = latex.replace(/\(([^()]+)\)\s*\/\s*([a-zA-Z0-9]+)/g, '\\frac{$1}{$2}');
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
 * Component to render a Mermaid diagram SVG cleanly with fallback.
 */
function MermaidDiagram({ chart }) {
  const containerRef = useRef(null);
  const [svgContent, setSvgContent] = useState('');
  const [renderFailed, setRenderFailed] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const uniqueId = `mermaid-svg-${Math.random().toString(36).slice(2, 9)}`;

    mermaid
      .render(uniqueId, chart.trim())
      .then(({ svg }) => {
        if (isMounted) {
          setSvgContent(svg);
          setRenderFailed(false);
        }
      })
      .catch(() => {
        if (isMounted) setRenderFailed(true);
      });

    return () => {
      isMounted = false;
    };
  }, [chart]);

  if (renderFailed) {
    return (
      <div className="diagram-box">
        <div className="diagram-header">
          <span className="material-symbols-outlined" aria-hidden="true">account_tree</span>
          <span>System Diagram (Source View)</span>
        </div>
        <pre className="diagram-code">{chart}</pre>
      </div>
    );
  }

  return (
    <div className="diagram-box" ref={containerRef}>
      <div className="diagram-header">
        <span className="material-symbols-outlined" aria-hidden="true">schema</span>
        <span>Interactive System Diagram / Architecture</span>
      </div>
      <div
        className="mermaid-svg-container"
        dangerouslySetInnerHTML={{ __html: svgContent || '<div class="diagram-loading">Generating diagram...</div>' }}
      />
    </div>
  );
}

/**
 * Component to render syntax-styled code blocks with copy functionality.
 */
function CodeBlock({ code, language = '' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore
    }
  };

  const isDiagramText = language === 'diagram' || language === 'text' || language === 'ascii';

  return (
    <div className={`code-block-card ${isDiagramText ? 'is-ascii-diagram' : ''}`}>
      <div className="code-block-header">
        <span className="code-lang-tag">
          <span className="material-symbols-outlined" aria-hidden="true">
            {isDiagramText ? 'account_tree' : 'code'}
          </span>
          {language ? language.toUpperCase() : 'SOURCE CODE'}
        </span>
        <button
          type="button"
          className="btn-copy-code"
          onClick={handleCopy}
          title="Copy to clipboard"
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {copied ? 'check' : 'content_copy'}
          </span>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="code-content">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/**
 * Component to render a full Markdown Table with KaTeX-enabled cells.
 */
function MarkdownTable({ lines }) {
  if (!lines || lines.length < 2) return null;

  const parseCells = (line) =>
    line
      .split('|')
      .map((c) => c.trim())
      .filter((c, idx, arr) => (idx > 0 && idx < arr.length - 1) || c.length > 0);

  const headers = parseCells(lines[0]);
  const alignTokens = parseCells(lines[1]);
  const alignments = alignTokens.map((t) => {
    const left = t.startsWith(':');
    const right = t.endsWith(':');
    if (left && right) return 'center';
    if (right) return 'right';
    return 'left';
  });

  const rows = [];
  for (let i = 2; i < lines.length; i++) {
    const cells = parseCells(lines[i]);
    if (cells.length > 0) {
      rows.push(cells);
    }
  }

  return (
    <div className="table-wrapper-card">
      <div className="table-scroll-container">
        <table className="math-table">
          <thead>
            <tr>
              {headers.map((h, hIdx) => (
                <th
                  key={hIdx}
                  style={{ textAlign: alignments[hIdx] || 'left' }}
                >
                  {renderInlineWithMath(h, `th-${hIdx}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIdx) => (
              <tr key={rIdx}>
                {row.map((cell, cIdx) => (
                  <td
                    key={cIdx}
                    style={{ textAlign: alignments[cIdx] || 'left' }}
                  >
                    {renderInlineWithMath(cell, `td-${rIdx}-${cIdx}`)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Universal Math, Table, Diagram, and Markdown text renderer for university exam papers.
 * Renders:
 * - Piecewise functions: $$f(x) = \begin{cases} ... \end{cases}$$
 * - Display equations: $$ ... $$ and \[ ... \]
 * - Inline math: $ ... $ and \( ... \)
 * - Markdown tables with KaTeX math cells: | Col 1 | Col 2 |
 * - Mermaid diagrams: ```mermaid ... ```
 * - Code and ASCII diagrams: ```cpp ... ``` or ```text ... ```
 * - Auto-detected statistical formulas: x̄, ȳ, ∑, Sxx, Syy, Sxy
 * - Colorful callouts: Final Answer (green), Step (indigo), Formula (purple), Note/Alert (amber)
 */
export default function MathText({ text, className = '' }) {
  const renderedElements = useMemo(() => {
    if (!text || typeof text !== 'string') return null;

    const raw = text.replace(/\\n/g, '\n');
    const lines = raw.split(/\r?\n/);

    const elements = [];
    let listBuffer = null;
    let tableBuffer = null;
    let codeBuffer = null;

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

    const flushTable = () => {
      if (!tableBuffer) return;
      elements.push(
        <MarkdownTable
          key={`table-${elements.length}`}
          lines={tableBuffer}
        />
      );
      tableBuffer = null;
    };

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // Check code block fence ```lang
      if (trimmed.startsWith('```')) {
        flushList();
        flushTable();

        if (codeBuffer) {
          // Closing code block
          const { lang, codeLines } = codeBuffer;
          const fullCode = codeLines.join('\n');

          if (lang.toLowerCase() === 'mermaid') {
            elements.push(
              <MermaidDiagram
                key={`mermaid-${elements.length}`}
                chart={fullCode}
              />
            );
          } else {
            elements.push(
              <CodeBlock
                key={`code-${elements.length}`}
                code={fullCode}
                language={lang}
              />
            );
          }
          codeBuffer = null;
        } else {
          // Opening code block
          const lang = trimmed.slice(3).trim();
          codeBuffer = { lang, codeLines: [] };
        }
        i++;
        continue;
      }

      if (codeBuffer) {
        codeBuffer.codeLines.push(line);
        i++;
        continue;
      }

      // Check table lines starting with |
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        flushList();
        if (!tableBuffer) {
          tableBuffer = [];
        }
        tableBuffer.push(trimmed);
        i++;
        continue;
      } else if (tableBuffer) {
        flushTable();
      }

      if (!trimmed) {
        flushList();
        i++;
        continue;
      }

      // 1. Standalone display math: $$...$$ or \[...\]
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

      // 1b. Raw LaTeX piecewise environment like \begin{cases} ... \end{cases}
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

      // 2. Final Answer / Conclusion Callout (Green Highlight Card)
      const finalAnsMatch = trimmed.match(/^(Final Answer\s*:|Conclusion\s*:|Result\s*:)\s*(.*)$/i);
      if (finalAnsMatch) {
        flushList();
        elements.push(
          <div key={`final-ans-${i}`} className="math-final-answer-card">
            <div className="final-ans-header">
              <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
              <span>{finalAnsMatch[1].replace(/:/, '').trim()}</span>
            </div>
            <div className="final-ans-body">
              {renderInlineWithMath(finalAnsMatch[2], `final-text-${i}`)}
            </div>
          </div>
        );
        i++;
        continue;
      }

      // 3. Formula / Definition / Rule Callout (Purple / Blue Badge)
      const formulaMatch = trimmed.match(/^(Formula\s*:|Definition\s*:|Theorem\s*:|Given Data\s*:|Rule\s*:)\s*(.*)$/i);
      if (formulaMatch) {
        flushList();
        elements.push(
          <div key={`formula-badge-${i}`} className="math-formula-callout">
            <span className="formula-tag-pill">{formulaMatch[1].replace(/:/, '').trim()}</span>
            <span className="formula-tag-body">{renderInlineWithMath(formulaMatch[2], `formula-text-${i}`)}</span>
          </div>
        );
        i++;
        continue;
      }

      // 4. Note / Warning / Important Callout (Amber Alert Card)
      const noteMatch = trimmed.match(/^(Note\s*:|Important\s*:|Warning\s*:|Caution\s*:|Tip\s*:)\s*(.*)$/i);
      if (noteMatch) {
        flushList();
        elements.push(
          <div key={`note-card-${i}`} className="math-note-callout">
            <span className="material-symbols-outlined note-icon" aria-hidden="true">info</span>
            <div>
              <strong>{noteMatch[1].trim()} </strong>
              <span>{renderInlineWithMath(noteMatch[2], `note-text-${i}`)}</span>
            </div>
          </div>
        );
        i++;
        continue;
      }

      // 5. Step or Task Headings (e.g. "Step 1: Compute Means")
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

      // 6. Bullet lists: "- ...", "* ...", "• ..."
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

      // 7. Numbered lists: "1. ...", "2) ..."
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

      // 8. Normal paragraph / Auto-math line
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
    flushTable();
    return elements;
  }, [text]);

  return <div className={`math-text-container ${className}`}>{renderedElements}</div>;
}
