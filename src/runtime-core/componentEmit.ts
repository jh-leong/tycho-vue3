import { camelize, toHandlerKey } from '../shared';

export function emit(instance, event: string, ...args) {
  const { props } = instance;

  const handler = props[toHandlerKey(camelize(event))];
  handler && handler(...args);
}
