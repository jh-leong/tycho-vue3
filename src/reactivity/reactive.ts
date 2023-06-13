import { isObject } from '../shared';
import {
  mutableHandlers,
  readonlyHandlers,
  shallowReadonlyHandlers,
} from './baseHandler';

export const enum ReactiveFlags {
  IS_REACTIVE = '__v_isReactive',
  IS_READONLY = '__v_isReadonly',
}

export function reactive<T extends object>(target: T) {
  // if trying to observe a readonly proxy, return the readonly version.
  if (isReadonly(target)) return target;
  if (isReactive(target)) return target;

  return createActiveObject<T>(target, mutableHandlers);
}

export function readonly<T extends object>(target: T) {
  if (isReadonly(target)) return target;

  return createActiveObject<T>(target, readonlyHandlers);
}

export function shallowReadonly<T extends object>(raw: T) {
  return createActiveObject<T>(raw, shallowReadonlyHandlers);
}

export function isProxy(value: any) {
  return isReactive(value) || isReadonly(value);
}

export function isReactive(value: any) {
  return !!value[ReactiveFlags.IS_REACTIVE];
}

export function isReadonly(value: any) {
  return !!value[ReactiveFlags.IS_READONLY];
}

function createActiveObject<T extends object>(raw: T, baseHandler) {
  if (!isObject(raw)) {
    console.warn(`target ${raw} 必须是一个对象`);
    return raw;
  }

  return new Proxy<T>(raw, baseHandler);
}
