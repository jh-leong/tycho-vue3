import { NodeTypes } from './ast';

export const enum TagType {
  Start,
  End,
}

export function baseParse(content: string) {
  const context = createParserContext(content);
  const root = createRoot(parseChildren(context));

  return root;
}

function parseChildren(context) {
  const s = context.source;
  const nodes: any = [];

  let node;
  if (s.startsWith('{{')) {
    node = parseInterpolation(context);
  } else if (s.startsWith('<')) {
    if (/[a-zA-Z]/.test(s[1])) node = parseElement(context);
  }

  if (!node) {
    node = parseText(context);
  }

  nodes.push(node);

  return nodes;
}

function parseText(context: any): any {
  const content = parseTextData(context, context.source.length);

  return {
    type: NodeTypes.TEXT,
    content,
  };
}

function parseTextData(context: any, len: number) {
  const content = context.source.slice(0, len);
  advanceBy(context, content.length);
  return content;
}

function parseElement(context) {
  const element = parseTag(context, TagType.Start);
  parseTag(context, TagType.End);
  return element;
}

function parseTag(context: any, type: TagType) {
  const match: any = /^<\/?([ a-zA-Z ]*)/.exec(context.source);
  const tag = match[1];

  advanceBy(context, match[0].length);
  advanceBy(context, 1);

  if (type === TagType.End) return;

  return {
    type: NodeTypes.ELEMENT,
    tag,
  };
}

function parseInterpolation(context) {
  const openDelimiter = '{{';
  const closeDelimiter = '}}';

  const closeIndex = context.source.indexOf(
    closeDelimiter,
    openDelimiter.length
  );

  advanceBy(context, openDelimiter.length);

  const rawContentLen = closeIndex - openDelimiter.length;

  const rawContent = parseTextData(context, rawContentLen);
  const content = rawContent.trim();

  advanceBy(context, closeDelimiter.length);

  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content,
    },
  };
}

function advanceBy(context: any, len: number) {
  context.source = context.source.slice(len);
}

function createRoot(children) {
  return {
    children,
  };
}

function createParserContext(content: string) {
  return {
    source: content,
  };
}
