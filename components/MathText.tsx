'use client';
import katex from 'katex';

export default function MathText({ text, className }: { text: string; className?: string }) {
  const parts: React.ReactNode[] = [];
  const regex = /\$\$([^$]+)\$\$|\$([^$]+)\$/g;
  let last = 0, key = 0;
  let m: RegExpExecArray | null;

  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={key++}>{text.slice(last, m.index)}</span>);
    const latex = m[1] ?? m[2];
    const display = m[1] !== undefined;
    try {
      const html = katex.renderToString(latex, { throwOnError: false, displayMode: display });
      parts.push(<span key={key++} dangerouslySetInnerHTML={{ __html: html }} />);
    } catch {
      parts.push(<span key={key++}>{m[0]}</span>);
    }
    last = regex.lastIndex;
  }
  if (last < text.length) parts.push(<span key={key++}>{text.slice(last)}</span>);

  return <span className={className}>{parts}</span>;
}
