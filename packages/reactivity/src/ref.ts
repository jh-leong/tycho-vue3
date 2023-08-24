import { hasChanged, isObject } from '@tycho-vue/shared';
import {
  ReactiveEffect,
  isTracking,
  trackEffects,
  triggerEffects,
} from './effect';
import { isReactive, reactive } from './reactive';

class RefImpl {
  private _value: any;
  /**
   * 用于 set 时比较有没修改
   *
   * 对象类型的值, 会被 reactive 包装 (变成 proxy 代理)
   */
  private _rawValue: any;
  readonly __v_isRef = true;
  dep = new Set<ReactiveEffect>();

  constructor(value: any) {
    this.update(value);
  }

  get value() {
    trackRefValue(this);
    return this._value;
  }

  set value(newValue: any) {
    if (hasChanged(this._rawValue, newValue)) {
      this.update(newValue);
      triggerEffects(this.dep);
    }
  }

  private update(value) {
    this._rawValue = value;
    this._value = convert(value);
  }
}

/**
 * 嵌套对象代理
 */
function convert(value) {
  return isObject(value) ? reactive(value) : value;
}

function trackRefValue(ref: RefImpl) {
  if (isTracking()) {
    trackEffects(ref.dep);
  }
}

export function isRef(ref) {
  return !!ref?.__v_isRef;
}

/**
 * @method 解包 Refs
 */
export function unRef(ref) {
  return isRef(ref) ? ref.value : ref;
}

export function ref(value: any) {
  return new RefImpl(value);
}

const shallowUnwrapHandlers: ProxyHandler<any> = {
  get: (target, key, receiver) => unRef(Reflect.get(target, key, receiver)),
  set: (target, key, value, receiver) => {
    const oldValue = target[key];
    if (isRef(oldValue) && !isRef(value)) {
      oldValue.value = value;
      return true;
    } else {
      return Reflect.set(target, key, value, receiver);
    }
  },
};

/**
 * @description 代理对象, 使 render 函数中可以直接访问 setup 返回值解包后的结果
 */
export function proxyRefs<T extends object>(objectWithRefs: T) {
  return new Proxy(objectWithRefs, shallowUnwrapHandlers);
}

export function toRefs(target: object) {
  if (!isReactive(target)) {
    console.warn(`toRefs() expects a reactive object`);
    return target;
  }

  const res: any = {};

  for (const key in target) {
    res[key] = propertyToRef(target, key);
  }

  return res;
}

export function toRef(target, key: PropertyKey) {
  return propertyToRef(target, key);
}

function propertyToRef(target, key: PropertyKey) {
  const val = target[key];
  return isRef(val) ? val : new ObjectRefImpl(target, key);
}

class ObjectRefImpl {
  readonly __v_isRef = true;

  constructor(public target: object, public key: PropertyKey) {}

  get value() {
    return this.target[this.key];
  }

  set value(newValue) {
    this.target[this.key] = newValue;
  }
}
