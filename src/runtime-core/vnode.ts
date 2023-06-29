import { ShapeFlags } from '../shared/shapeFlags';
import { SlotProps } from './helper/renderSlots';

export type RenderFunction = () => VNode;

export type Component = {
  render: RenderFunction;
  setup?: Function;
  name?: string;
};

export type VNodeTypes = Component | string;

export type VNode = VNodeString | VNodeComponent;

interface VNodeBase {
  el: Element | null;
  shapeFlag: ShapeFlags;
  props?: VNodeProps;
}

export interface VNodeString extends VNodeBase {
  type: string;
  children?: string | VNode[];
}

export interface VNodeComponent extends VNodeBase {
  type: Component;
  children?: Record<string, (props?: SlotProps) => VNode[] | VNode>;
}

export type VNodeProps = Record<PropertyKey, any>;

export function createVNode(
  type: VNodeTypes,
  props?: VNodeProps,
  children?: VNode['children']
): VNode {
  const vnode: VNode = {
    el: null,
    shapeFlag: getShapeFlag(type),
    props,
    type,
    children,
  } as VNode;

  if (typeof children === 'string') {
    vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN;
  } else if (Array.isArray(children)) {
    vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN;
  }

  if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
    if (typeof children === 'object') {
      vnode.shapeFlag |= ShapeFlags.SLOTS_CHILDREN;
    }
  }

  return vnode;
}

function getShapeFlag(type) {
  return typeof type === 'string'
    ? ShapeFlags.ELEMENT
    : ShapeFlags.STATEFUL_COMPONENT;
}
