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

export type TemplateChildNode =
  | RootNode
  | ElementNode
  | TextNode
  | InterpolationNode
  | SimpleExpressionNode;

export interface RootNode {
  type: NodeTypes.ROOT;
  children: TemplateChildNode[];
}

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
  nodeTransforms: NodeTransform;
}

export interface TransformContext extends TransformOptions {
  root: TemplateChildNode;
}

export type NodeTransform = ((
  node: TemplateChildNode,
  context: TransformContext
) => void)[];
