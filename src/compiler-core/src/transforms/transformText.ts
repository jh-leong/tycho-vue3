import { CompoundExpressionNode, NodeTransform, NodeTypes } from '../ast';
import { isText } from '../utils';

export const transformText: NodeTransform = (node, context) => {
  if (node.type === NodeTypes.ELEMENT) {
    return () => {
      const { children } = node;

      let currentContainer: CompoundExpressionNode | void;
      for (let i = 0; i < children.length; i++) {
        const child = children[i];

        if (isText(child)) {
          for (let j = i + 1; j < children.length; j++) {
            const next = children[j];
            if (isText(next)) {
              if (!currentContainer!) {
                currentContainer = children[i] = {
                  type: NodeTypes.COMPOUND_EXPRESSION as const,
                  children: [child],
                };
              }

              currentContainer.children.push(` + `);
              currentContainer.children.push(next);
              children.splice(j--, 1);
            } else {
              currentContainer = undefined;
              break;
            }
          }
        }
      }
    };
  }
};
