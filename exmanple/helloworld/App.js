import { h } from '../../lib/tycho-vue.esm.js';

export const App = {
  render() {
    return h('div', 'hi, ' + this.msg);
  },

  setup() {
    return {
      msg: 'tycho-vue',
    };
  },
};
