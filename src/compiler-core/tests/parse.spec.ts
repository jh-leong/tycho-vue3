import { NodeTypes } from '../src/ast';
import { baseParse } from '../src/parse';

describe('Parse', () => {
  describe('interpolation', () => {
    test('simple interpolation', () => {
      const ast = baseParse('{{ foo }}');

      expect(ast.children[0]).toStrictEqual({
        type: NodeTypes.INTERPOLATION,
        content: {
          type: NodeTypes.SIMPLE_EXPRESSION,
          content: 'foo',
        },
      });
    });
  });

  describe('element', () => {
    it('simple element div', () => {
      const ast = baseParse('<div></div>');

      expect(ast.children[0]).toStrictEqual({
        type: NodeTypes.ELEMENT,
        tag: 'div',
      });
    });
  });

  describe('text', () => {
    it('simple text', () => {
      const ast = baseParse('tycho up up');

      expect(ast.children[0]).toStrictEqual({
        type: NodeTypes.TEXT,
        content: 'tycho up up',
      });
    });
  });
});
