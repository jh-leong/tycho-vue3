export * from '../runtime-core';

import { createRenderer } from '../runtime-core';
import { Component } from '../runtime-core/vnode';

function createElement(type) {
  return document.createElement(type);
}

function patchProp(el: Element, key: string, val) {
  const isOn = (key: string) => /^on[A-Z]/.test(key);
  if (isOn(key)) {
    el.addEventListener(getEventName(key), val);
  } else {
    el.setAttribute(key, val);
  }
}

function getEventName(key: string) {
  return key.slice(2).toLowerCase();
}

function insert(el: Element, container: Element) {
  container.append(el);
}

const renderer = createRenderer({
  insert,
  patchProp,
  createElement,
});

export function createApp(args: Component) {
  return renderer.createApp(args);
}
