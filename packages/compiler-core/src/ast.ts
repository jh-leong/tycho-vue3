import { CREATE_ELEMENT_VNODE } from './runtimeHelpers';

export const enum NodeTypes {
  ROOT,
  SIMPLE_EXPRESSION,
  INTERPOLATION,
  ELEMENT,
  TEXT,
  COMPOUND_EXPRESSION,
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
  | CompoundExpressionNode
  | SimpleExpressionNode;

export interface CompoundExpressionNode {
  type: NodeTypes.COMPOUND_EXPRESSION;
  // children: (SimpleExpressionNode | CompoundExpressionNode)[];
  children: (TextNode | InterpolationNode | string)[];
}

export type ParentNode = RootNode | ElementNode;
export interface ElementNode {
  type: NodeTypes.ELEMENT;
  tag: string;
  children: any;
  props?: string[];
  codegenNode?: any;
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

export function createVNodeCall(
  context: TransformContext,
  tag: string,
  props: any,
  children: any
) {
  context.helper(CREATE_ELEMENT_VNODE);

  return {
    type: NodeTypes.ELEMENT as const,
    tag: `"${tag}"`,
    props: props,
    children: children,
  };
}
