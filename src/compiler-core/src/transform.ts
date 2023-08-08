import { TemplateChildNode, TransformContext, TransformOptions } from './ast';

export function transform(root: TemplateChildNode, options: TransformOptions) {
  const context = createTransformContext(root, options);
  traverseNode(root, context);
}

function createTransformContext(
  root: TemplateChildNode,
  options: TransformOptions
): TransformContext {
  const context: TransformContext = {
    root,
    nodeTransforms: options.nodeTransforms || [],
  };

  return context;
}

function traverseNode(node: TemplateChildNode, context: TransformContext) {
  const { nodeTransforms } = context;

  for (let i = 0; i < nodeTransforms.length; i++) {
    const transform = nodeTransforms[i];
    transform(node, context);
  }

  traverseChildren(node, context);
}

function traverseChildren(node: TemplateChildNode, context: TransformContext) {
  const children: TemplateChildNode[] = (node as any).children;

  if (children) {
    for (let i = 0; i < children.length; i++) {
      const childNode = children[i];
      traverseNode(childNode, context);
    }
  }
}
