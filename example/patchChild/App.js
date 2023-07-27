import {
  h,
  ref,
  provide,
  createTextVNode,
  getCurrentInstance,
} from '../../lib/tycho-vue.esm.js';

const Text2text = {
  name: 'Text2text',
  setup() {
    const text2text = ref(false);
    window.text2text = text2text;
    return { text2text };
  },
  render() {
    return this.text2text
      ? h('div', {}, 'text2text')
      : h('div', {}, 'text2textChange');
  },
};

const Text2Array = {
  name: 'Text2Array',
  setup() {
    const text2Array = ref(true);
    window.text2Array = text2Array;
    return { text2Array };
  },
  render() {
    return this.text2Array
      ? h('div', {}, 'text2Array')
      : h('div', {}, [
          h('div', {}, 'text2Array - A'),
          h('div', {}, 'text2Array - B'),
        ]);
  },
};

const PatchChild = {
  name: 'PatchChild',
  setup() {
    const toggleChild = ref(true);
    window.toggleChild = toggleChild;
    return {
      toggleChild,
    };
  },
  render() {
    const child = this.toggleChild
      ? [
          h('p', { key: 'A' }, 'A'),
          // (
          h('p', { key: 'B' }, 'B'),
          h('p', { key: 'C' }, 'C'),
          h('p', { key: 'D' }, 'D'),
          h('p', { key: 'E' }, 'E'),
          // )
          h('p', { key: 'F' }, 'F'),
          h('p', { key: 'G' }, 'G'),
        ]
      : [
          h('p', { key: 'A' }, 'A'),
          // (
          h('p', { key: 'C' }, 'C'),
          h('p', { key: 'B' }, 'B'),
          // h('p', { key: 'D' }, 'D'),
          h('p', { key: 'E' }, 'E'),
          h('p', { key: 'Z' }, 'Z'),
          // )
          h('p', { key: 'F' }, 'F'),
          h('p', { key: 'G' }, 'G'),
        ];

    return h('div', {}, child);
  },
};

const PatchComponent = {
  name: 'PatchComponent',
  setup() {
    //
  },
  render() {
    return h(
      'div',
      {},
      'PatchComponent > this.$props.msg > ' + this.$props.msg
    );
  },
};

export const App = {
  name: 'App',
  setup() {
    const toggleText2text = () => {
      window.text2text.value = !window.text2text.value;
    };

    const toggleText2array = () => {
      window.text2Array.value = !window.text2Array.value;
    };

    const toggleChild = () => {
      window.toggleChild.value = !window.toggleChild.value;
    };

    const msg = ref('0');

    const togglePatchComponent = () => {
      msg.value = Math.random();
      msg.value = Math.random();
    };
    togglePatchComponent();

    const count = ref(0);
    const increaseCount = () => {
      count.value++;
    };

    return {
      toggleChild,
      toggleText2text,
      toggleText2array,
      msg,
      togglePatchComponent,
      count,
      increaseCount,
    };
  },
  render() {
    return h(
      'div',
      {
        id: 'root',
        class: 'red root_wrap',
      },
      [
        // h('button', { onClick: this.toggleText2text }, 'toggleText2text'),
        // h('button', { onClick: this.toggleText2array }, 'toggleText2array'),
        // h(Text2Array, { class: ['p-24'] }),
        // h(Text2text, { class: ['p-24'] }),
        // h('button', { onClick: this.toggleChild }, 'toggleChild'),
        // h(PatchChild, { class: ['p-24'] }),
        h(
          'button',
          { onClick: this.increaseCount },
          'button updateCount => ' + this.count
        ),
        h(
          'button',
          { onClick: this.togglePatchComponent },
          'update msg =>' + this.msg
        ),
        // h(PatchComponent, { msg: this.msg }, { class: ['p-24'] }),
      ]
    );
  },
};
