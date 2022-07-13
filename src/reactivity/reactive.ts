import { mutableHandlers, readonlyHandlers } from './baseHandler';

export function reactive<T extends object>(raw: T) {
  return createActiveObject<T>(raw, mutableHandlers);
}

export function readonly<T extends object>(raw: T) {
  return createActiveObject<T>(raw, readonlyHandlers);
}

function createActiveObject<T extends object>(raw: T, baseHandler) {
  return new Proxy<T>(raw, baseHandler);
}
