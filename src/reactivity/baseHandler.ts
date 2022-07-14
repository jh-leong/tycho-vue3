import { isObject } from '../shared';
import { track, trigger } from './effect';
import { reactive, ReactiveFlags, readonly } from './reactive';

function createGetter(isReadonly = false) {
  return function get(target, key) {
    const _target = Reflect.get(target, key);

    // 用于内部判断对象是否被代理
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly;
    }
    if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly;
    }

    // 嵌套对象 proxy 代理
    if (isObject(target[key])) {
      if (isReadonly) {
        return readonly(target[key]);
      } else {
        return reactive(target[key]);
      }
    }

    // 依赖收集
    if (!isReadonly) {
      track(target, key);
    }
    return _target;
  };
}

function createSetter() {
  return function (target, key, value) {
    const _target = Reflect.set(target, key, value);

    // 依赖更新
    trigger(target, key);
    return _target;
  };
}

// 抽离, 仅在初始化时调用一次
const get = createGetter();
const set = createSetter();
export const mutableHandlers = { get, set };

const readonlyGet = createGetter(true);
export const readonlyHandlers = {
  get: readonlyGet,
  set(target, key) {
    console.warn(`key: ${key} set 失败, target 为 readonly: `, target);
    return true;
  },
};
