import { effect } from '../effect';
import { reactive } from '../reactive';
import { isRef, proxyRefs, ref, unRef } from '../ref';

describe('ref', () => {
  it('happy path', () => {
    const a = ref(1);
    expect(a.value).toBe(1);
  });

  it('should be reactive', () => {
    const a = ref(1);
    let dummy;
    let calls = 0;

    effect(() => {
      calls++;
      dummy = a.value;
    });

    expect(calls).toBe(1);
    expect(dummy).toBe(1);

    a.value = 2;
    expect(calls).toBe(2);
    expect(dummy).toBe(2);
  });

  it('same value should not trigger', () => {
    // 常量
    const a = ref(1);
    let dummy;
    let calls = 0;

    effect(() => {
      calls++;
      dummy = a.value;
    });

    // 对象
    a.value = 2;
    expect(calls).toBe(2);
    expect(dummy).toBe(2);

    const foo = { a: 1 };
    const b = ref(foo);
    let calls2 = 0;
    effect(() => {
      calls2++;
      dummy = b.value;
    });
    b.value = foo;
    expect(calls2).toBe(1);
  });

  it('should make nested properties reactive', () => {
    const rowA = {
      count: 1,
      foo: 1,
    };
    const refA = ref(rowA);
    let dummy;
    effect(() => {
      dummy = refA.value.count;
    });
    expect(dummy).toBe(1);
    refA.value.count = 2;
    expect(dummy).toBe(2);

    expect(rowA.count).toBe(2);

    refA.value.foo++;
  });

  it('isRef', () => {
    const a = ref(1);
    const user = reactive({
      age: 1,
    });
    expect(isRef(a)).toBe(true);
    expect(isRef(1)).toBe(false);
    expect(isRef(user)).toBe(false);
  });

  it('unRef', () => {
    const a = ref(1);
    expect(unRef(a)).toBe(1);
    expect(unRef(1)).toBe(1);
  });

  it('proxyRefs', () => {
    const user: any = {
      age: ref(10),
      name: 'tycho',
      a: {
        b: ref(10),
      },
    };

    const proxyUser = proxyRefs(user);
    expect(user.age.value).toBe(10);

    expect(proxyUser.age).toBe(10);
    expect(proxyUser.name).toBe('tycho');

    // 只支持一层的 unref
    expect(proxyUser.a.b.value).toBe(10);

    proxyUser.age = 20;
    expect(proxyUser.age).toBe(20);
    expect(user.age.value).toBe(20);

    proxyUser.age = ref(10);
    expect(proxyUser.age).toBe(10);
    expect(user.age.value).toBe(10);
  });
});
