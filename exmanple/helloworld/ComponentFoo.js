import { h } from '../../lib/tycho-vue.esm.js';

export const Foo = {
  setup(props) {
    console.log('Foo Component props: ', props);
  },
  render() {
    return h('div', {}, 'foo: ' + this.count);
  },
};
