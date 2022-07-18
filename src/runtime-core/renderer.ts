import { createComponentInstance, setupComponent } from './component';

export function render(vnode, container) {
  path(vnode, container);
}

function path(vnode, container) {
  // todo: 判断 vnode 是否为 element
  // processElement();

  processComponent(vnode, container);
}

function processComponent(vnode, container) {
  mountComponent(vnode, container);
}

function mountComponent(vnode, container) {
  const instance = createComponentInstance(vnode);

  setupComponent(instance);
  setupRenderEffect(instance, container);
}

function setupRenderEffect(instance, container) {
  const subTree = instance.render();

  path(subTree, container);
}

function processElement() {
  throw new Error('Function not implemented.');
}
