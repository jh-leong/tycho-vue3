import { h } from '../../lib/tycho-vue.esm.js';
import { Foo } from './ComponentFoo.js';

// 用于测试 render 的 this
window.__this = null;

export const App = {
  name: 'App',
  render() {
    window.app = this;

    const type = 'div';

    const props = {
      id: 'root',
      class: ['red', 'root_wrap'],
      onClick() {
        // console.log('onClickRoot');
      },
    };

    // const children = 'hi, ' + this.msg;
    // const children = [
    //   h('p', { class: 'red' }, 'hi'),
    //   h('p', { class: 'blue' }, this.msg),
    // ];
    const children = [
      h('div', {}, 'hi, ' + this.msg),
      h(Foo, {
        count: 1,
        onAddFooFoo(a, b) {
          console.log('onAddFooFoo', a, b);
        },
      }),
    ];

    return h(type, props, children);
  },

  setup() {
    return {
      msg: 'tycho-vue',
    };
  },
};
