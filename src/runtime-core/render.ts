import { createComponentInstance, setupComponent } from './component';

export function render(vnode, container) {
  path(vnode, container);
}

function path(vnode, container) {
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
