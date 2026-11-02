import React, { useState, useEffect, useMemo, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import './MathText.css';

// Lazy-load and initialize mermaid with strict security only when a diagram is rendered
let mermaidPromise = null;
async function getMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((m) => {
      const instance = m.default || m;
      instance.initialize({
        startOnLoad: false,
        theme: 'neutral',
        securityLevel: 'strict',
        fontFamily: 'Inter, system-ui, sans-serif'
      });
      return instance;
    });
  }
  return mermaidPromise;
}

/**
 * Recovers LaTeX commands that were accidentally turned into ASCII control characters
 * (\b -> \x08, \t -> \x09, \f -> \x0C, \r -> \x0D) by unescaped JSON.parse.
 */
export function recoverControlCharLatex(input) {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/\x0C(rac|orall|lat|box)\b/g, '\\f$1')
    .replace(/\x09(extbf|extit|extrm|exttt|ext|imes|heta|au|ilde|o|op|riangle)\b/g, '\\t$1')
    .replace(/\x08(egin|ar|eta|inom|ig|igg|ackslash|ot|owtie|ullet)\b/g, '\\b$1')
    .replace(/\x0D(ightarrow|ight|ho|angle|ceil|floor)\b/g, '\\r$1');
}

/**
 * Safely renders a LaTeX math formula using KaTeX into an HTML string.
 */
export function renderKaTeX(formula, isDisplay = false) {
  try {
    const recovered = recoverControlCharLatex(String(formula || ''));
    const normalizedFormula = recovered
      .trim()
      // Strip accidental outer $ delimiters if passed inside
      .replace(/^\$+|\$+$/g, '')
      // Escape unescaped % signs inside math mode (e.g. 10.2% -> 10.2\%)
      .replace(/(?<!\\)%/g, '\\%')
      // Normalize double-escaped LaTeX commands (e.g. \\frac -> \frac) while keeping row breaks \\
      .replace(/\\\\(?=[A-Za-z])/g, '\\');

    return katex.renderToString(normalizedFormula, {
      displayMode: isDisplay,
      throwOnError: true,
      strict: false
    });
  } catch {
    return null;
  }
}

/**
 * Auto-detects and converts plain-text statistical expressions that do NOT already use $...$
 * (e.g., "x̄ = (∑X) / n = 13.7 / 10 = 1.37" or "Sxx = ∑X^2 - (∑X)^2 / n")
 * into formatted KaTeX math.
 *
 * CRITICAL FIX: Never use /[x̄ȳ∑]/i (character class with combining macron matches every ASCII 'x' and 'y'!).
 * Never run on lines that already contain '$' or '\' LaTeX commands or long English prose sentences.
 */
export function tryAutoFormatStatsMath(line) {
  if (!line || typeof line !== 'string') return null;

  // Never hijack lines that already contain LaTeX delimiters or backslash commands
  if (line.includes('$') || line.includes('\\')) return null;

  // Never hijack normal English sentences (4+ consecutive words of 3+ letters)
  if (/\b[A-Za-z]{3,}\s+[A-Za-z]{3,}\s+[A-Za-z]{3,}\s+[A-Za-z]{3,}\b/.test(line)) {
    return null;
  }

  // Match explicit Unicode x-bar (x + U+0304), y-bar (y + U+0304 or U+0233), summation (\u2211), or Sxx/Syy/Sxy =
  const hasStatsToken = /(?:x\u0304|y\u0304|\u0233|\u2211|\bS(?:xx|yy|xy)\s*=)/i.test(line);
  if (!hasStatsToken) return null;

  const bulletMatch = line.match(/^(\s*[-*•]\s*)(.*)$/);
  const prefix = bulletMatch ? bulletMatch[1] : '';
  const content = bulletMatch ? bulletMatch[2] : line;

  let latex = content
    .replace(/x\u0304/g, '\\bar{x}')
    .replace(/y\u0304|\u0233/g, '\\bar{y}')
    .replace(/\u2211/g, '\\sum ')
    .replace(/\bSxx\b/g, 'S_{xx}')
    .replace(/\bSyy\b/g, 'S_{yy}')
    .replace(/\bSxy\b/g, 'S_{xy}')
    .replace(/\s*\*\s*/g, ' \\times ')
    .replace(/≈/g, '\\approx ')
    .replace(/≠/g, '\\neq ')
    .replace(/≤/g, '\\le ')
    .replace(/≥/g, '\\ge ')
    .replace(/±/g, '\\pm ');

  latex = latex.replace(/\(([^()]+)\)\s*\/\s*([a-zA-Z0-9]+)/g, '\\frac{$1}{$2}');
  latex = latex.replace(/([0-9.]+)\s*\/\s*([0-9.]+)/g, '\\frac{$1}{$2}');

  const html = renderKaTeX(latex, false);
  if (html && !html.includes('katex-error')) {
    return { prefix, html };
  }

  return null;
}

