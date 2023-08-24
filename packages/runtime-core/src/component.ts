import { proxyRefs } from '@tycho-vue/reactivity';
import { shallowReadonly } from '@tycho-vue/reactivity';
import { emit } from './componentEmit';
import { PublicInstanceHandlers } from './componentPublicInstance';
import { initProps } from './componentsProps';
import { initSlot } from './componetSlots';
import { SlotProps } from './helper/renderSlots';
import {
  VNode,
  Component,
  RenderFunction,
  VNodeProps,
  VNodeComponent,
} from './vnode';

export type ComponentSlots = Record<string, (props: SlotProps) => VNode[]>;

export type ComponentInternalInstance = {
  vnode: VNodeComponent;
  type: Component;
  setupState: any;
  props: VNodeProps;
  emit: Function;
  slots: ComponentSlots;
  parent: ComponentInternalInstance | null;
  provides: Record<PropertyKey, unknown>;
  isMounted: boolean;
  /** 新渲染的 vnode, 用于 diff 时和旧 vnode 做对比 */
  next: VNodeComponent | null;
  update: null | (() => void);
  render?: RenderFunction;
  proxy?: { instance: ComponentInternalInstance };
  subTree?: VNode;
};

export function createComponentInstance(
  vnode: VNodeComponent,
  parent: ComponentInternalInstance['parent'] = null
): ComponentInternalInstance {
  const componentInstance: ComponentInternalInstance = {
    vnode,
    type: vnode.type,
    setupState: {},
    props: {},
    slots: {},
    parent,
    provides: parent?.provides || {},
    emit: () => {},
    isMounted: false,
    next: null,
    update: null,
  };

  componentInstance.emit = emit.bind(null, componentInstance);

  return componentInstance;
}

/**
 * @description setupComponent 的作用是初始化组件的 props、slots、attrs、setupState 等
 */
export function setupComponent(instance: ComponentInternalInstance) {
  initProps(instance, instance.vnode.props);

  initSlot(instance, instance.vnode.children);

  setupStatefulComponent(instance);
}

/**
 * @description setupStatefulComponent 的作用是初始化组件的 setupState
 */
function setupStatefulComponent(instance: ComponentInternalInstance) {
  const { type, props } = instance;

  const Component = type as Component;

  // 代理对象
  // 使 render 函数中可以直接通过 this 访问公共属性和 setUp 返回的值
  instance.proxy = new Proxy({ instance }, PublicInstanceHandlers);

  const { setup } = Component;

  if (setup) {
    setCurrentInstance(instance);
    const setupResult = setup(shallowReadonly(props), {
      emit: instance.emit,
    });
    setCurrentInstance(null);

    handleSetupResult(instance, setupResult);
  }
}

/**
 * @description handleSetupResult 的作用是处理 setup 函数的返回值
 */
function handleSetupResult(
  instance: ComponentInternalInstance,
  setupResult: any
) {
  if (typeof setupResult === 'object') {
    instance.setupState = proxyRefs(setupResult);
  }

  // todo if setupResult is function

  finishComponentSetup(instance);
}

function finishComponentSetup(instance: ComponentInternalInstance) {
  const Component = instance.type as Component;

  if (compiler && !Component.render) {
    if (Component.template) {
      Component.render = compiler(Component.template);
    }
  }

  instance.render = Component.render;
}

let currentInstance: null | ComponentInternalInstance = null;
export function getCurrentInstance() {
  return currentInstance;
}

// 抽离 set 方法, 便于断点调试
const setCurrentInstance = (instance: typeof currentInstance) => {
  currentInstance = instance;
};

type CompileFunction = (template: string) => RenderFunction;

let compiler: CompileFunction;
export function registerRuntimeComplier(_compiler: CompileFunction) {
  compiler = _compiler;
}
