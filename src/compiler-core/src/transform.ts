import { RootNode, TransformContext, TransformOptions } from './ast';

export function transform(root: RootNode, options: TransformOptions) {
  const context = createTransformContext(root, options);
  traverseNode(root, context);
  createRootCodegen(root);
}

function createRootCodegen(root: RootNode) {
  root.codegenNode = root.children[0];
}

function createTransformContext(
  root: RootNode,
  options: TransformOptions
): TransformContext {
  const context: TransformContext = {
    root,
    nodeTransforms: options.nodeTransforms || [],
  };

  return context;
}

function traverseNode(node: RootNode, context: TransformContext) {
  const { nodeTransforms = [] } = context;

  for (let i = 0; i < nodeTransforms.length; i++) {
    const transform = nodeTransforms[i];
    transform(node, context);
  }

  traverseChildren(node, context);
}

function traverseChildren(node: RootNode, context: TransformContext) {
  const children: RootNode[] = (node as any).children;

  if (children) {
    for (let i = 0; i < children.length; i++) {
      const childNode = children[i];
      traverseNode(childNode, context);
    }
  }
}
