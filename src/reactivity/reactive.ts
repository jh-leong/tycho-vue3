import { isObject } from '../shared';
import {
  mutableHandlers,
  readonlyHandlers,
  shallowReadonlyHandlers,
} from './baseHandler';

export const enum ReactiveFlags {
  SKIP = '__v_skip',
  IS_REACTIVE = '__v_isReactive',
  IS_READONLY = '__v_isReadonly',
  IS_SHALLOW = '__v_isShallow',
  RAW = '__v_raw',
}

export interface Target {
  [ReactiveFlags.SKIP]?: boolean;
  [ReactiveFlags.IS_REACTIVE]?: boolean;
  [ReactiveFlags.IS_READONLY]?: boolean;
  [ReactiveFlags.IS_SHALLOW]?: boolean;
  [ReactiveFlags.RAW]?: any;
}

export const reactiveMap = new WeakMap<Target, any>();
export const shallowReactiveMap = new WeakMap<Target, any>();
export const readonlyMap = new WeakMap<Target, any>();
export const shallowReadonlyMap = new WeakMap<Target, any>();

export function reactive<T extends object>(target: T): T {
  // if trying to observe a readonly proxy, return the readonly version.
  if (isReadonly(target)) return target;
  if (isReactive(target)) return target;

  return createActiveObject<T>(target, mutableHandlers, reactiveMap);
}

export function readonly<T extends object>(target: T) {
  if (isReadonly(target)) return target;

  return createActiveObject<T>(target, readonlyHandlers, readonlyMap);
}

export function shallowReadonly<T extends object>(raw: T) {
  return createActiveObject<T>(
    raw,
    shallowReadonlyHandlers,
    shallowReadonlyMap
  );
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

function createActiveObject<T extends object>(
  raw: T,
  baseHandlers: ProxyHandler<any>,
  proxyMap: WeakMap<Target, any>
) {
  if (!isObject(raw)) {
    console.warn(`target ${raw} should be object or array`);
    return raw;
  }

  if (proxyMap.has(raw)) return proxyMap.get(raw);

  const proxy = new Proxy<T>(raw, baseHandlers);

  proxyMap.set(raw, proxy);

  return proxy;
}

export function toRaw<T>(observed: T): T {
  const raw = observed && (observed as Target)[ReactiveFlags.RAW];
  return raw ? toRaw(raw) : observed;
}
