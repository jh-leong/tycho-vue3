import { ShapeFlags } from '../shared/shapeFlags';
import { SlotProps } from './helper/renderSlots';

export const FRAGMENT = Symbol('FRAGMENT');
export const CREATE_TEXT = Symbol('CREATE_TEXT');

export type VNode = VNodeString | VNodeComponent | VNodeFragment | VNodeText;

interface VNodeBase {
  shapeFlag: ShapeFlags;
  props?: VNodeProps;
}

export interface VNodeString extends VNodeBase {
  type: string;
  el: Element | null;
  children?: string | VNode[];
}

export interface VNodeComponent extends VNodeBase {
  type: Component;
  el: Element | null;
  children?: Record<string, (props?: SlotProps) => VNode[] | VNode>;
}

export type RenderFunction = () => VNode;

export type Component = {
  render: RenderFunction;
  setup?: Function;
  name?: string;
};

export interface VNodeFragment extends VNodeBase {
  type: typeof FRAGMENT;
  el: Element | null;
  children?: VNode[];
}

export interface VNodeText extends VNodeBase {
  type: typeof CREATE_TEXT;
  el: Text;
  children?: string;
}

export type VNodeProps = Record<PropertyKey, any>;

export function createVNode<T extends VNode['type'], V = VNode>(
  type: T,
  props?: VNodeProps,
  children?: VNode['children']
): V extends { type: T } ? V : never {
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

  return vnode as any;
}

export function createTextVNode(text: string) {
  return createVNode(CREATE_TEXT, {}, text);
}

function getShapeFlag(type) {
  return typeof type === 'string'
    ? ShapeFlags.ELEMENT
    : ShapeFlags.STATEFUL_COMPONENT;
}
