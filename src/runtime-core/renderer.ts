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
  insert(el: Element, parent: Element, anchor: Element | Text | null): void;
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
    patch(null, vnode, container, null, null);
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
    parentComponent: ComponentInternalInstance['parent'],
    anchor: Element | Text | null
  ) {
    const { type, shapeFlag } = vnode;

    switch (type) {
      case FRAGMENT:
        processFragment(preVnode, vnode, container, parentComponent, anchor);
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
            parentComponent,
            anchor
          );
        }
        // 传入的是一个组件
        else if (isComponent(vnode)) {
          processComponent(preVnode, vnode, container, parentComponent, anchor);
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
    parentComponent: ComponentInternalInstance['parent'],
    anchor: Element | Text | null
  ) {
    mountChildren(
      vnode.children as VNode[],
      container,
      parentComponent,
      anchor
    );
  }

  /**
   * @description 处理 element
   */
  function processElement(
    preVnode: VNodeString | null,
    vnode: VNodeString,
    container: Element,
    parentComponent: ComponentInternalInstance['parent'],
    anchor: Element | Text | null
  ) {
    if (preVnode) {
      patchElement(preVnode, vnode, parentComponent, anchor);
    } else {
      mountElement(vnode, container, parentComponent, anchor);
    }
  }

  function patchElement(
    preVnode: VNodeString,
    vnode: VNodeString,
    parentComponent: ComponentInternalInstance['parent'],
    anchor: Element | Text | null
  ) {
    const { props: preProps = EMPTY_OBJ } = preVnode;
    const { props: currProps = EMPTY_OBJ } = vnode;

    const el = (vnode.el = preVnode.el);

    patchProps(preProps, currProps, el!);
    patchChildren(preVnode, vnode, el!, parentComponent, anchor);
  }

  function patchChildren(
    preVnode: VNodeString,
    vnode: VNodeString,
    container: Element,
    parentComponent: ComponentInternalInstance['parent'],
    anchor: Element | Text | null
  ) {
    const { shapeFlag, children } = vnode;
    const { shapeFlag: preShapeFlag, children: preChildren } = preVnode;

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // array to text
      if (preShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        unmountChildren(preChildren as VNode[]);
      }

      // text to text
      if (children !== preChildren) {
        _setElementTExt(container, children as string);
      }
    } else {
      // text to array
      if (preShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        _setElementTExt(container, '');
        mountChildren(children as VNode[], container, parentComponent, anchor);
      }
      // array to array
      else {
        patchKeyedChildren(
          preChildren as VNode[],
          children as VNode[],
          container,
          parentComponent,
          anchor
        );
      }
    }
  }

  function patchKeyedChildren(
    preChildren: VNode[],
    children: VNode[],
    container: Element,
    parentComponent: ComponentInternalInstance['parent'],
    parentAnchor: Element | Text | null = null
  ) {
    let i = 0;
    let e1 = preChildren.length - 1;
    let e2 = children.length - 1;

    const end = () => Math.min(e1, e2);

    // 1. sync from start
    while (i <= end()) {
      const n1 = preChildren[i];
      const n2 = children[i];

      if (!isSomeVnodeType(n1, n2)) break;

      patch(n1, n2, container, parentComponent, parentAnchor);
      i++;
    }

    // 2. sync from end
    while (i <= end()) {
      const n1 = preChildren[e1];
      const n2 = children[e2];

      if (!isSomeVnodeType(n1, n2)) break;

      patch(n1, n2, container, parentComponent, parentAnchor);
      e1--;
      e2--;
    }

    /**
     * 3. common sequence + mount
     *
     * - inset in the end
     * (a b)
     * (a b) c
     *
     * - inset in the start
     * a b)
     * c (a b)
     */
    if (i > e1 && i <= e2) {
      const anchor = e2 + 1 < children.length ? children[e2 + 1].el : null;

      while (i <= e2) {
        patch(null, children[i], container, parentComponent, anchor);
        i++;
      }
    } else if (i > e2) {
      /**
       * 4. common sequence + unmount
       *
       * - remove from the end
       * (a b) c
       * (a b)
       *
       * - remove from the start
       * c (a b)
       * (a b)
       */
      while (i <= e1) {
        _unmount(preChildren[i].el!);
        i++;
      }
    }

    function isSomeVnodeType(n1: VNode, n2: VNode) {
      return n1.type === n2.type && n1.key === n2.key;
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
    parentComponent: ComponentInternalInstance['parent'],
    parentAnchor: Element | Text | null = null
  ) {
    const el = _createElement(vnode.type);
    vnode.el = el;

    const { children, props, shapeFlag } = vnode;

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      el.textContent = children as string;
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(
        vnode.children as VNode[],
        el,
        parentComponent,
        parentAnchor
      );
    }

    // props
    for (const key in props) {
      const val = props[key];

      _patchProp(el, key, null, val);
    }

    _insert(el, container, parentAnchor);
  }

  function mountChildren(
    children: VNode[],
    container: Element,
    parentComponent: ComponentInternalInstance['parent'],
    anchor: Element | Text | null
  ) {
    children.forEach((v) => {
      patch(null, v, container, parentComponent, anchor);
    });
  }

  /**
   * @description 处理组件
   */
  function processComponent(
    preVnode: VNodeComponent | null,
    vnode: VNodeComponent,
    container: Element,
    parentComponents: ComponentInternalInstance['parent'],
    anchor: Element | Text | null
  ) {
    mountComponent(vnode, container, parentComponents, anchor);
  }

  function mountComponent(
    initialVNode: VNodeComponent,
    container: Element,
    parentComponent: ComponentInternalInstance['parent'],
    anchor: Element | Text | null
  ) {
    const instance = createComponentInstance(initialVNode, parentComponent);

    setupComponent(instance);
    setupRenderEffect(instance, initialVNode, container, anchor);
  }

  function setupRenderEffect(
    instance: ComponentInternalInstance,
    initialVNode: VNode,
    container: Element,
    anchor: Element | Text | null
  ) {
    effect(() => {
      if (instance.isMounted) {
        const { proxy } = instance;

        const preSubTree = instance.subTree;
        const subTree = (instance.subTree = instance.render!.call(proxy));

        patch(preSubTree!, subTree, container, instance, anchor);
      } else {
        const { proxy } = instance;

        const subTree = (instance.subTree = instance.render!.call(proxy));

        // 递归处理 subTree
        patch(null, subTree, container, instance, anchor);

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
