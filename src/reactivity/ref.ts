import { hasChanged, isObject } from '../shared';
import { isTracking, trackEffects, triggerEffects } from './effect';
import { reactive } from './reactive';

class RefImpl {
  private _value: any;
  private _rawValue: any;
  dep: any;

  constructor(value: any) {
    this.update(value);
    this.dep = new Set();
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

function convert(value) {
  return isObject(value) ? reactive(value) : value;
}

function trackRefValue(ref) {
  if (isTracking()) {
    trackEffects(ref.dep);
  }
}

export function ref(value: any) {
  return new RefImpl(value);
}
