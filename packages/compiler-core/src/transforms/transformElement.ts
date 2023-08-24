import { NodeTransform, NodeTypes, createVNodeCall } from '../ast';

export const transformElement: NodeTransform = (node, context) => {
  if (node.type === NodeTypes.ELEMENT) {
    return () => {
      const { tag: vnodeTag, children } = node;

      let vnodeProps;
      let vnodeChildren = children[0];

      node.codegenNode = createVNodeCall(
        context,
        vnodeTag,
        vnodeProps,
        vnodeChildren
      );
    };
  }
};
