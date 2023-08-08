import {
  ElementNode,
  InterpolationNode,
  NodeTypes,
  ParserContext,
  RootNode,
  TagType,
  TemplateChildNode,
  TextNode,
} from './ast';

export function baseParse(content: string) {
  const context = createParserContext(content);
  const root = createRoot(parseChildren(context, []));

  return root;
}

function parseChildren(
  context: ParserContext,
  ancestors: ElementNode[]
): TemplateChildNode[] {
  const nodes: TemplateChildNode[] = [];

  while (!isEnd(context, ancestors)) {
    let node: TemplateChildNode | undefined;

    if (context.source.startsWith('{{')) {
      node = parseInterpolation(context);
    } else if (context.source.startsWith('<')) {
      if (/[a-zA-Z]/.test(context.source[1]))
        node = parseElement(context, ancestors)!;
    }

    if (!node) node = parseText(context);

    nodes.push(node);
  }

  return nodes;
}

function isEnd(context: ParserContext, ancestors: ElementNode[]): boolean {
  const s = context.source;

  if (s.startsWith('</')) {
    for (let i = ancestors.length - 1; i > -1; i--) {
      if (startsWithEndTagOpen(s, ancestors[i].tag)) return true;
    }
  }

  return !s;
}

function parseText(context: ParserContext): TextNode {
  const endToken = ['<', '{{'];

  let endIndex = context.source.length;
  for (let i = 0; i < endToken.length; i++) {
    const index = context.source.indexOf(endToken[i]);
    if (index !== -1 && endIndex > index) {
      endIndex = index;
    }
  }

  const content = parseTextData(context, endIndex);

  return {
    type: NodeTypes.TEXT,
    content,
  };
}

function parseTextData(context: ParserContext, len: number): string {
  const content = context.source.slice(0, len);
  advanceBy(context, content.length);
  return content;
}

function parseElement(
  context: ParserContext,
  ancestors: ElementNode[]
): ElementNode | void {
  const element = parseTag(context, TagType.Start)!;

  ancestors.push(element);
  element.children = parseChildren(context, ancestors);
  ancestors.pop();

  if (startsWithEndTagOpen(context.source, element.tag)) {
    parseTag(context, TagType.End);
  } else {
    throw new Error(`Element ${element.tag} is not closed`);
  }

  return element;
}

function startsWithEndTagOpen(source: string, tag: string): boolean {
  return (
    source.startsWith('</') &&
    source.slice(2, 2 + tag.length).toLowerCase() === tag
  );
}

function parseTag(context: ParserContext, type: TagType): ElementNode | void {
  const match = /^<\/?([ a-zA-Z ]*)/.exec(context.source)!;
  const tag = match[1];

  advanceBy(context, match[0].length);
  advanceBy(context, 1);

  if (type === TagType.End) return;

  return {
    type: NodeTypes.ELEMENT,
    tag,
    children: [],
  };
}

function parseInterpolation(context): InterpolationNode {
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

function advanceBy(context: ParserContext, len: number) {
  context.source = context.source.slice(len);
}

function createRoot(children: TemplateChildNode[]): RootNode {
  return {
    type: NodeTypes.ROOT,
    children,
  };
}

function createParserContext(content: string): ParserContext {
  return {
    source: content,
  };
}
