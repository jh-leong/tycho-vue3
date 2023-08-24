import { isString } from '@tycho-vue/shared';
import {
  CompoundExpressionNode,
  ElementNode,
  InterpolationNode,
  NodeTypes,
  RootNode,
  SimpleExpressionNode,
  TemplateChildNode,
  TextNode,
} from './ast';
import {
  CREATE_ELEMENT_VNODE,
  TO_DISPLAY_STRING,
  helperMapName,
} from './runtimeHelpers';

export function generate(ast: RootNode) {
  const context = createCodegenContext();
  const { push } = context;

  genFunctionPreamble(ast, context);

  const functionName = 'render';
  const args = ['_ctx', '_cache'];
  const signature = args.join(', ');

  push(`function ${functionName}(${signature}) {\n`);
  push('\treturn ');
  genNode(ast.codegenNode!, context);
  push('\n}');

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
    case NodeTypes.ELEMENT:
      genElement(node, context);
      break;
    case NodeTypes.COMPOUND_EXPRESSION:
      genCompoundExpression(node, context);
      break;

    default:
      break;
  }
}

function genElement(node: ElementNode, context: CodegenContext) {
  const { push, helper } = context;
  const { tag, children, props } = node;

  push(`${helper(CREATE_ELEMENT_VNODE)}(`);
  genNodeList(genNullable([tag, props, children]), context);
  push(')');
}

function genNodeList(nodes: any[], context: CodegenContext) {
  const { push } = context;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    if (isString(node)) {
      push(node);
    } else {
      genNode(node, context);
    }

    if (i < nodes.length - 1) {
      push(', ');
    }
  }
}

function genNullable(args: any[]) {
  return args.map((i) => i || 'null');
}

function genCompoundExpression(
  node: CompoundExpressionNode,
  context: CodegenContext
) {
  const { push } = context;
  const { children } = node;

  for (let i = 0; i < children.length; i++) {
    const child = children[i];

    if (isString(child)) {
      push(child);
    } else {
      genNode(child, context);
    }
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
