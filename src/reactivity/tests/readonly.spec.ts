import { isReadonly, readonly } from '../reactive';

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
  });
  it('should call console.warn when set', () => {
    // mock
    console.warn = jest.fn();

    const user = readonly({
      age: 1,
    });

    user.age = 2;

    expect(console.warn).toBeCalled();
  });
});
