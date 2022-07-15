export const extend = Object.assign;

export function isObject(value: any) {
  return value != null && typeof value === 'object';
}

export function hasChanged(val, newVal) {
  return !Object.is(val, newVal);
}
