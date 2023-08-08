import { extend, hasOwn, isArray, isObject } from '../shared';
import { track, trigger } from './effect';
import { reactive, ReactiveFlags, readonly, toRaw } from './reactive';

// 抽离, 仅在初始化时调用一次
const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);

const arrayInstrumentations = /*#__PURE__*/ createArrayInstrumentations();

function createArrayInstrumentations() {
  const instrumentations: Record<string, Function> = {};
  // instrument identity-sensitive Array methods to account for possible reactive
  // values
  (['includes', 'indexOf', 'lastIndexOf'] as const).forEach((key) => {
    instrumentations[key] = function (this: unknown[], ...args: unknown[]) {
      const arr = toRaw(this) as any;

      // we run the method using the original args first (which may be reactive)
      const res = arr[key](...args);
      if (res === -1 || res === false) {
        // if that didn't work, run it again using raw values.
        return arr[key](...args.map(toRaw));
      } else {
        return res;
      }
    };
  });

  return instrumentations;
}

function createGetter(isReadonly = false, shallow = false) {
  return function get(target, key, receiver) {
    if (key === ReactiveFlags.RAW) {
      return target;
    } else if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly;
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly;
    }

    const targetIsArray = isArray(target);

    if (!isReadonly) {
      if (targetIsArray && hasOwn(arrayInstrumentations, key)) {
        return Reflect.get(arrayInstrumentations, key, receiver);
      }
    }

    const _target = Reflect.get(target, key);

    if (shallow) {
      return _target;
    }

    // 嵌套对象 proxy 代理
    if (isObject(_target)) {
      return isReadonly ? readonly(_target) : reactive(_target);
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
