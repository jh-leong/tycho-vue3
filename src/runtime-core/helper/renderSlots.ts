import { ComponentSlots } from '../component';
import { VNode, createVNode } from '../vnode';

export type SlotProps = Record<string, any>;

export function renderSlots(
  slots: ComponentSlots,
  name: string,
  props: SlotProps
): VNode | void {
  const slot = slots[name];

  if (slot) {
    if (typeof slot === 'function') {
      return createVNode('div', {}, slot(props));
    }
  }
}
