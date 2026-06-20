import React from 'react';

function inlineParts(text) {
  const nodes = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**')) {
      nodes.push(<strong key={`${match.index}-b`}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('`')) {
      nodes.push(<code key={`${match.index}-c`}>{token.slice(1, -1)}</code>);
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

export function renderMarkdown(text) {
  if (!text) return '';

  return String(text).split('\n').map((line, index) => {
    if (line.startsWith('### ')) {
      return <h3 key={index}>{inlineParts(line.slice(4))}</h3>;
    }
    return (
      <React.Fragment key={index}>
        {inlineParts(line)}
        {index < String(text).split('\n').length - 1 && <br />}
      </React.Fragment>
    );
  });
}
