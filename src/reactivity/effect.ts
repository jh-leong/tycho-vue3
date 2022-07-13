import { extend } from '../shared';

class ReactiveEffect {
  private _fn: any;
  // 避免重复调用 stop 多次触发 cleanupEffect
  active = true;
  // 所有包含当前 Effect 实例的集合
  deps: any[] = [];
  scheduler: any;
  onStop?: () => void;

  constructor(fn, scheduler?) {
    this._fn = fn;
    this.scheduler = scheduler;
  }
  run() {
    activeEffect = this;
    return this._fn();
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
}

const targetMap = new Map();
/**
 * @method 依赖收集
 */
export function track(target, key) {
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

  if (!activeEffect) return;

  dep.add(activeEffect);
  activeEffect.deps.push(dep);
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

let activeEffect: ReactiveEffect;
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
