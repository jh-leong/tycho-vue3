import { getCurrentInstance } from './component';

export function provide(key: string, value: unknown) {
  const instance = getCurrentInstance();

  if (instance) {
    const { parent } = instance;

    // 当前组件首次调用 provide 时 (instance.provides === parent?.provides)，
    // 初始化 provides
    if (instance.provides === parent?.provides) {
      instance.provides = Object.create(parent.provides);
    }

    instance.provides[key] = value;
  }
}

/**
 * @description inject 的作用是获取父组件提供的数据
 */
export function inject(key: string, defaultValue?: unknown) {
  const instance = getCurrentInstance();

  if (instance?.parent) {
    const value = instance.parent.provides[key];

    if (!value) {
      if (typeof defaultValue === 'function') {
        return defaultValue();
      }

      return defaultValue;
    }
  }
}
