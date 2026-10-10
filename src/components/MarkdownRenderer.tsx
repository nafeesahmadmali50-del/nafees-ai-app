import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { copyToClipboard } from '../services/clipboard';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  // Parse content into blocks: code blocks and standard text blocks
  const blocks = React.useMemo(() => {
    const rawBlocks: Array<{ type: 'code' | 'text'; lang?: string; code?: string; text?: string }> = [];
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        rawBlocks.push({
          type: 'text',
          text: content.substring(lastIndex, match.index),
        });
      }
      rawBlocks.push({
        type: 'code',
        lang: match[1] || 'text',
        code: match[2].trimEnd(),
      });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      rawBlocks.push({
        type: 'text',
        text: content.substring(lastIndex),
      });
    }

    return rawBlocks;
  }, [content]);

  return (
    <div className="space-y-3 text-[14.5px] leading-relaxed text-slate-100 break-words font-normal">
      {blocks.map((block, idx) => {
        if (block.type === 'code' && block.code !== undefined) {
          return <CodeBlock key={idx} language={block.lang || 'code'} code={block.code} />;
        }
        return <TextBlock key={idx} text={block.text || ''} />;
      })}
    </div>
  );
};

const CodeBlock: React.FC<{ language: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(code);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-cyan-500/25 bg-[#090d16] shadow-lg">
      <div className="flex items-center justify-between border-b border-slate-800/80 bg-[#0d1322] px-3.5 py-2 text-xs font-mono text-cyan-400">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="h-2 w-2 rounded-full bg-cyan-400/80 animate-pulse"></span>
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-slate-300 hover:bg-cyan-500/10 hover:text-cyan-300 transition-colors active:scale-95"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-sans">कॉपी हो गया!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span className="font-sans">Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="overflow-x-auto p-3.5 font-mono text-[13px] leading-relaxed text-cyan-100 bg-[#060a14]">
        <pre className="selection:bg-cyan-600/40">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};

const TextBlock: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');

  return (
    <div className="space-y-2">
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={lineIdx} className="h-1.5" />;
        }

        // Horizontal rules combined with headings e.g. ---### Step 1
        const hrHeadingMatch = trimmed.match(/^[-*_]{3,}\s*(#{1,6})\s*(.*)/);
        if (hrHeadingMatch) {
          const level = hrHeadingMatch[1].length;
          const content = hrHeadingMatch[2];
          return (
            <div key={lineIdx} className="space-y-2 my-2.5">
              <hr className="border-t border-cyan-500/20" />
              {renderHeadingElement(level, content, lineIdx)}
            </div>
          );
        }

        // Standalone Horizontal rules: ---, ***, ___
        if (/^(\-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
          return <hr key={lineIdx} className="border-t border-cyan-500/20 my-2.5" />;
        }

        // Headings inside bullet or numbered list items e.g. * ### Step 1 or 1. #### Heading
        const listHeadingMatch = trimmed.match(/^([\*\-\+]|\d+\.)\s+(#{1,6})\s+(.*)/);
        if (listHeadingMatch) {
          const level = listHeadingMatch[2].length;
          const headingContent = listHeadingMatch[3];
          return renderHeadingElement(level, headingContent, lineIdx);
        }

        // Comprehensive Headings: # through ######
        const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)/);
        if (headingMatch) {
          const level = headingMatch[1].length;
          const headingContent = headingMatch[2];
          return renderHeadingElement(level, headingContent, lineIdx);
        }

        // Blockquote
        if (line.startsWith('> ') || trimmed.startsWith('> ')) {
          const quoteText = trimmed.startsWith('> ') ? trimmed.slice(2) : line.slice(2);
          return (
            <blockquote key={lineIdx} className="border-l-2 border-cyan-500/60 pl-3 py-1 my-1.5 italic text-slate-300 bg-cyan-950/20 rounded-r-md">
              {renderFormattedInline(quoteText)}
            </blockquote>
          );
        }

        // Unordered list
        if (/^[\*\-\+]\s/.test(trimmed)) {
          const listText = trimmed.replace(/^[\*\-\+]\s+/, '');
          return (
            <div key={lineIdx} className="flex items-start gap-2.5 ml-1.5 my-1">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400/90 shadow-[0_0_6px_#06b6d4]"></span>
              <span className="text-slate-200">{renderFormattedInline(listText)}</span>
            </div>
          );
        }

        // Numbered list
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={lineIdx} className="flex items-start gap-2.5 ml-1.5 my-1">
              <span className="shrink-0 font-mono text-xs font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-1.5 py-0.5 rounded">
                {numMatch[1]}
              </span>
              <span className="text-slate-200">{renderFormattedInline(numMatch[2])}</span>
            </div>
          );
        }

        // Regular paragraph line
        return (
          <p key={lineIdx} className="text-slate-200 leading-relaxed">
            {renderFormattedInline(line)}
          </p>
        );
      })}
    </div>
  );
};

