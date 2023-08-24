import { isProxy, isReadonly, readonly } from '../src/reactive';

describe('readonly', () => {
  it('should make nested value readonly', () => {
    const original = { foo: 1, bar: { baz: 2 } };
    const wrapped = readonly(original);

    // not set
    expect(wrapped).not.toBe(original);
    expect(wrapped.foo).toBe(1);

    // isReadonly
    expect(isReadonly(wrapped)).toBe(true);
    expect(isReadonly(wrapped.bar)).toBe(true);
    expect(isReadonly(original)).toBe(false);
    expect(isReadonly(original.bar)).toBe(false);
    // isProxy
    expect(isProxy(wrapped)).toBe(true);
    expect(isProxy(wrapped.bar)).toBe(true);
    expect(isProxy(original)).toBe(false);
    expect(isProxy(original.bar)).toBe(false);
  });
  it('should call console.warn when set', () => {
    // mock
    console.warn = vi.fn();

    const user = readonly({
      age: 1,
    });

    user.age = 2;

    expect(console.warn).toBeCalled();
  });
});
