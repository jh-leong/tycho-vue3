export * from './toDisplayString';
export * from './shapeFlags';

export const extend = Object.assign;

export const EMPTY_OBJ = {};

export function isObject(value: any) {
  return value != null && typeof value === 'object';
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function hasChanged(val, newVal) {
  return !Object.is(val, newVal);
}

export const hasOwn = (val, key) =>
  Object.prototype.hasOwnProperty.call(val, key);

export const capitalize = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const camelize = (str: string) => {
  return str.replace(/-(\w)/g, (_, l) => (l ? l.toUpperCase() : ''));
};

export const toHandlerKey = (str: string) => {
  return str ? 'on' + capitalize(str) : '';
};

export const isArray = Array.isArray;
