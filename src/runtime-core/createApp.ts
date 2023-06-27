import { render } from './renderer';
import { VNodeType, createVNode } from './vnode';

export function createApp(rootComponent: VNodeType) {
  return {
    mount(rootContainer: Element) {
      const vnode = createVNode(rootComponent);
      render(vnode, rootContainer);
    },
  };
}
