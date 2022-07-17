import { render } from './render';
import { createVNode } from './vnode';

export function createApp(rootComponent) {
  return {
    mount(rootContainer) {
      const vnode = createVNode(rootContainer);

      render(vnode, rootContainer);
    },
  };
}
