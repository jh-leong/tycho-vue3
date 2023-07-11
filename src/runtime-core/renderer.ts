import { effect } from '../reactivity/effect';
import { EMPTY_OBJ } from '../shared';
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
  VNodeProps,
  VNodeString,
  VNodeText,
} from './vnode';

export interface RendererOptions {
  insert(el: Element, parent: Element): void;
  patchProp(el: Element, key: PropertyKey, preVal: unknown, val: unknown): void;
  createElement(type: unknown): Element;
  unmount(el: Element | Text): void;
  setElementTExt(el: Element | Text, text: string): void;
}

export type Renderer = ReturnType<typeof createRenderer>;

export function createRenderer(options: RendererOptions) {
  const {
    insert: _insert,
    patchProp: _patchProp,
    createElement: _createElement,
    unmount: _unmount,
    setElementTExt: _setElementTExt,
  } = options;

  return {
    createApp: createAppAPI(render),
  };

  /**
   * @description render 函数的作用是将 vnode 渲染到 container 中
   */
  function render(vnode: VNode, container: Element) {
    patch(null, vnode, container);
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
    preVnode: any,
    vnode: VNode,
    container: Element,
    parentComponent: ComponentInternalInstance['parent'] = null
  ) {
    const { type, shapeFlag } = vnode;

    switch (type) {
      case FRAGMENT:
        processFragment(preVnode, vnode, container, parentComponent);
        break;

      case CREATE_TEXT:
        processText(preVnode, vnode, container);
        break;

      default:
        // element
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(
            preVnode,
            vnode as VNodeString,
            container,
            parentComponent
          );
        }
        // 传入的是一个组件
        else if (isComponent(vnode)) {
          processComponent(preVnode, vnode, container, parentComponent);
        }
        break;
    }
  }

  function processText(
    preVnode: VNodeText,
    vnode: VNodeText,
    container: Element
  ) {
    const { children } = vnode;
    const textNode = document.createTextNode(children!);
    vnode.el = textNode;
    container.append(textNode);
  }

  function processFragment(
    preVnode: VNodeFragment | null,
    vnode: VNodeFragment,
    container: Element,
    parentComponent: ComponentInternalInstance['parent']
  ) {
    mountChildren(vnode.children as VNode[], container, parentComponent);
  }

  /**
   * @description 处理 element
   */
  function processElement(
    preVnode: VNodeString | null,
    vnode: VNodeString,
    container: Element,
    parentComponent: ComponentInternalInstance['parent']
  ) {
    if (preVnode) {
      patchElement(preVnode, vnode, parentComponent);
    } else {
      mountElement(vnode, container, parentComponent);
    }
  }

  function patchElement(
    preVnode: VNodeString,
    vnode: VNodeString,
    parentComponent: ComponentInternalInstance['parent']
  ) {
    const { props: preProps = EMPTY_OBJ } = preVnode;
    const { props: currProps = EMPTY_OBJ } = vnode;

    const el = (vnode.el = preVnode.el);

    patchProps(preProps, currProps, el!);
    patchChildren(preVnode, vnode, el!, parentComponent);
  }

  function patchChildren(
    preVnode: VNodeString,
    vnode: VNodeString,
    container: Element,
    parentComponent: ComponentInternalInstance['parent']
  ) {
    const { shapeFlag, children } = vnode;
    const { shapeFlag: preShapeFlag, children: preChildren } = preVnode;

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // array to text
      if (preShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        unmountChildren(preVnode.children as VNode[]);
      }

      // text to text
      if (children !== preChildren) {
        _setElementTExt(container, children as string);
      }
    } else {
      // text to array
      if (preShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        _setElementTExt(container, '');
        mountChildren(vnode.children as VNode[], container, parentComponent);
      }
    }
  }

  function unmountChildren(children: VNode[]) {
    for (const item of children) {
      _unmount(item.el!);
    }
  }

  function patchProps(
    preProps: VNodeProps,
    currProps: VNodeProps,
    el: Element
  ) {
    if (preProps !== currProps) {
      for (const key in currProps) {
        const preVal = preProps[key];
        const currVal = currProps[key];

        if (preVal !== currVal) {
          _patchProp(el, key, preVal, currVal);
        }
      }

      if (preProps !== EMPTY_OBJ) {
        for (const key in preProps) {
          if (!(key in currProps)) {
            _patchProp(el, key, preProps[key], null);
          }
        }
      }
    }
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
      mountChildren(vnode.children as VNode[], el, parentComponent);
    }

    // props
    for (const key in props) {
      const val = props[key];

      _patchProp(el, key, null, val);
    }

    _insert(el, container);
  }

  function mountChildren(
    children: VNode[],
    container: Element,
    parentComponent: ComponentInternalInstance['parent']
  ) {
    children.forEach((v) => {
      patch(null, v, container, parentComponent);
    });
  }

  /**
   * @description 处理组件
   */
  function processComponent(
    preVnode: VNodeComponent | null,
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
    effect(() => {
      if (instance.isMounted) {
        const { proxy } = instance;

        const preSubTree = instance.subTree;
        const subTree = (instance.subTree = instance.render!.call(proxy));

        patch(preSubTree!, subTree, container, instance);
      } else {
        const { proxy } = instance;

        const subTree = (instance.subTree = instance.render!.call(proxy));

        // 递归处理 subTree
        patch(null, subTree, container, instance);

        // el 一定存在: 递归处理 subTree 时，会将 subTree.el 赋值 (最后一个根节点一定是 Element, 否则就无限循环了)
        initialVNode.el = subTree.el;

        instance.isMounted = true;
      }
    });

    /**
     * todo:
     * 支持在组件的 props 上传入事件监听, 在 el 上挂载 instance.props 上监听的事件
     * 目前只支持监听组件的 emit 事件
     */
  }
}
