import { h } from '../../lib/tycho-vue.esm.js';
import { Foo } from './ComponentFoo.js';

export const App = {
  name: 'App',
  render() {
    window.app = this;

    const props = {
      id: 'root',
      class: ['red', 'root_wrap'],
      onClick() {
        console.log('onClickRoot');
      },
    };

    const children = [
      // 普通元素
      h('div', {}, 'root - child1: hi, ' + this.msg),
      // 组件
      h(Foo, {
        count: 1,
        onAddFooFoo(a, b) {
          console.log('onAddFooFoo', a, b);
        },
        // todo: 支持在组件的 props 上定义事件监听, 目前只支持监听组件的 emit 事件
      }),
    ];

    return h('div', props, children);
  },

  setup() {
    return {
      msg: 'tycho-vue',
    };
  },
};
