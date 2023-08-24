export * from '@tycho-vue/runtime-core';

import { createRenderer, Component } from '@tycho-vue/runtime-core';

function createElement(type) {
  return document.createElement(type);
}

function patchProp(el: Element, key: string, preVal, val) {
  const isOn = (key: string) => /^on[A-Z]/.test(key);
  if (isOn(key)) {
    el.addEventListener(getEventName(key), val);
  } else {
    if (val == null) {
      el.removeAttribute(key);
    } else {
      el.setAttribute(key, val);
    }
  }
}

function getEventName(key: string) {
  return key.slice(2).toLowerCase();
}

/**
 * move or insert element before anchor
 */
function insert(el: Element, container: Element, anchor?: Element) {
  container.insertBefore(el, anchor || null);
}

function unmount(el: Element) {
  const parent = el.parentElement;

  if (parent) {
    parent.removeChild(el);
  }
}

function setElementTExt(el: Element, text: string) {
  el.textContent = text;
}

const renderer = createRenderer({
  insert,
  patchProp,
  createElement,
  unmount,
  setElementTExt,
});

export function createApp(args: Component) {
  return renderer.createApp(args);
}
