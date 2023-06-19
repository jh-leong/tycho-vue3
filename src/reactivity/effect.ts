import { extend } from '../shared';

let shouldTrack: boolean;
let activeEffect: ReactiveEffect;

export class ReactiveEffect {
  private _fn: any;
  /** 避免重复调用 stop 多次触发 cleanupEffect */
  active = true;
  /**
   * 所有包含当前 Effect 实例的集合
   * 用于调用 stop 时, 追踪收集的依赖, 执行清空依赖逻辑
   */
  deps: any[] = [];
  scheduler: any;
  onStop?: () => void;

  constructor(fn, scheduler?) {
    this._fn = fn;
    this.scheduler = scheduler;
  }
  run() {
    if (!this.active) {
      return this._fn();
    }

    shouldTrack = true;

    activeEffect = this;
    const result = this._fn();

    shouldTrack = false;

    return result;
  }
  stop() {
    if (this.active) {
      cleanupEffect(this);

      if (this.onStop) {
        this.onStop();
      }

      this.active = false;
    }
  }
}

function cleanupEffect(effect: ReactiveEffect) {
  effect.deps.forEach((dep: any) => dep.delete(effect));
  // 清空集合, 优化内存
  effect.deps.length = 0;
}

/**
 * 使用 WeakMap 代替 map
 * WeakMap 只能使用 object 作为 key 值
 * 并且 object 没有引用时可以被垃圾回收
 * WeakMap 不能被迭代
 */
const targetMap = new WeakMap();

/**
 * @method 依赖收集
 */
export function track(target, key) {
  if (!isTracking()) return;

  let depsMap = targetMap.get(target);
  if (!depsMap) {
    depsMap = new Map();
    targetMap.set(target, depsMap);
  }

  let dep = depsMap.get(key);
  if (!dep) {
    dep = new Set();
    depsMap.set(key, dep);
  }

  trackEffects(dep);
}

export function trackEffects(dep: Set<ReactiveEffect>) {
  // 避免 deps 重复收集
  if (dep.has(activeEffect)) return;

  dep.add(activeEffect);
  activeEffect.deps.push(dep);
}

export function isTracking() {
  return shouldTrack && activeEffect !== undefined;
}

/**
 * @method 依赖更新
 */
export function trigger(target, key) {
  const depsMap = targetMap.get(target);
  const dep = depsMap.get(key);

  triggerEffects(dep);
}

export function triggerEffects(dep: any) {
  // todo: 当没依赖收集时 dep 有可能不存在
  if (dep) {
    for (const effect of dep) {
      if (effect.scheduler) {
        effect.scheduler();
      } else {
        effect.run();
      }
    }
  }
}

export function effect(fn, option: { scheduler?; onStop? } = {}) {
  const _effect = new ReactiveEffect(fn, option.scheduler);

  extend(_effect, option);
  _effect.run();

  const runner = _effect.run.bind(_effect) as ReactiveEffectRunner;
  runner.effect = _effect;

  return runner;
}

export interface ReactiveEffectRunner<T = any> {
  (): T;
  effect: ReactiveEffect;
}

export function stop(runner: ReactiveEffectRunner) {
  runner.effect.stop();
}
