import { RootNode } from './ast';

export function generate(ast: RootNode) {
  const context = createCodegenContext();
  const { push } = context;

  const functionName = 'render';
  const args = ['_ctx', '_cache'];
  const signature = args.join(', ');

  push('return ');
  push(`function ${functionName}(${signature}) {`);
  push('return ');
  genNode(ast.codegenNode, context);
  push('}');

  return {
    code: context.code,
  };
}

interface CodegenContext {
  code: string;
  push(source: string): void;
}

function createCodegenContext(): CodegenContext {
  const context = {
    code: '',
    push(source: string) {
      context.code += source;
    },
  };

  return context;
}
function genNode(node: any, context: CodegenContext) {
  const { push } = context;
  push(`'${node.content}'`);
}
