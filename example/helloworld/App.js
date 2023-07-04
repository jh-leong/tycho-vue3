import {
  h,
  provide,
  createTextVNode,
  getCurrentInstance,
} from '../../lib/tycho-vue.esm.js';
import { Foo } from './ComponentFoo.js';

export const App = {
  name: 'App',
  setup() {
    const instance = getCurrentInstance();
    console.warn('🚀\n ~ file: App.js:8 ~ setup ~ instance:', instance);

    const onAddFooFoo = (a, b) => {
      this.count += a + b;
    };

    provide('AppProvide', 'fromApp');
    provide('AppProvide2', 'fromApp');

    return {
      msg: 'tycho-vue',
      count: 0,
      onAddFooFoo,
    };
  },
  render() {
    window.app = this;

    return h(
      'div',
      {
        id: 'root',
        class: ['red', 'root_wrap'],
        onClick() {
          console.log('onClickRoot');
        },
      },
      [
        // 普通元素
        h(
          'div',
          {
            class: ['p-24 border-1 m-12 _center'],
          },
          `root - child1: hi, ${this.msg} - count: ${this.count}`
        ),
        // 组件
        h(
          Foo,
          {
            count: 1,
            onAddFooFoo: this.onAddFooFoo,
          },
          // 向组件注入具名插槽
          {
            slot1: ({ slot1ScopeValue }) => [
              h(
                'p',
                {
                  style: 'color: blue;',
                },
                `App 注入 Foo 的 slot1, slot1ScopeValue: ${slot1ScopeValue}`
              ),
              createTextVNode('slot1 的第二个元素 CREATE_TEXT'),
            ],
            slot2: () =>
              h(
                'p',
                {
                  style: 'color: blue;',
                },
                'slot2'
              ),
          }
        ),
      ]
    );
  },
};
