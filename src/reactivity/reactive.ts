import { mutableHandlers, readonlyHandlers } from './baseHandler';

export const enum ReactiveFlags {
  IS_REACTIVE = '__v_isReactive',
  IS_READONLY = '__v_isReadonly',
}

export function reactive<T extends object>(raw: T) {
  return createActiveObject<T>(raw, mutableHandlers);
}

export function readonly<T extends object>(raw: T) {
  return createActiveObject<T>(raw, readonlyHandlers);
}

export function isReactive(value: any) {
  return !!value[ReactiveFlags.IS_REACTIVE];
}

export function isReadonly(value: any) {
  return !!value[ReactiveFlags.IS_READONLY];
}

function createActiveObject<T extends object>(raw: T, baseHandler) {
  return new Proxy<T>(raw, baseHandler);
}
