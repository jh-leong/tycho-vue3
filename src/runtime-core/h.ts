import { VNode, VNodeProps, createVNode } from './vnode';

export function h(
  type: VNode['type'],
  props?: VNodeProps,
  children?: VNode['children']
) {
  return createVNode(type, props, children);
}
