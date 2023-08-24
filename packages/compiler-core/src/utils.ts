import {
  InterpolationNode,
  NodeTypes,
  TemplateChildNode,
  TextNode,
} from './ast';

export function isText(
  node: TemplateChildNode
): node is TextNode | InterpolationNode {
  return node.type === NodeTypes.INTERPOLATION || node.type === NodeTypes.TEXT;
}
