const imageMarkdownPattern = /!\[([^\]]*)\]\(([^)]+)\)/g;

export interface CardContentPart {
  type: 'text' | 'image';
  value: string;
  alt?: string;
  raw?: string;
  start?: number;
  end?: number;
}

export function parseCardContent(content: string): CardContentPart[] {
  imageMarkdownPattern.lastIndex = 0;
  const parts: CardContentPart[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(imageMarkdownPattern)) {
    const index = match.index ?? 0;

    if (index > lastIndex) {
      parts.push({ type: 'text', value: content.slice(lastIndex, index) });
    }

    parts.push({
      type: 'image',
      alt: match[1]?.trim() || 'Card image',
      value: match[2]?.trim() || '',
      raw: match[0],
      start: index,
      end: index + match[0].length,
    });

    lastIndex = index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: 'text', value: content.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: 'text', value: content }];
}

export function hasCardContentImages(content: string) {
  imageMarkdownPattern.lastIndex = 0;
  return imageMarkdownPattern.test(content);
}

export function createCardImageMarkdown(url: string, alt = 'Card image') {
  const sanitizedAlt = alt.replace(/[\[\]\n\r]/g, ' ').trim() || 'Card image';
  return `![${sanitizedAlt}](${url})`;
}

export function insertTextAtSelection(
  value: string,
  insertion: string,
  selectionStart: number | null,
  selectionEnd: number | null,
) {
  const start = selectionStart ?? value.length;
  const end = selectionEnd ?? value.length;

  return {
    value: `${value.slice(0, start)}${insertion}${value.slice(end)}`,
    cursor: start + insertion.length,
  };
}

export function buildImageInsertion(
  currentValue: string,
  imageMarkdown: string[],
  selectionStart: number | null,
  selectionEnd: number | null,
) {
  if (imageMarkdown.length === 0) {
    return '';
  }

  const start = selectionStart ?? currentValue.length;
  const end = selectionEnd ?? currentValue.length;
  const before = currentValue.slice(0, start);
  const after = currentValue.slice(end);
  const needsLeadingNewline = before.length > 0 && !before.endsWith('\n');
  const needsTrailingNewline = after.length > 0 && !after.startsWith('\n');

  return `${needsLeadingNewline ? '\n' : ''}${imageMarkdown.join('\n')}${needsTrailingNewline ? '\n' : ''}`;
}

export function removeCardContentRange(value: string, start: number, end: number) {
  let nextValue = `${value.slice(0, start)}${value.slice(end)}`;

  nextValue = nextValue.replace(/[ \t]+\n/g, '\n');
  nextValue = nextValue.replace(/\n{3,}/g, '\n\n');

  if (nextValue.startsWith('\n\n')) {
    nextValue = nextValue.slice(1);
  }

  if (nextValue.endsWith('\n\n')) {
    nextValue = nextValue.slice(0, -1);
  }

  return nextValue;
}
