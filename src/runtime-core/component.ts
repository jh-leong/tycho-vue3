export function createComponentInstance(vnode) {
  const component = {
    vnode,
    type: vnode.type,
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
  const Component = instance.type;

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
