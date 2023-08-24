import { isArray } from '@tycho-vue/shared';
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
  const child = root.children[0];

  if (child.type === NodeTypes.ELEMENT) {
    root.codegenNode = child.codegenNode;
  } else {
    root.codegenNode = child;
  }
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

  const exitFns: any = [];
  for (let i = 0; i < nodeTransforms.length; i++) {
    const transform = nodeTransforms[i];
    const onExit = transform(node, context);

    if (onExit) exitFns.push(onExit);
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

  let i = exitFns.length;
  while (i--) exitFns[i]();
}

function traverseChildren(parent: ParentNode, context: TransformContext) {
  const children = parent.children;

  if (isArray(children)) {
    for (let i = 0; i < children.length; i++) {
      const childNode = children[i];
      traverseNode(childNode, context);
    }
  }
}
