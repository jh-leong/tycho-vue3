import { camelize, toHandlerKey } from '../shared';
import { ComponentInternalInstance } from './component';

export function emit(
  instance: ComponentInternalInstance,
  event: string,
  ...args: any[]
) {
  const { props } = instance;

  const handler = props[toHandlerKey(camelize(event))];
  handler && handler(...args);
}
