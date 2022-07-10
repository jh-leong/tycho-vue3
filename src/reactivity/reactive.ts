import { track, trigger } from './effect';

export function reactive<T extends object>(raw: T): T {
  return new Proxy<T>(raw, {
    get(target, key) {
      const _target = Reflect.get(target, key);

      // 依赖收集
      track(target, key);
      return _target;
    },
    set(target, key, value) {
      const _target = Reflect.set(target, key, value);

      // 依赖更新
      trigger(target, key);
      return _target;
    },
  });
}
