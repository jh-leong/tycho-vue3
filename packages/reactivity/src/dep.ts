import { ReactiveEffect } from './effect';

export type Dep = Set<ReactiveEffect>;

export function createDep(dep?: Dep): Dep {
  return new Set(dep);
}
