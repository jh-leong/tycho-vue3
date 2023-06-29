import { ShapeFlags } from '../shared/shapeFlags';
import {
  ComponentInternalInstance,
  createComponentInstance,
  setupComponent,
} from './component';
import { VNode, VNodeComponent } from './vnode';

/**
 * @description render 函数的作用是将 vnode 渲染到 container 中
 */
export function render(vnode: VNode, container: Element) {
  path(vnode, container);
}

function isComponent(vnode: VNode): vnode is VNodeComponent {
  const { shapeFlag } = vnode;
  return Boolean(shapeFlag & ShapeFlags.STATEFUL_COMPONENT);
}

/**
 * @description
 *
 * path 的作用是根据 vnode 的类型，调用不同的处理函数
 * 递归处理 vnode, 直到 vnode 的类型是 element, 最后挂载到 container 中
 */
function path(vnode: VNode, container: Element) {
  const { shapeFlag } = vnode;

  // vnode.type 是一个字符串，说明是一个 element
  if (shapeFlag & ShapeFlags.ELEMENT) {
    processElement(vnode, container);
  }
  // 传入的是一个组件
  else if (isComponent(vnode)) {
    processComponent(vnode, container);
  }
  // 非法传入暂不处理
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
function processComponent(vnode: VNodeComponent, container: Element) {
  mountComponent(vnode, container);
}

function mountComponent(initialVNode: VNodeComponent, container: Element) {
  const instance = createComponentInstance(initialVNode);

  setupComponent(instance);
  setupRenderEffect(instance, initialVNode, container);
}

function setupRenderEffect(
  instance: ComponentInternalInstance,
  initialVNode: VNode,
  container: Element
) {
  const { proxy } = instance;

  const subTree = instance.render!.call(proxy);

  // 递归处理 subTree
  path(subTree, container);

  // el 一定存在: 递归处理 subTree 时，会将 subTree.el 赋值 (最后一个根节点一定是 Element, 否则就无限循环了)
  initialVNode.el = subTree.el;

  /**
   * todo:
   * 支持在组件的 props 上传入事件监听, 在 el 上挂载 instance.props 上监听的事件
   * 目前只支持监听组件的 emit 事件
   */
}
