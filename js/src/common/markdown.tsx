import type m from 'mithril';


const INLINE_PATTERN = /`([^`]+)`|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*\n]+)\*|_([^_\n]+)_/g;

function renderInline(text: string, keyPrefix: string): m.Children[] {
  const nodes: m.Children[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  INLINE_PATTERN.lastIndex = 0;

  while ((match = INLINE_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(<span key={`${keyPrefix}-t${index++}`}>{text.slice(lastIndex, match.index)}</span>);
    }

    const key = `${keyPrefix}-${index++}`;

    if (match[1] !== undefined) {
      nodes.push(<code key={key}>{match[1]}</code>);
    } else if (match[2] !== undefined || match[3] !== undefined) {
      nodes.push(<strong key={key}>{match[2] ?? match[3]}</strong>);
    } else if (match[4] !== undefined || match[5] !== undefined) {
      nodes.push(<em key={key}>{match[4] ?? match[5]}</em>);
    }

    lastIndex = INLINE_PATTERN.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(<span key={`${keyPrefix}-t${index++}`}>{text.slice(lastIndex)}</span>);
  }

  return nodes;
}

function renderLines(text: string, keyPrefix: string): m.Children[] {
  return text.split('\n').reduce<m.Children[]>((acc, line, index) => {
    if (index > 0) acc.push(<br key={`${keyPrefix}-br${index}`} />);
    acc.push(...renderInline(line, `${keyPrefix}-${index}`));
    return acc;
  }, []);
}

export function renderMarkdownInline(text: string): m.Children[] {
  return renderLines(String(text || ''), 'md');
}

export function renderMarkdownParagraphs(text: string): m.Children {
  const normalized = String(text || '')
    .replace(/\r\n/g, '\n')
    .trim();

  if (!normalized) return null;

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  return paragraphs.map((part, index) => <p key={`p-${index}`}>{renderLines(part, `p${index}`)}</p>);
}
