import { ShapeFlags } from '../shared/shapeFlags';
import {
  setupComponent,
  createComponentInstance,
  ComponentInternalInstance,
} from './component';
import { createAppAPI } from './createApp';
import {
  CREATE_TEXT,
  FRAGMENT,
  VNode,
  VNodeComponent,
  VNodeFragment,
  VNodeString,
  VNodeText,
} from './vnode';

export interface RendererOptions {
  insert(el: Element, parent: Element): void;
  patchProp(el: Element, key: PropertyKey, val: unknown): void;
  createElement(type: unknown): Element;
}

export type Renderer = ReturnType<typeof createRenderer>;

export function createRenderer(options: RendererOptions) {
  const {
    insert: _insert,
    patchProp: _patchProp,
    createElement: _createElement,
  } = options;

  return {
    createApp: createAppAPI(render),
  };

  /**
   * @description render 函数的作用是将 vnode 渲染到 container 中
   */
  function render(vnode: VNode, container: Element) {
    patch(vnode, container);
  }

  function isComponent(vnode: VNode): vnode is VNodeComponent {
    const { shapeFlag } = vnode;
    return Boolean(shapeFlag & ShapeFlags.STATEFUL_COMPONENT);
  }

  /**
   * @description
   *
   * patch 的作用是根据 vnode 的类型，调用不同的处理函数
   * 递归处理 vnode, 直到 vnode 的类型是 element, 最后挂载到 container 中
   */
  function patch(
    vnode: VNode,
    container: Element,
    parentComponent: ComponentInternalInstance['parent'] = null
  ) {
    const { type, shapeFlag } = vnode;

    switch (type) {
      case FRAGMENT:
        processFragment(vnode, container, parentComponent);
        break;

      case CREATE_TEXT:
        processText(vnode, container);
        break;

      default:
        // element
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(vnode as VNodeString, container, parentComponent);
        }
        // 传入的是一个组件
        else if (isComponent(vnode)) {
          processComponent(vnode, container, parentComponent);
        }
        break;
    }
  }

  function processText(vnode: VNodeText, container: Element) {
    const { children } = vnode;
    const textNode = document.createTextNode(children!);
    vnode.el = textNode;
    container.append(textNode);
  }

  function processFragment(
    vnode: VNodeFragment,
    container: Element,
    parentComponent: ComponentInternalInstance['parent']
  ) {
    mountChildren(vnode, container, parentComponent);
  }

  /**
   * @description 处理 element
   */
  function processElement(
    vnode: VNodeString,
    container: Element,
    parentComponent: ComponentInternalInstance['parent']
  ) {
    mountElement(vnode, container, parentComponent);

    // todo: update
  }

  function mountElement(
    vnode: VNode,
    container: Element,
    parentComponent: ComponentInternalInstance['parent']
  ) {
    const el = _createElement(vnode.type);
    vnode.el = el;

    const { children, props, shapeFlag } = vnode;

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      el.textContent = children as string;
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(vnode, el, parentComponent);
    }

    // props
    for (const key in props) {
      const val = props[key];

      _patchProp(el, key, val);
    }

    _insert(el, container);
  }

  function mountChildren(
    vnode: VNode,
    container: Element,
    parentComponent: ComponentInternalInstance['parent']
  ) {
    const children = vnode.children as VNode[];

    children.forEach((v) => {
      patch(v, container, parentComponent);
    });
  }

  /**
   * @description 处理组件
   */
  function processComponent(
    vnode: VNodeComponent,
    container: Element,
    parentComponents: ComponentInternalInstance['parent']
  ) {
    mountComponent(vnode, container, parentComponents);
  }

  function mountComponent(
    initialVNode: VNodeComponent,
    container: Element,
    parentComponent: ComponentInternalInstance['parent']
  ) {
    const instance = createComponentInstance(initialVNode, parentComponent);

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
    patch(subTree, container, instance);

    // el 一定存在: 递归处理 subTree 时，会将 subTree.el 赋值 (最后一个根节点一定是 Element, 否则就无限循环了)
    initialVNode.el = subTree.el;

    /**
     * todo:
     * 支持在组件的 props 上传入事件监听, 在 el 上挂载 instance.props 上监听的事件
     * 目前只支持监听组件的 emit 事件
     */
  }
}
