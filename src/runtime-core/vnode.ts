import { ShapeFlags } from '../shared/shapeFlags';

export type VNodeType = {
  render: Function;
  setup?: Function;
  name?: string;
};

type CreateVNodeType = VNodeType | string;

export type VNode = {
  type: CreateVNodeType;
  shapeFlag: ShapeFlags;
  el: Element | null;
  props?: VNodeProps;
  children?: VNodeChildren;
};

export type VNodeProps = Record<PropertyKey, any>;
export type VNodeChildren = string | VNode[];

export function createVNode(
  type: CreateVNodeType,
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
