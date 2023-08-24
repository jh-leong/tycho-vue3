import { isProxy, isReactive, reactive } from '../src/reactive';

describe('reactive', () => {
  it('happy path', () => {
    const original = { foo: 1 };
    const observed = reactive(original);

    expect(observed).not.toBe(original);
    expect(observed.foo).toBe(1);

    // proxy 判断
    expect(isReactive(observed)).toBe(true);
    expect(isReactive({})).toBe(false);
    expect(isProxy(observed)).toBe(true);
    expect(isProxy({})).toBe(false);
  });

  it('nested reactive', () => {
    const original = {
      nested: {
        foo: 1,
      },
      array: [{ bar: 2 }],
    };
    const observed = reactive(original);
    expect(isReactive(observed.nested)).toBe(true);
    expect(isReactive(observed.array)).toBe(true);
    expect(isReactive(observed.array[0])).toBe(true);
    expect(isProxy(observed.nested)).toBe(true);
    expect(isProxy(observed.array)).toBe(true);
    expect(isProxy(observed.array[0])).toBe(true);
  });

  describe('Proxy Array', () => {
    it('includes a raw element should be true', () => {
      const foo = {};
      const arr = reactive([foo]);

      expect(arr.includes(foo)).toBe(true);
    });

    it('includes a proxy element should be true', () => {
      const foo = {};
      const arr = reactive([foo]);

      expect(arr.includes(arr[0])).toBe(true);
    });
  });
});
