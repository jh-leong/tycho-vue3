import { hasOwn } from '@tycho-vue/shared';
import { ComponentInternalInstance } from './component';

const publicPropertiesMap = {
  $el: (i: ComponentInternalInstance) => i.vnode.el,
  $slots: (i: ComponentInternalInstance) => i.slots,
  $props: (i: ComponentInternalInstance) => i.props,
};

export const PublicInstanceHandlers = {
  get({ instance }: { instance: ComponentInternalInstance }, key: string) {
    const { setupState, props } = instance;

    if (key in setupState) {
      return setupState[key];
    }

    if (hasOwn(setupState, key)) {
      return setupState[key];
    } else if (hasOwn(props, key)) {
      return props[key];
    }

    const publicGetter = publicPropertiesMap[key];
    if (publicGetter) {
      return publicGetter(instance);
    }
  },
};
