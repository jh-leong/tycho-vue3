import {
  h,
  inject,
  provide,
  renderSlots,
  getCurrentInstance,
  createTextVNode,
} from '../../dist/tycho-vue.esm.js';

const FooChild = {
  name: 'FooChild',
  setup() {
    const AppProvide = inject('AppProvide');
    const AppProvide2 = inject('AppProvide2');

    const provide1 = inject('provide1', 'defaultProvide1');
    const provide2 = inject('provide1', () => 'defaultProvide2');

    const instance = getCurrentInstance();

    return { AppProvide, AppProvide2, provide1, provide2 };
  },
  render() {
    return h(
      'div',
      {},
      `FooChild inject [AppProvide - ${this.AppProvide}], [AppProvide2 - ${
        this.AppProvide2
      }], [${this.provide1 + ' ' + this.provide2}]`
    );
  },
};

/**
 * 组件 Foo
 */
export const Foo = {
  name: 'ComponentFoo',
  setup(props, { emit }) {
    const instance = getCurrentInstance();

    const emitAdd = () => {
      console.log('inEmitAdd');
      emit('add-foo-foo', 1, 2);
      return;
    };

    const inject2Slot = 'inject2Slot';

    provide('AppProvide2', 'fromComponentFoo');
    const AppProvide2 = inject('AppProvide2');

    return {
      emitAdd,
      AppProvide2,
      inject2Slot,
    };
  },
  render() {
    const btn = h(
      'button',
      {
        onClick: this.emitAdd,
      },
      'emitButton'
    );

    const child1 = h(
      'p',
      {
        onClick: () => console.log('on P click'),
      },
      'root - child2: FooComponent: ' + this.count
    );

    return h(
      'div',
      {
        class: ['Foo_wrap p-24 border-1 m-12'],
      },
      [
        child1,
        btn,
        // 定义具名插槽
        renderSlots(this.$slots, 'slot1', {
          slot1ScopeValue: this.inject2Slot,
        }),
        renderSlots(this.$slots, 'slot2'),
        createTextVNode(`Foo inject [AppProvide2 - ${this.AppProvide2}]`),
        h(FooChild),
      ]
    );
  },
};
