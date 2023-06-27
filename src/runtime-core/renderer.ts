import { ShapeFlags } from '../shared/shapeFlags';
import { createComponentInstance, setupComponent } from './component';
import { VNode } from './vnode';

/**
 * @description render 函数的作用是将 vnode 渲染到 container 中
 */
export function render(vnode: VNode, container: Element) {
  path(vnode, container);
}

function path(vnode: VNode, container: Element) {
  const { shapeFlag } = vnode;

  // vnode.type 是一个字符串，说明是一个 element
  if (shapeFlag & ShapeFlags.ELEMENT) {
    processElement(vnode, container);
  }
  // 传入的是一个组件
  else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
    processComponent(vnode, container);
  }
}

/**
 * @description 处理 element
 */
function processElement(vnode: VNode, container: Element) {
  mountElement(vnode, container);

  // todo: update
}

function mountElement(vnode: VNode, container: Element) {
  const el = (vnode.el = document.createElement(vnode.type as string));

  const { children, props, shapeFlag } = vnode;

  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    el.textContent = children as string;
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    mountChildren(vnode, el);
  }

  // props
  for (const key in props) {
    const val = props[key];

    const isOn = (key: string) => /^on[A-Z]/.test(key);
    if (isOn(key)) {
      el.addEventListener(getEventName(key), val);
    } else {
      el.setAttribute(key, val);
    }
  }

  container.append(el);
}

function getEventName(key: string) {
  return key.slice(2).toLowerCase();
}

function mountChildren(vnode: VNode, container: Element) {
  const children = vnode.children as VNode[];

  children.forEach((v) => {
    path(v, container);
  });
}

/**
 * @description 处理组件
 */
function processComponent(vnode: VNode, container: Element) {
  mountComponent(vnode, container);
}

function mountComponent(initialVNode: VNode, container: Element) {
  const instance = createComponentInstance(initialVNode);

  setupComponent(instance);
  setupRenderEffect(instance, initialVNode, container);
}

function setupRenderEffect(instance, initialVNode, container) {
  const { proxy } = instance;
  const subTree = instance.render.call(proxy);

  // subTree 根节点肯定是一个 element, 估 el 一定存在
  path(subTree, container);

  initialVNode.el = subTree.el;
}
