// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import React from 'react';

function inlineParts(text, options = {}) {
  const nodes = [];
  const mentionHandles = new Set((options.mentionHandles || []).map(handle => String(handle || '').toLowerCase()));
  const pattern = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*|@[A-Za-z0-9._-]+)/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**')) {
      nodes.push(<strong key={`${match.index}-b`}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('__')) {
      nodes.push(<u key={`${match.index}-u`}>{token.slice(2, -2)}</u>);
    } else if (token.startsWith('`')) {
      nodes.push(<code key={`${match.index}-c`}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith('@')) {
      const mentionKey = token.slice(1).toLowerCase();
      const className = mentionHandles.has(mentionKey) ? 'gaia-mention gaia-mention-self' : 'gaia-mention';
      nodes.push(<span key={`${match.index}-m`} className={className}>{token}</span>);
    } else {
      nodes.push(<em key={`${match.index}-i`}>{token.slice(1, -1)}</em>);
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}

export function renderMarkdown(text, options = {}) {
  if (!text) return '';

  const lines = String(text).split('\n');
  return lines.map((line, index) => {
    if (line.startsWith('### ')) {
      return <h3 key={index}>{inlineParts(line.slice(4), options)}</h3>;
    }
    return (
      <React.Fragment key={index}>
        {inlineParts(line, options)}
        {index < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}
