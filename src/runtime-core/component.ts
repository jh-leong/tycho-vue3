import { PublicInstanceHandlers } from './componentPublicInstance';

export function createComponentInstance(vnode) {
  const component = {
    vnode,
    type: vnode.type,
    setupState: {},
  };

  return component;
}

export function setupComponent(instance) {
  // todo
  // initProps()
  // initSlot()

  setupStatefulComponent(instance);
}

function setupStatefulComponent(instance) {
  const { type } = instance;
  const Component = type;

  // 代理对象
  // 使 render 函数中可以直接通过 this 访问公共属性和 setUp 返回的值
  instance.proxy = new Proxy({ instance }, PublicInstanceHandlers);

  const { setup } = Component;

  if (setup) {
    const setupResult = setup();

    handleSetupResult(instance, setupResult);
  }
}

function handleSetupResult(instance, setupResult) {
  if (typeof setupResult === 'object') {
    instance.setupState = setupResult;
  }
  // todo function

  finishComponentSetup(instance);
}

function finishComponentSetup(instance: any) {
  const Component = instance.type;

  instance.render = Component.render;
}