/**
 * Parses inline string that may contain $$...$$, $...$, \[...\], or \(...\) math tokens
 * as well as markdown bold (**...**), \textbf{...}, and inline code (`...`).
 */
function renderInlineWithMath(rawText, keyPrefix = '') {
  if (!rawText) return null;
  const text = recoverControlCharLatex(String(rawText));

  const mathRegex = /(\$\$[^\$\n]+?\$\$|\\\[[\s\S]*?\\\]|\$[^\$\n]+?\$|\\\([\s\S]*?\\\))/g;
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
    const isDisplay = raw.startsWith('$$') || raw.startsWith('\\[');
    const formula = raw.startsWith('$$') || raw.startsWith('\\(') || raw.startsWith('\\[')
      ? raw.slice(2, -2)
      : raw.slice(1, -1);
    const html = renderKaTeX(formula, isDisplay);

    if (html) {
      segments.push({ type: 'math', html, isDisplay });
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
          className={seg.isDisplay ? 'katex-inline-display' : 'katex-inline-math'}
          dangerouslySetInnerHTML={{ __html: seg.html }}
        />
      );
    }

    const inlineParts = [];
    const inlineRegex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*\n]+\*|\\textbf\{[^{}]*\}|\\textit\{[^{}]*\}|\\text\{[^{}]*\}|\\rightarrow\b|\\leftarrow\b|\\Rightarrow\b|\\approx\b|\\neq\b|\\le\b|\\ge\b|\\times\b)/g;
    let textLast = 0;
    let tMatch;

    const symbolMap = {
      '\\rightarrow': '→',
      '\\leftarrow': '←',
      '\\Rightarrow': '⇒',
      '\\approx': '≈',
      '\\neq': '≠',
      '\\le': '≤',
      '\\ge': '≥',
      '\\times': '×'
    };

    while ((tMatch = inlineRegex.exec(seg.content)) !== null) {
      if (tMatch.index > textLast) {
        inlineParts.push(seg.content.slice(textLast, tMatch.index));
      }
      const tok = tMatch[0];
      if (symbolMap[tok]) {
        inlineParts.push(symbolMap[tok]);
      } else if (tok.startsWith('`')) {
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
      } else if (tok.startsWith('\\textbf{')) {
        inlineParts.push(
          <strong key={`${k}-latex-bold-${tMatch.index}`} className="math-bold-text">
            {tok.slice(8, -1)}
          </strong>
        );
      } else if (tok.startsWith('\\textit{')) {
        inlineParts.push(
          <em key={`${k}-latex-italic-${tMatch.index}`}>{tok.slice(8, -1)}</em>
        );
      } else if (tok.startsWith('\\text{')) {
        inlineParts.push(tok.slice(6, -1));
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

    getMermaid()
      .then((mermaid) => mermaid.render(uniqueId, chart.trim()))
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
 */
export default function MathText({ text, className = '' }) {
  const renderedElements = useMemo(() => {
    if (!text || typeof text !== 'string') return null;

    const raw = recoverControlCharLatex(text).replace(/\\n/g, '\n');
    const lines = raw.split(/\r?\n/);

    const elements = [];
    let listBuffer = null;
    let tableBuffer = null;
    let codeBuffer = null;

    const flushList = () => {
      if (!listBuffer) return;
      const Tag = listBuffer.type;
      elements.push(
        <Tag key={`list-${elements.length}`} className={`math-list-wrap ${listBuffer.className || ''}`}>
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

      // Skip redundant leading CLO / Marks line if it just repeats card metadata (e.g. "CLO 1 (5 Marks)" on line 0)
      if (i === 0 && /^\[?\s*CLO[-\s]*\d+\s*(?:[\(\[,-]\s*\d+\s*Marks\s*[\)\]]?)?\s*$/i.test(trimmed)) {
        i++;
        continue;
      }

      // Check code block fence ```lang
      if (trimmed.startsWith('```')) {
        flushList();
        flushTable();

        if (codeBuffer) {
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

      // Collect multi-line display equations ($$ ... $$ or \[ ... \])
      if ((trimmed.startsWith('$$') || trimmed.startsWith('\\[')) && !(trimmed.startsWith('$$') && trimmed.slice(2).includes('$$') && trimmed.slice(2).indexOf('$$') < trimmed.slice(2).length - 2)) {
        const delimiter = trimmed.startsWith('$$') ? '$$' : '\\[';
        const closingDelimiter = delimiter === '$$' ? '$$' : '\\]';
        const afterOpen = trimmed.slice(delimiter.length);
        const formulaLines = [afterOpen];
        let foundClosingDelimiter = afterOpen.includes(closingDelimiter);

        while (!foundClosingDelimiter && i + 1 < lines.length) {
          i++;
          const nextLine = lines[i];
          const closingIndex = nextLine.indexOf(closingDelimiter);
          if (closingIndex >= 0) {
            formulaLines.push(nextLine.slice(0, closingIndex));
            foundClosingDelimiter = true;
          } else {
            formulaLines.push(nextLine);
          }
        }

        if (foundClosingDelimiter) {
          const formula = formulaLines.join('\n').replace(new RegExp(`${closingDelimiter.replace(/[\\$]/g, '\\$&')}\\s*$`), '');
          flushList();
          flushTable();
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
      if (/^f\(x\)\s*=\s*\\begin\{cases\}|^\\begin\{(cases|matrix|pmatrix|bmatrix|aligned|array)\}/.test(trimmed)) {
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

      // 2. Final Answer / Conclusion Callout (Green Highlight Card) — supports "Final Answer (Part 1):"
      const finalAnsMatch = trimmed.match(/^\**(Final Answer(?:\s*\([^)]*\))?\s*:|Conclusion(?:\s*\([^)]*\))?\s*:|Result(?:\s*\([^)]*\))?\s*:)\**\s*(.*)$/i);
      if (finalAnsMatch) {
        flushList();
        elements.push(
          <div key={`final-ans-${i}`} className="math-final-answer-card">
            <div className="final-ans-header">
              <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
              <span>{finalAnsMatch[1].replace(/[:*]/g, '').trim()}</span>
            </div>
            <div className="final-ans-body">
              {renderInlineWithMath(finalAnsMatch[2], `final-text-${i}`)}
            </div>
          </div>
        );
        i++;
        continue;
      }

      // 3. Formula / Definition / Rule Callout (Purple / Indigo Badge)
      const formulaMatch = trimmed.match(/^\**(Formula(?:\s*\([^)]*\))?\s*:|Definition\s*:|Theorem\s*:|Given Data\s*:|Rule\s*:)\**\s*(.*)$/i);
      if (formulaMatch) {
        flushList();
        elements.push(
          <div key={`formula-badge-${i}`} className="math-formula-callout">
            <span className="formula-tag-pill">{formulaMatch[1].replace(/[:*]/g, '').trim()}</span>
            <span className="formula-tag-body">{renderInlineWithMath(formulaMatch[2], `formula-text-${i}`)}</span>
          </div>
        );
        i++;
        continue;
      }

      // 4. Note / Warning / Important Callout (Amber Alert Card)
      const noteMatch = trimmed.match(/^\**(Note\s*:|Important\s*:|Warning\s*:|Caution\s*:|Tip\s*:)\**\s*(.*)$/i);
      if (noteMatch) {
        flushList();
        elements.push(
          <div key={`note-card-${i}`} className="math-note-callout">
            <span className="material-symbols-outlined note-icon" aria-hidden="true">info</span>
            <div>
              <strong>{noteMatch[1].replace(/\*/g, '').trim()} </strong>
              <span>{renderInlineWithMath(noteMatch[2], `note-text-${i}`)}</span>
            </div>
          </div>
        );
        i++;
        continue;
      }

      // 5. Step or Task Headings (e.g. "Step 1: Compute Means", "Part (a):", "### Heading")
      const stepMatch = trimmed.match(/^\**(Step\s*\d+(?:\s*\([^)]*\))?\s*:|Task\s*\d+(?:\s*\([^)]*\))?\s*:|Question\s*\d+\s*:|###+)\**\s*(.*)$/i);
      if (stepMatch) {
        flushList();
        elements.push(
          <div key={`step-heading-${i}`} className="math-step-heading">
            <span className="step-tag-pill">{stepMatch[1].replace(/[#*]/g, '').trim()}</span>
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

      // 7. Numbered, Lettered (a., b., c.), or Roman Numeral (i., ii., iii., iv.) sub-lists
      const subItemMatch = trimmed.match(/^(\d+[\.\)]|[a-z][\.\)]|\([a-z0-9]+\)|(?:i|ii|iii|iv|v|vi|vii|viii|ix|x)[\.\)])\s+(.*)$/i);
      if (subItemMatch) {
        const marker = subItemMatch[1];
        const subContent = subItemMatch[2];
        const isNumeric = /^\d/.test(marker);

        if (isNumeric) {
          if (!listBuffer || listBuffer.type !== 'ol') {
            flushList();
            listBuffer = { type: 'ol', items: [] };
          }
          listBuffer.items.push(
            <li key={`oli-${i}`} className="math-list-item">
              {renderInlineWithMath(subContent, `oli-math-${i}`)}
            </li>
          );
        } else {
          flushList();
          elements.push(
            <div key={`subpart-${i}`} className="math-subpart-row">
              <span className="math-subpart-badge">{marker}</span>
              <div className="math-subpart-content">
                {renderInlineWithMath(subContent, `subpart-math-${i}`)}
              </div>
            </div>
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
