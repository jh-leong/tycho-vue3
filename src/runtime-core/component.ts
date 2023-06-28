import { shallowReadonly } from '../reactivity/reactive';
import { emit } from './componentEmit';
import { PublicInstanceHandlers } from './componentPublicInstance';
import { initProps } from './componentsProps';
import { VNode, Component, RenderFunction, VNodeProps } from './vnode';

export type ComponentInternalInstance = {
  vnode: VNode;
  type: VNode['type'];
  setupState: any;
  props: VNodeProps;
  emit: Function;
  render?: RenderFunction;
  proxy?: { instance: ComponentInternalInstance };
};

export function createComponentInstance(
  vnode: VNode
): ComponentInternalInstance {
  const componentInstance: ComponentInternalInstance = {
    vnode,
    type: vnode.type,
    setupState: {},
    props: {},
    emit: () => {},
  };

  componentInstance.emit = emit.bind(null, componentInstance) as any;

  return componentInstance;
}

/**
 * @description setupComponent 的作用是初始化组件的 props、slots、attrs、setupState 等
 */
export function setupComponent(instance: ComponentInternalInstance) {
  // todo
  // initSlot()
  initProps(instance, instance.vnode.props);

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
    const setupResult = setup(shallowReadonly(props), {
      emit: instance.emit,
    });

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
    instance.setupState = setupResult;
  }
  // todo if setupResult is function

  finishComponentSetup(instance);
}

function finishComponentSetup(instance: ComponentInternalInstance) {
  const Component = instance.type as Component;

  instance.render = Component.render;
}
