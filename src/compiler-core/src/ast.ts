export const enum NodeTypes {
  ROOT,
  SIMPLE_EXPRESSION,
  INTERPOLATION,
  ELEMENT,
  TEXT,
}

export const enum TagType {
  Start,
  End,
}

export interface RootNode {
  type: NodeTypes.ROOT;
  children: TemplateChildNode[];
  codegenNode?: TemplateChildNode;
  helpers?: symbol[];
}

export type TemplateChildNode =
  | ElementNode
  | TextNode
  | InterpolationNode
  | SimpleExpressionNode;

export type ParentNode = RootNode | ElementNode;
export interface ElementNode {
  type: NodeTypes.ELEMENT;
  tag: string;
  children: TemplateChildNode[];
}

export interface TextNode {
  type: NodeTypes.TEXT;
  content: string;
}

export interface InterpolationNode {
  type: NodeTypes.INTERPOLATION;
  content: SimpleExpressionNode;
}

export interface SimpleExpressionNode {
  type: NodeTypes.SIMPLE_EXPRESSION;
  content: string;
}

export interface ParserContext {
  source: string;
}

export interface TransformOptions {
  nodeTransforms?: NodeTransform[];
}

export interface TransformContext extends TransformOptions {
  root: RootNode;
  helpers: Set<symbol>;
  helper(name: symbol): symbol;
}

export type NodeTransform = (
  node: RootNode | TemplateChildNode,
  context: TransformContext
) => void | (() => void) | (() => void)[];
