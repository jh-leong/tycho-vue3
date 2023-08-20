import {
  ParentNode,
  NodeTypes,
  RootNode,
  TemplateChildNode,
  TransformContext,
  TransformOptions,
} from './ast';
import { TO_DISPLAY_STRING } from './runtimeHelpers';

export function transform(root: RootNode, options: TransformOptions) {
  const context = createTransformContext(root, options);
  traverseNode(root, context);
  createRootCodegen(root);

  root.helpers = Array.from(context.helpers);
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
    helpers: new Set(),
    helper(name) {
      context.helpers.add(name);
      return name;
    },
  };

  return context;
}

function traverseNode(
  node: RootNode | TemplateChildNode,
  context: TransformContext
) {
  const { nodeTransforms = [] } = context;

  for (let i = 0; i < nodeTransforms.length; i++) {
    const transform = nodeTransforms[i];
    transform(node, context);
  }

  switch (node.type) {
    case NodeTypes.INTERPOLATION:
      context.helper(TO_DISPLAY_STRING);
      break;
    case NodeTypes.ROOT:
    case NodeTypes.ELEMENT:
      traverseChildren(node, context);
      break;

    default:
      break;
  }
}

function traverseChildren(parent: ParentNode, context: TransformContext) {
  const children = parent.children;

  for (let i = 0; i < children.length; i++) {
    const childNode = children[i];
    traverseNode(childNode, context);
  }
}