// Render Heading Element safely with clean styling and no raw hash markers
function renderHeadingElement(level: number, rawContent: string, lineIdx: number) {
  // Strip any accidental leading or trailing hashes and trim
  const cleanContent = rawContent.replace(/^#{1,6}\s*|\s*#{1,6}$/g, '').trim();

  if (level === 1) {
    return (
      <h1 key={lineIdx} className="text-xl font-extrabold text-white mt-3.5 mb-2 text-cyan-300">
        {renderFormattedInline(cleanContent)}
      </h1>
    );
  }
  if (level === 2) {
    return (
      <h2 key={lineIdx} className="text-lg font-bold text-cyan-200 mt-3 mb-1.5 border-b border-cyan-500/20 pb-1">
        {renderFormattedInline(cleanContent)}
      </h2>
    );
  }
  if (level === 3) {
    return (
      <h3 key={lineIdx} className="text-base font-bold text-cyan-300 mt-2.5 mb-1 flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
        {renderFormattedInline(cleanContent)}
      </h3>
    );
  }
  if (level === 4) {
    return (
      <h4 key={lineIdx} className="text-[14.5px] font-bold text-cyan-200 mt-2 mb-1 flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-sm bg-cyan-400/80"></span>
        {renderFormattedInline(cleanContent)}
      </h4>
    );
  }
  return (
    <h5 key={lineIdx} className="text-xs font-bold text-cyan-300/90 mt-1.5 mb-0.5 uppercase tracking-wider flex items-center gap-1">
      <span className="h-1 w-1 rounded-full bg-cyan-400/60"></span>
      {renderFormattedInline(cleanContent)}
    </h5>
  );
}

// Format inline items like **bold**, *italic*, `code`, and eliminate rogue markers
function renderFormattedInline(raw: string): React.ReactNode[] {
  // 1. Remove rogue inline hashes like #### or ### so they never leak as raw text
  const sanitized = raw.replace(/(^|\s)#{1,6}\s+/g, '$1');

  // 2. Tokenize by markdown elements: `code`, ***bold-italic***, **bold**, *italic*
  const pattern = /(`[^`]+`|\*\*\*(?:[^*]|\*[^*])+\*\*\*|\*\*(?:[^*]|\*(?!\*))+\*\*|\*[^*]+\*)/g;
  const tokens = sanitized.split(pattern);

  return tokens.map((tok, i) => {
    if (!tok) return null;

    if (tok.startsWith('`') && tok.endsWith('`') && tok.length > 2) {
      return (
        <code
          key={i}
          className="mx-1 rounded bg-[#0b1220] border border-cyan-500/30 px-1.5 py-0.5 font-mono text-[13px] text-cyan-300 font-medium"
        >
          {tok.slice(1, -1)}
        </code>
      );
    }

    if (tok.startsWith('***') && tok.endsWith('***') && tok.length > 6) {
      return (
        <strong key={i} className="font-bold text-white text-cyan-100">
          <em className="italic">{tok.slice(3, -3)}</em>
        </strong>
      );
    }

    if (tok.startsWith('**') && tok.endsWith('**') && tok.length > 4) {
      return (
        <strong key={i} className="font-bold text-white text-cyan-100">
          {tok.slice(2, -2)}
        </strong>
      );
    }

    if (tok.startsWith('*') && tok.endsWith('*') && tok.length > 2) {
      return (
        <em key={i} className="italic text-slate-300">
          {tok.slice(1, -1)}
        </em>
      );
    }

    // Regular text: clean any residual unclosed asterisks (**) or rogue hashes (##)
    const cleanText = tok.replace(/\*{2,}/g, '').replace(/#{2,}/g, '');
    if (!cleanText) return null;

    return cleanText;
  });
}
