import { NodeTypes } from '../src/ast';
import { baseParse } from '../src/parse';
import { transform } from '../src/transform';

describe('transform', () => {
  it('happy path', () => {
    const ast = baseParse('<div>hi,{{foo}}</div>');

    const plugin = (node) => {
      if (node.type === NodeTypes.TEXT) {
        node.content += ' tycho';
      }
    };

    transform(ast, {
      nodeTransforms: [plugin],
    });

    const nodeText = (ast.children[0] as any).children[0];
    expect(nodeText.content).toBe('hi, tycho');
  });
});
