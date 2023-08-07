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
        children: [],
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

  test('hello world', () => {
    const ast = baseParse('<div>hi,{{foo}}</div>');

    expect(ast.children[0]).toStrictEqual({
      type: NodeTypes.ELEMENT,
      tag: 'div',
      children: [
        {
          type: NodeTypes.TEXT,
          content: 'hi,',
        },
        {
          type: NodeTypes.INTERPOLATION,
          content: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: 'foo',
          },
        },
      ],
    });
  });

  test('Nested Element', () => {
    const ast = baseParse('<div><span>hi,</span>{{foo}}</div>');

    expect(ast.children[0]).toStrictEqual({
      type: NodeTypes.ELEMENT,
      tag: 'div',
      children: [
        {
          type: NodeTypes.ELEMENT,
          tag: 'span',
          children: [
            {
              type: NodeTypes.TEXT,
              content: 'hi,',
            },
          ],
        },
        {
          type: NodeTypes.INTERPOLATION,
          content: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: 'foo',
          },
        },
      ],
    });
  });

  test('should throw error when lack end tag', () => {
    expect(() => {
      baseParse('<div><span></div>');
      baseParse('<div><span>hi,</span>{{foo}}');
    }).toThrow();
  });
});
