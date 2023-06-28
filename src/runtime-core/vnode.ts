import { ShapeFlags } from '../shared/shapeFlags';

export type RenderFunction = () => VNode;

export type Component = {
  render: RenderFunction;
  setup?: Function;
  name?: string;
};

export type VNodeTypes = Component | string;

export type VNode = {
  type: VNodeTypes;
  el: Element | null;
  shapeFlag: ShapeFlags;
  props?: VNodeProps;
  children?: VNodeChildren;
};

export type VNodeProps = Record<PropertyKey, any>;
export type VNodeChildren = string | VNode[];

export function createVNode(
  type: VNodeTypes,
  props?: VNodeProps,
  children?: VNodeChildren
): VNode {
  const vnode: VNode = {
    el: null,
    type,
    props,
    children,
    shapeFlag: getShapeFlag(type),
  };

  if (typeof children === 'string') {
    vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN;
  } else if (Array.isArray(children)) {
    vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN;
  }

  return vnode;
}

function getShapeFlag(type) {
  return typeof type === 'string'
    ? ShapeFlags.ELEMENT
    : ShapeFlags.STATEFUL_COMPONENT;
}
