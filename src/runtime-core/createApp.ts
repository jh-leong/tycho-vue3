import { render } from './renderer';
import { Component, createVNode } from './vnode';

export function createApp(rootComponent: Component) {
  return {
    mount(rootContainer: Element) {
      const vnode = createVNode(rootComponent);
      render(vnode, rootContainer);
    },
  };
}
