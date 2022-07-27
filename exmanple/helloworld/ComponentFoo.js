import { h } from '../../lib/tycho-vue.esm.js';

export const Foo = {
  setup(props, { emit }) {
    console.log('Foo Component: ', arguments);

    const emitAdd = () => {
      console.log('inEmitAdd');
      emit('add-foo-foo', 1, 2);
      return;
    };

    return {
      emitAdd,
    };
  },
  render() {
    const btn = h('button', { onClick: this.emitAdd }, 'emitButton');
    const child1 = h('p', {}, 'foo: ' + this.count);

    return h('div', {}, [child1, btn]);
  },
};
