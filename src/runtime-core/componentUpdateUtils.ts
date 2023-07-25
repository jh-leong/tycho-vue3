import { VNodeComponent } from './vnode';

export function shouldUpdateComponent(
  preVnode: VNodeComponent,
  vnode: VNodeComponent
) {
  const { props: preProps = {} } = preVnode;
  const { props = {} } = vnode;

  for (const key in props) {
    if (preProps[key] !== props[key]) {
      return true;
    }
  }

  return false;
}
