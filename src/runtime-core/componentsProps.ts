import { ComponentInternalInstance } from './component';
import { VNodeProps } from './vnode';

export function initProps(
  instance: ComponentInternalInstance,
  rawProps: VNodeProps = {}
) {
  instance.props = rawProps;

  // todo: attrs
}
