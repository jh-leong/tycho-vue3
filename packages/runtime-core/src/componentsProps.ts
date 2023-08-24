import { ComponentInternalInstance } from './component';
import { VNodeProps } from './vnode';

/**
 * @description initProps 的作用是初始化组件的 props
 */
export function initProps(
  instance: ComponentInternalInstance,
  rawProps: VNodeProps = {}
) {
  instance.props = rawProps;

  // todo: attrs
}
