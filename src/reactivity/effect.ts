import { extend } from '../shared';

let shouldTrack: boolean;
let activeEffect: ReactiveEffect;

class ReactiveEffect {
  private _fn: any;
  /** 避免重复调用 stop 多次触发 cleanupEffect */
  active = true;
  /** 所有包含当前 Effect 实例的集合 */
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

const targetMap = new Map();
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

  // 避免 deps 重复收集
  if (dep.has(activeEffect)) return;

  dep.add(activeEffect);
  activeEffect.deps.push(dep);
}

function isTracking() {
  return shouldTrack && activeEffect !== undefined;
}

/**
 * @method 依赖更新
 */
export function trigger(target, key) {
  const depsMap = targetMap.get(target);
  const dep = depsMap.get(key);

  for (const effect of dep) {
    if (effect.scheduler) {
      effect.scheduler();
    } else {
      effect.run();
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
