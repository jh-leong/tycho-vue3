import { effect } from '@tycho-vue/reactivity';
import { EMPTY_OBJ, ShapeFlags } from '@tycho-vue/shared';
import {
  setupComponent,
  createComponentInstance,
  ComponentInternalInstance,
} from './component';
import { shouldUpdateComponent } from './componentUpdateUtils';
import { createAppAPI } from './createApp';
import { queueJobs } from './scheduler';
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
  insert(el: Element, parent: Element, anchor?: Element | Text | null): void;
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

      if (!isSameVnodeType(n1, n2)) break;

      patch(n1, n2, container, parentComponent, parentAnchor);
      i++;
    }

    // 2. sync from end
    while (i <= end()) {
      const n1 = preChildren[e1];
      const n2 = children[e2];

      if (!isSameVnodeType(n1, n2)) break;

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
     * (a b)
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
    } else {
      /**
       * 5. unknown sequence
       * matching nodes & remove nodes that are no longer present
       */
      let s1 = i;
      let s2 = i;

      let patched = 0;
      const toBePatched = e2 - i + 1;
      const keyToNewIndexMap = new Map();

      /**
       * 0 for node to be mounted
       */
      const newIndexToOldIndexMap = new Array<number>(toBePatched).fill(0);

      /**
       * true: node has been moved
       */
      let moved = false;
      let preNewIndex = 0;

      for (let i = s2; i <= e2; i++) {
        keyToNewIndexMap.set(children[i].key, i);
      }

      for (let i = s1; i <= e1; i++) {
        const preVNode = preChildren[i];

        if (patched > toBePatched) {
          _unmount(preVNode.el!);
          continue;
        }

        let newIndex: number | undefined;

        if (preVNode.key != null) {
          newIndex = keyToNewIndexMap.get(preVNode.key);
        } else {
          for (let j = s2; j <= e2; j++) {
            if (isSameVnodeType(preVNode, children[j])) {
              newIndex = j;
              break;
            }
          }
        }

        // no matching node
        if (newIndex === undefined) {
          _unmount(preVNode.el!);
        } else {
          if (newIndex >= preNewIndex) {
            preNewIndex = newIndex;
          } else {
            moved = true;
          }

          newIndexToOldIndexMap[newIndex - s2] = i + 1;

          patch(
            preVNode,
            children[newIndex],
            container,
            parentComponent,
            parentAnchor
          );
          patched++;
        }
      }

      const increasingNewIndexSequence = moved
        ? getSequence(newIndexToOldIndexMap)
        : [];

      // looping backwards so that we can use last patched node as anchor
      for (
        let i = toBePatched - 1, j = increasingNewIndexSequence.length - 1;
        i >= 0;
        i--
      ) {
        const childIndex = i + s2;
        const el = children[childIndex].el as Element;
        const anchor = children[childIndex + 1]?.el;

        if (newIndexToOldIndexMap[i] === 0) {
          patch(null, children[childIndex], container, parentComponent, anchor);
        } else if (moved) {
          if (j < 0 || i !== increasingNewIndexSequence[j]) {
            _insert(el, container, anchor);
          } else {
            j--;
          }
        }
      }
    }

    function isSameVnodeType(n1: VNode, n2: VNode) {
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
    if (preVnode) {
      updateComponent(preVnode, vnode);
    } else {
      mountComponent(vnode, container, parentComponents, anchor);
    }
  }

  function mountComponent(
    initialVNode: VNodeComponent,
    container: Element,
    parentComponent: ComponentInternalInstance['parent'],
    anchor: Element | Text | null
  ) {
    const instance = (initialVNode.component = createComponentInstance(
      initialVNode,
      parentComponent
    ));

    setupComponent(instance);
    setupRenderEffect(instance, initialVNode, container, anchor);
  }

  /**
   * @description 更新组件
   * 重新调用 render 对比新旧 vnode, 更新组件
   */
  function updateComponent(preVnode: VNodeComponent, vnode: VNodeComponent) {
    const instance = (vnode.component = preVnode.component!);

    if (shouldUpdateComponent(preVnode, vnode)) {
      instance.next = vnode;
      instance.update!();
    } else {
      vnode.el = preVnode.el;
      instance.vnode = vnode;
    }
  }

  function setupRenderEffect(
    instance: ComponentInternalInstance,
    initialVNode: VNode,
    container: Element,
    anchor: Element | Text | null
  ) {
    instance.update = effect(
      () => {
        const { proxy } = instance;
        if (!instance.isMounted) {
          instance.subTree = instance.render!.call(proxy, proxy as any);

          // 递归处理 subTree
          patch(null, instance.subTree, container, instance, anchor);

          // el 一定存在: 递归处理 subTree 时，会将 subTree.el 赋值
          // 最后一个根节点一定是 Element, 否则就无限循环了
          initialVNode.el = instance.subTree.el;

          instance.isMounted = true;

          return;
        }

        const { next, vnode, subTree: preSubTree } = instance;

        if (next) {
          next.el = vnode.el;
          updateComponentPreRender(instance, next);
        }

        instance.subTree = instance.render!.call(proxy, proxy as any);

        patch(preSubTree!, instance.subTree, container, instance, anchor);
      },
      {
        scheduler() {
          queueJobs(instance.update!);
        },
      }
    );

    /**
     * 更新组件 instance 的属性 vnode, props
     */
    function updateComponentPreRender(
      instance: ComponentInternalInstance,
      nextVNode: VNodeComponent
    ) {
      instance.next = null;
      instance.vnode = nextVNode;
      instance.props = nextVNode.props || {};
    }
  }
}

function getSequence(arr) {
  const p = arr.slice();
  const result = [0];
  let i, j, u, v, c;
  const len = arr.length;
  for (i = 0; i < len; i++) {
    const arrI = arr[i];
    if (arrI !== 0) {
      j = result[result.length - 1];
      if (arr[j] < arrI) {
        p[i] = j;
        result.push(i);
        continue;
      }
      u = 0;
      v = result.length - 1;
      while (u < v) {
        c = (u + v) >> 1;
        if (arr[result[c]] < arrI) {
          u = c + 1;
        } else {
          v = c;
        }
      }
      if (arrI < arr[result[u]]) {
        if (u > 0) {
          p[i] = result[u - 1];
        }
        result[u] = i;
      }
    }
  }
  u = result.length;
  v = result[u - 1];
  while (u-- > 0) {
    result[u] = v;
    v = p[v];
  }
  return result;
}
