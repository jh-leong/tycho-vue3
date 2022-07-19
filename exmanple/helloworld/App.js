import { h } from '../../lib/tycho-vue.esm.js';

export const App = {
  render() {
    return h(
      'div',
      {
        id: 'root',
        class: ['red', 'root_wrap'],
      },
      // 'hi, ' + this.msg
      // 'hi, tycho-vue'
      [h('p', { class: 'red' }, 'hi'), h('p', { class: 'blue' }, 'tycho-vue')]
    );
  },

  setup() {
    return {
      msg: 'tycho-vue',
    };
  },
};
