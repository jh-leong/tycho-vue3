import { effect } from '../effect';
import { reactive } from '../reactive';
import { isRef, ref, unRef } from '../ref';

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
    const a = ref({
      count: 1,
      foo: 1,
    });
    let dummy;
    effect(() => {
      dummy = a.value.count;
    });
    expect(dummy).toBe(1);
    a.value.count = 2;
    expect(dummy).toBe(2);

    // todo: 没有在 effect 中触发 get 依赖收集的属性, 触发 set 时报错, 如下:
    // a.value.foo++;
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

  it.skip('proxyRefs', () => {
    const user = {
      age: ref(10),
      name: 'xiaohong',
    };

    const proxyUser = proxyRefs(user);
    expect(user.age.value).toBe(10);
    expect(proxyUser.age).toBe(10);
    expect(proxyUser.name).toBe('xiaohong');

    proxyUser.age = 20;

    expect(proxyUser.age).toBe(20);
    expect(user.age.value).toBe(20);

    proxyUser.age = ref(10);
    expect(proxyUser.age).toBe(10);
    expect(user.age.value).toBe(10);
  });
});
