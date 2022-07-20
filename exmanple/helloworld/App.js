import { h } from '../../lib/tycho-vue.esm.js';

// 用于测试 render 的 this
window.__this = null;

export const App = {
  render() {
    window.__this = this;

    const type = 'div';

    const props = {
      id: 'root',
      class: ['red', 'root_wrap'],
    };

    const children = 'hi, ' + this.msg;
    // const children = [
    //   h('p', { class: 'red' }, 'hi'),
    //   h('p', { class: 'blue' }, this.msg),
    // ];

    return h(type, props, children);
  },

  setup() {
    return {
      msg: 'tycho-vue',
    };
  },
};
