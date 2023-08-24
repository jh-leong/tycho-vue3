export * from '@tycho-vue/runtime-dom';

import * as runtimeDom from '@tycho-vue/runtime-dom';
import { registerRuntimeComplier } from '@tycho-vue/runtime-dom';
import { baseCompile } from '@tycho-vue/compiler-core';
import { RenderFunction } from '@tycho-vue/runtime-core';

function compileToFunction(template: string): RenderFunction {
  const { code } = baseCompile(template);
  const render = new Function('Vue', code)(runtimeDom);
  return render;
}

registerRuntimeComplier(compileToFunction);
