import {
  NodeTransform,
  NodeTypes,
  SimpleExpressionNode,
} from '../ast';

export const transformExpression: NodeTransform = (node, context) => {
  if (node.type === NodeTypes.INTERPOLATION) {
    node.content = processExpression(node.content);
  }
};

function processExpression(node: SimpleExpressionNode) {
  node.content = `_ctx.${node.content}`;
  return node;
}
