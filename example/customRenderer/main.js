import App from './App.js';
import { game, createRootContainer } from './game.js';
import { createRenderer } from '../../lib/tycho-vue.esm.js';

document.body.append(game.view);

// 给基于 pixi.js 的渲染函数
const renderer = createRenderer({
  createElement(type) {
    const rect = new PIXI.Graphics();
    rect.beginFill(0xff0000);
    rect.drawRect(0, 0, 100, 100);
    rect.endFill();

    return rect;
  },

  patchProp(el, key, val) {
    el[key] = val;
  },

  insert(el, parent) {
    parent.addChild(el);
  },
});

export function createApp(rootComponent) {
  return renderer.createApp(rootComponent);
}

createApp(App).mount(createRootContainer());
