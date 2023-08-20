import {
  InterpolationNode,
  NodeTypes,
  RootNode,
  SimpleExpressionNode,
  TemplateChildNode,
  TextNode,
} from './ast';
import { TO_DISPLAY_STRING, helperMapName } from './runtimeHelpers';

export function generate(ast: RootNode) {
  const context = createCodegenContext();
  const { push } = context;

  genFunctionPreamble(ast, context);

  const functionName = 'render';
  const args = ['_ctx', '_cache'];
  const signature = args.join(', ');

  push(`function ${functionName}(${signature}) {`);
  push('return ');
  genNode(ast.codegenNode!, context);
  push('}');

  return {
    code: context.code,
  };
}

interface CodegenContext {
  code: string;
  push(source: string): void;
  helper(key: symbol): string;
}

function genFunctionPreamble(ast: RootNode, context: CodegenContext) {
  const { push } = context;

  const VueBinging = 'Vue';
  const aliasHelper = (s) => `${helperMapName[s]}: _${helperMapName[s]}`;

  if (ast.helpers?.length) {
    push(
      `const { ${ast.helpers.map(aliasHelper).join(', ')} } = ${VueBinging}`
    );
  }

  push('\n');
  push('return ');
}

function createCodegenContext(): CodegenContext {
  const context: CodegenContext = {
    code: '',
    push(source: string) {
      context.code += source;
    },
    helper(key) {
      return `_${helperMapName[key]}`;
    },
  };

  return context;
}
function genNode(node: TemplateChildNode, context: CodegenContext) {
  switch (node.type) {
    case NodeTypes.TEXT:
      genText(node, context);
      break;
    case NodeTypes.INTERPOLATION:
      genInterpolation(node, context);
      break;
    case NodeTypes.SIMPLE_EXPRESSION:
      genExpression(node, context);
      break;

    default:
      break;
  }
}

function genInterpolation(node: InterpolationNode, context: CodegenContext) {
  const { push, helper } = context;
  push(`${helper(TO_DISPLAY_STRING)}(`);
  genNode(node.content, context);
  push(')');
}

function genText(node: TextNode, context: CodegenContext) {
  const { push } = context;
  push(`'${node.content}'`);
}

function genExpression(node: SimpleExpressionNode, context: CodegenContext) {
  const { push } = context;
  push(`${node.content}`);
}
