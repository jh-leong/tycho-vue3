import { extend, isObject } from '../shared';
import { track, trigger } from './effect';
import { reactive, ReactiveFlags, readonly } from './reactive';

// 抽离, 仅在初始化时调用一次
const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);

function createGetter(isReadonly = false, shallow = false) {
  return function get(target, key) {
    // 用于内部判断对象是否被代理
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly;
    }
    if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly;
    }

    const _target = Reflect.get(target, key);

    if (shallow) {
      return _target;
    }

    // 嵌套对象 proxy 代理
    if (isObject(target[key])) {
      return isReadonly ? readonly(target[key]) : reactive(target[key]);
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

export const mutableHandlers = { get, set };

export const readonlyHandlers = {
  get: readonlyGet,
  set(target, key) {
    console.warn(`key: ${key} set 失败, target 为 readonly: `, target);
    return true;
  },
};

export const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
  get: shallowReadonlyGet,
});
