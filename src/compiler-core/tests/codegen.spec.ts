import { generate } from '../src/codegen';
import { baseParse } from '../src/parse';
import { transform } from '../src/transform';

describe('codegen', () => {
  it('string', () => {
    const ast = baseParse('tycho');
    transform(ast, {});

    const { code } = generate(ast);

    expect(code).toMatchInlineSnapshot(
      `"return function render(_ctx, _cache) {return 'tycho'}"`
    );
  });
});
