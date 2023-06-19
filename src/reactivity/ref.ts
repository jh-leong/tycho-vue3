import { hasChanged, isObject } from '../shared';
import {
  ReactiveEffect,
  isTracking,
  trackEffects,
  triggerEffects,
} from './effect';
import { reactive } from './reactive';

class RefImpl {
  private _value: any;
  /**
   * 用于 set 时比较有没修改
   *
   * 对象类型的值, 会被 reactive 包装 (变成 proxy 代理)
   */
  private _rawValue: any;
  dep = new Set<ReactiveEffect>();
  __v_isRef = true;

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
  return !!ref.__v_isRef;
}

/**
 * @method 解包 Refs
 *
 */
export function unRef(ref) {
  return isRef(ref) ? ref.value : ref;
}

export function ref(value: any) {
  return new RefImpl(value);
}

export function proxyRefs<T extends object>(objectWithRef: T) {
  return new Proxy(objectWithRef, {
    get(target, key) {
      return unRef(Reflect.get(target, key));
    },
    set(target, key, value) {
      if (!isRef(value) && isRef(target[key])) {
        return (target[key].value = value);
      } else {
        return Reflect.set(target, key, value);
      }
    },
  });
}
