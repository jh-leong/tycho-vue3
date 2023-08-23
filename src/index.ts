export * from './runtime-dom';

import { baseCompile } from './compiler-core/src';
import { RenderFunction } from './runtime-core/vnode';
import { registerRuntimeComplier } from './runtime-dom';
import * as runtimeDom from './runtime-dom';

function compileToFunction(template: string): RenderFunction {
  const { code } = baseCompile(template);
  const render = new Function('Vue', code)(runtimeDom);
  return render;
}

registerRuntimeComplier(compileToFunction);
