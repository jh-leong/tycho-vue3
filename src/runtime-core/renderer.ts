import { isObject } from '../shared';
import { createComponentInstance, setupComponent } from './component';

export function render(vnode, container) {
  path(vnode, container);
}

function path(vnode, container) {
  if (typeof vnode.type === 'string') {
    processElement(vnode, container);
  } else if (isObject(vnode.type)) {
    processComponent(vnode, container);
  }
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

function processElement(vnode, container) {
  mountElement(vnode, container);
}

function mountElement(vnode: any, container: any) {
  const el = document.createElement(vnode.type);

  const { children, props } = vnode;

  if (typeof children === 'string') {
    el.textContent = children;
  } else if (Array.isArray(children)) {
    mountChildren(vnode, el);
  }

  // props
  for (const key in props) {
    const val = props[key];
    el.setAttribute(key, val);
  }

  container.append(el);
}
function mountChildren(vnode, container) {
  vnode.children.forEach((v) => {
    path(v, container);
  });
}
