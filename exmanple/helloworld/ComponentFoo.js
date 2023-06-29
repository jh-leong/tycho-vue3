import { h, renderSlots } from '../../lib/tycho-vue.esm.js';

/**
 * 组件 Foo
 */
export const Foo = {
  name: 'ComponentFoo',
  setup(props, { emit }) {
    console.warn('🚀\n ~ file: ComponentFoo.js:5 ~ setup ~ props:', props);

    // props is readonly

    const emitAdd = () => {
      console.log('inEmitAdd');
      emit('add-foo-foo', 1, 2);
      return;
    };

    const inject2Slot = 'inject2Slot';

    return {
      emitAdd,
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
      ]
    );
  },
};
