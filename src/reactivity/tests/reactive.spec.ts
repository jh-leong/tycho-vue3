import { isReactive, reactive } from '../reactive';

describe('reactive', () => {
  it('happy path', () => {
    const original = { foo: 1 };
    const observed = reactive(original);

    expect(observed).not.toBe(original);
    expect(observed.foo).toBe(1);

    // proxy 判断
    expect(isReactive(observed)).toBe(true);
    expect(isReactive({})).toBe(false);
  });
});
