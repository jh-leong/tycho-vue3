import { ShapeFlags } from '@tycho-vue/shared';
import { ComponentInternalInstance, ComponentSlots } from './component';
import { SlotProps } from './helper/renderSlots';
import { VNode, VNodeComponent } from './vnode';

/**
 * @description initSlot 的作用是初始化组件 instance.slots
 */
export function initSlot(
  instance: ComponentInternalInstance,
  children: VNodeComponent['children']
) {
  const { vnode } = instance;

  if (vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
    normalizeObjectSlots(children, instance.slots);
  }
}

function normalizeObjectSlots(
  children: VNodeComponent['children'],
  slots: ComponentSlots
) {
  // 支持具名插槽
  for (const key in children) {
    const slot = children[key];

    // 支持作用域插槽
    const vnode = (props: SlotProps) => normalizeSlotValue(slot(props));

    slots[key] = vnode;
  }
}

function normalizeSlotValue(value: VNode | VNode[]) {
  return Array.isArray(value) ? value : [value];
}
