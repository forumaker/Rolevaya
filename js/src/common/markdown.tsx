import type m from 'mithril';

/**
 * Tiny Markdown-lite renderer shared by the admin perk preview
 * (RolevayaSettingsPage) and the forum perk popover (CardPerkIcons).
 * Supports `code`, **bold**, __bold__, *italic*, _italic_ and line breaks.
 *
 * Builds a Mithril vnode tree directly instead of an HTML string, so there's
 * no m.trust()/innerHTML step anywhere in the pipeline — Mithril escapes
 * plain-text children automatically, which makes this safe by construction
 * rather than safe-because-we-remembered-to-escape-first.
 */

const INLINE_PATTERN = /`([^`]+)`|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*\n]+)\*|_([^_\n]+)_/g;

function renderInline(text: string, keyPrefix: string): m.Children[] {
  const nodes: m.Children[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  INLINE_PATTERN.lastIndex = 0;

  while ((match = INLINE_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      // Mithril requires every vnode in a children array to either all have
      // keys or all have none — mixing a raw (unkeyed) text string in with
      // the keyed <code>/<strong>/<em> vnodes below throws "In fragments,
      // vnodes must either all have keys or none have keys." on redraw
      // (e.g. toggling a manual perk card open/closed). Wrapping plain text
      // runs in a keyed <span> keeps every item in this array consistently
      // keyed.
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

/**
 * Flat rendering (no <p> wrapping) — used for the single-block admin preview
 * card, matching its previous layout.
 */
export function renderMarkdownInline(text: string): m.Children[] {
  return renderLines(String(text || ''), 'md');
}

/**
 * Paragraph rendering: blank-line-separated blocks become <p> elements —
 * used for the forum perk popover description.
 */
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
